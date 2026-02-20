import { PaymentMethod, Role } from "@prisma/client";
import { z } from "zod";

import { forbiddenResponse, getApiSession, isAllowed, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const updateOrderPaymentSchema = z.object({
  method: z.nativeEnum(PaymentMethod),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session?.user) return unauthorizedResponse();
  if (!isAllowed(session.user.role, [Role.ADMIN, Role.MANAGER])) {
    return forbiddenResponse("Only MANAGER/ADMIN can edit transaction payment method.");
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateOrderPaymentSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.order.findUnique({
    where: { id },
    include: { payments: true },
  });

  if (!existing) return Response.json({ error: "Order not found" }, { status: 404 });
  if (["VOIDED", "REFUNDED"].includes(existing.status)) {
    return Response.json({ error: "Order cannot be edited in current status." }, { status: 409 });
  }
  if (!existing.payments.length) {
    return Response.json({ error: "Order has no payments to update." }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.updateMany({
      where: { orderId: id },
      data: { method: parsed.data.method },
    });

    await tx.auditLog.create({
      data: {
        storeId: existing.storeId,
        userId: session.user.id,
        orderId: existing.id,
        action: "ORDER_PAYMENT_UPDATED",
        entity: "Order",
        entityId: existing.id,
        message: `Payment method updated to ${parsed.data.method}`,
      },
    });
  });

  return Response.json({ ok: true });
}
