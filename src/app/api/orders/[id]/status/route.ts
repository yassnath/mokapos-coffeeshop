import { Role } from "@prisma/client";

import {
  forbiddenResponse,
  getApiSession,
  hasStoreAccess,
  isAllowed,
  unauthorizedResponse,
} from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { realtimeBus } from "@/lib/realtime";
import { orderStatusUpdateSchema } from "@/lib/validations";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session?.user) return unauthorizedResponse();

  const { id } = await context.params;
  const body = await request.json();
  const parsed = orderStatusUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;

  if (
    ["VOIDED", "REFUNDED"].includes(payload.status) &&
    !isAllowed(session.user.role, [Role.ADMIN, Role.MANAGER])
  ) {
    return forbiddenResponse("Only MANAGER/ADMIN can void or refund orders.");
  }

  if (
    ["NEW", "IN_PROGRESS", "READY", "COMPLETED"].includes(payload.status) &&
    !isAllowed(session.user.role, [Role.ADMIN, Role.MANAGER, Role.BARISTA, Role.CASHIER])
  ) {
    return forbiddenResponse();
  }

  const currentOrder = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
    },
  });

  if (!currentOrder) return Response.json({ error: "Order not found" }, { status: 404 });
  if (!hasStoreAccess(session.user, currentOrder.storeId)) {
    return forbiddenResponse("Store access denied.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.order.update({
      where: { id },
      data: {
        status: payload.status,
        readyAt: payload.status === "READY" ? new Date() : undefined,
        completedAt: payload.status === "COMPLETED" ? new Date() : undefined,
        items: payload.itemStatus
          ? {
              updateMany: {
                where: { orderId: id },
                data: {
                  itemStatus: payload.itemStatus,
                },
              },
            }
          : undefined,
      },
    });

    await tx.auditLog.create({
      data: {
        storeId: currentOrder.storeId,
        userId: session.user.id,
        orderId: id,
        action:
          payload.status === "VOIDED"
            ? "ORDER_VOIDED"
            : payload.status === "REFUNDED"
              ? "ORDER_REFUNDED"
              : "ORDER_STATUS_UPDATED",
        entity: "Order",
        entityId: id,
        message: payload.reason ?? `Order status updated to ${payload.status}`,
      },
    });

    if (["VOIDED", "REFUNDED"].includes(payload.status)) {
      await tx.refundVoid.create({
        data: {
          orderId: id,
          type: payload.status === "VOIDED" ? "VOID" : "REFUND",
          amount: payload.amount ?? Number(currentOrder.totalAmount),
          reason: payload.reason ?? `${payload.status} by ${session.user.role}`,
          createdById: session.user.id,
        },
      });
    }

    return order;
  });

  realtimeBus.publish({
    type: "order.updated",
    orderId: updated.id,
    data: {
      status: updated.status,
      readyAt: updated.readyAt,
      completedAt: updated.completedAt,
    },
  });

  return Response.json({ order: updated });
}
