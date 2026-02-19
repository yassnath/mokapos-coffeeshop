import { Role } from "@prisma/client";

import { forbiddenResponse, getApiSession, isAllowed, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/serializers";

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
}

function parseDay(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolveRange(startDate?: string | null, endDate?: string | null) {
  const parsedStart = parseDay(startDate);
  const parsedEnd = parseDay(endDate);

  if (!parsedStart && !parsedEnd) return null;

  const start = startOfDay(parsedStart ?? parsedEnd ?? new Date());
  const end = endOfDay(parsedEnd ?? parsedStart ?? new Date());

  if (start.getTime() <= end.getTime()) return { start, end };
  return { start: startOfDay(end), end: endOfDay(start) };
}

export async function GET(request: Request) {
  const session = await getApiSession();
  if (!session?.user) return unauthorizedResponse();
  if (!isAllowed(session.user.role, [Role.ADMIN, Role.MANAGER])) return forbiddenResponse();

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") ?? session.user.defaultStoreId;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  if (!storeId) return Response.json({ shifts: [] });
  const range = resolveRange(startDate, endDate);

  const shifts = await prisma.shift.findMany({
    where: {
      storeId,
      ...(range ? { openedAt: { gte: range.start, lte: range.end } } : {}),
    },
    include: {
      user: { select: { name: true, role: true } },
      register: { select: { name: true } },
      orders: {
        where: { status: { notIn: ["VOIDED", "REFUNDED"] } },
        select: {
          totalAmount: true,
          items: {
            select: {
              quantity: true,
              unitPrice: true,
              product: {
                select: {
                  costPrice: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { openedAt: "desc" },
    take: 100,
  });

  return Response.json({
    shifts: shifts.map((shift) => {
      const totalSales = shift.orders.reduce((sum, order) => sum + decimalToNumber(order.totalAmount), 0);
      const totalCost = shift.orders.reduce(
        (sum, order) =>
          sum +
          order.items.reduce((itemSum, item) => {
            const unitCost = item.product
              ? decimalToNumber(item.product.costPrice)
              : Math.max(0, decimalToNumber(item.unitPrice) - 5000);
            return itemSum + unitCost * item.quantity;
          }, 0),
        0,
      );

      return {
        id: shift.id,
        status: shift.status,
        openedAt: shift.openedAt,
        closedAt: shift.closedAt,
        openingCash: decimalToNumber(shift.openingCash),
        expectedCash: decimalToNumber(shift.expectedCash),
        actualCash: decimalToNumber(shift.actualCash),
        totalSales,
        totalCost,
        totalProfit: totalSales - totalCost,
        user: shift.user,
        register: shift.register,
      };
    }),
  });
}
