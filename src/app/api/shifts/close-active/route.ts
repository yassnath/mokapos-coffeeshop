import { Role } from "@prisma/client";

import { forbiddenResponse, getApiSession, isAllowed, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/serializers";

export async function POST(request: Request) {
  const session = await getApiSession();
  if (!session?.user) return unauthorizedResponse();
  if (!isAllowed(session.user.role, [Role.ADMIN, Role.MANAGER, Role.CASHIER])) {
    return forbiddenResponse();
  }

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") ?? session.user.defaultStoreId;

  const openShifts = await prisma.shift.findMany({
    where: {
      userId: session.user.id,
      status: "OPEN",
      ...(storeId ? { storeId } : {}),
    },
    include: {
      payments: {
        select: {
          method: true,
          amount: true,
        },
      },
    },
  });

  if (!openShifts.length) return Response.json({ closedCount: 0 });

  const closedCount = await prisma.$transaction(async (tx) => {
    let count = 0;
    for (const shift of openShifts) {
      const cashPayments = shift.payments
        .filter((payment) => payment.method === "CASH")
        .reduce((sum, payment) => sum + decimalToNumber(payment.amount), 0);

      const expectedCash =
        Number(shift.openingCash) + cashPayments + Number(shift.cashIn) - Number(shift.cashOut);

      await tx.shift.update({
        where: { id: shift.id },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          expectedCash,
          actualCash: expectedCash,
        },
      });
      count += 1;
    }
    return count;
  });

  return Response.json({ closedCount });
}
