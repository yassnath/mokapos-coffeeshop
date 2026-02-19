import { Role } from "@prisma/client";

import { forbiddenResponse, getApiSession, isAllowed, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/serializers";

function resolveDateRange(value?: string | null) {
  const base = value ? new Date(`${value}T00:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return { start: today, end };
  }

  base.setHours(0, 0, 0, 0);
  const end = new Date(base);
  end.setHours(23, 59, 59, 999);

  return { start: base, end };
}

export async function GET(request: Request) {
  const session = await getApiSession();
  if (!session?.user) return unauthorizedResponse();
  if (!isAllowed(session.user.role, [Role.ADMIN, Role.MANAGER, Role.CASHIER])) {
    return forbiddenResponse();
  }

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") ?? session.user.defaultStoreId;
  const selectedDate = searchParams.get("date");
  const shiftId = searchParams.get("shiftId");

  if (!storeId) return Response.json({ error: "storeId is required" }, { status: 400 });

  const { start, end } = resolveDateRange(selectedDate);
  const cashierId = session.user.role === Role.CASHIER ? session.user.id : undefined;

  const orders = await prisma.order.findMany({
    where: {
      storeId,
      cashierId,
      placedAt: {
        gte: start,
        lte: end,
      },
      status: {
        notIn: ["VOIDED", "REFUNDED"],
      },
      ...(shiftId ? { shiftId } : {}),
    },
    include: {
      items: true,
      payments: true,
      shift: {
        select: {
          id: true,
          openedAt: true,
          closedAt: true,
          register: { select: { name: true } },
        },
      },
    },
    orderBy: {
      placedAt: "desc",
    },
  });

  const itemMap = new Map<string, { productName: string; qty: number; grossSales: number }>();

  for (const order of orders) {
    for (const item of order.items) {
      const key = item.productName.toLowerCase();
      const prev = itemMap.get(key);
      if (!prev) {
        itemMap.set(key, {
          productName: item.productName,
          qty: item.quantity,
          grossSales: decimalToNumber(item.lineTotal),
        });
        continue;
      }
      prev.qty += item.quantity;
      prev.grossSales += decimalToNumber(item.lineTotal);
    }
  }

  const shifts = await prisma.shift.findMany({
    where: {
      storeId,
      ...(cashierId ? { userId: cashierId } : {}),
      openedAt: {
        gte: start,
        lte: end,
      },
    },
    include: {
      register: {
        select: { name: true },
      },
    },
    orderBy: {
      openedAt: "desc",
    },
  });

  return Response.json({
    selectedDate: start.toISOString().slice(0, 10),
    shifts: shifts.map((shift) => ({
      id: shift.id,
      openedAt: shift.openedAt,
      closedAt: shift.closedAt,
      status: shift.status,
      registerName: shift.register.name,
    })),
    summary: {
      totalOrders: orders.length,
      totalSales: orders.reduce((sum, order) => sum + decimalToNumber(order.totalAmount), 0),
    },
    items: Array.from(itemMap.values()).sort((a, b) => b.qty - a.qty),
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      placedAt: order.placedAt,
      shiftId: order.shiftId,
      totalAmount: decimalToNumber(order.totalAmount),
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        lineTotal: decimalToNumber(item.lineTotal),
      })),
      payments: order.payments.map((payment) => ({
        id: payment.id,
        method: payment.method,
        amount: decimalToNumber(payment.amount),
      })),
    })),
  });
}
