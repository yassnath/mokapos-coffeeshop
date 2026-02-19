import { Role } from "@prisma/client";

import { forbiddenResponse, getApiSession, isAllowed, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/serializers";

export async function GET(request: Request) {
  const session = await getApiSession();
  if (!session?.user) return unauthorizedResponse();
  if (!isAllowed(session.user.role, [Role.ADMIN, Role.MANAGER])) return forbiddenResponse();

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") ?? session.user.defaultStoreId;
  if (!storeId) return Response.json({ shifts: [] });

  const shifts = await prisma.shift.findMany({
    where: { storeId },
    include: {
      user: { select: { name: true, role: true } },
      register: { select: { name: true } },
    },
    orderBy: { openedAt: "desc" },
    take: 30,
  });

  return Response.json({
    shifts: shifts.map((shift) => ({
      id: shift.id,
      status: shift.status,
      openedAt: shift.openedAt,
      closedAt: shift.closedAt,
      openingCash: decimalToNumber(shift.openingCash),
      expectedCash: decimalToNumber(shift.expectedCash),
      actualCash: decimalToNumber(shift.actualCash),
      user: shift.user,
      register: shift.register,
    })),
  });
}
