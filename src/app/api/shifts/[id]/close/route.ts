import { Role } from "@prisma/client";

import { forbiddenResponse, getApiSession, isAllowed, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/serializers";
import { closeShiftSchema } from "@/lib/validations";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session?.user) return unauthorizedResponse();
  if (!isAllowed(session.user.role, [Role.ADMIN, Role.MANAGER, Role.CASHIER]))
    return forbiddenResponse();

  const { id } = await context.params;
  const body = await request.json();
  const parsed = closeShiftSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const shift = await prisma.shift.findUnique({
    where: { id },
    include: {
      payments: true,
    },
  });

  if (!shift || shift.status === "CLOSED") {
    return Response.json({ error: "Shift not found or already closed" }, { status: 404 });
  }

  const cashPayments = shift.payments
    .filter((payment) => payment.method === "CASH")
    .reduce((sum, payment) => sum + decimalToNumber(payment.amount), 0);

  const expectedCash =
    Number(shift.openingCash) + cashPayments + Number(shift.cashIn) - Number(shift.cashOut);

  const closed = await prisma.shift.update({
    where: { id },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      expectedCash,
      actualCash: parsed.data.actualCash,
      notes: parsed.data.notes,
    },
  });

  return Response.json({ shift: closed, expectedCash });
}
