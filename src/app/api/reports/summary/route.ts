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

function getRange(period: string, startDate?: string | null, endDate?: string | null) {
  const parsedStart = parseDay(startDate);
  const parsedEnd = parseDay(endDate);

  if (parsedStart || parsedEnd) {
    const start = startOfDay(parsedStart ?? parsedEnd ?? new Date());
    const end = endOfDay(parsedEnd ?? parsedStart ?? new Date());

    if (start.getTime() <= end.getTime()) return { start, end };
    return { start: startOfDay(end), end: endOfDay(start) };
  }

  const now = new Date();
  const start = startOfDay(now);

  if (period === "weekly") {
    start.setDate(start.getDate() - 6);
  } else if (period === "monthly") {
    start.setDate(start.getDate() - 29);
  } else {
    start.setHours(0, 0, 0, 0);
  }

  return { start, end: endOfDay(now) };
}

export async function GET(request: Request) {
  const session = await getApiSession();
  if (!session?.user) return unauthorizedResponse();
  if (!isAllowed(session.user.role, [Role.ADMIN, Role.MANAGER])) return forbiddenResponse();

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") ?? session.user.defaultStoreId;
  const period = searchParams.get("period") ?? "daily";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!storeId) return Response.json({ error: "storeId is required" }, { status: 400 });

  const { start, end } = getRange(period, startDate, endDate);

  const orders = await prisma.order.findMany({
    where: {
      storeId,
      placedAt: { gte: start, lte: end },
      status: { notIn: ["VOIDED"] },
    },
    include: {
      payments: true,
      items: {
        include: {
          product: {
            select: {
              costPrice: true,
            },
          },
        },
      },
      cashier: {
        select: {
          name: true,
        },
      },
      auditLogs: true,
    },
  });

  const totalSales = orders.reduce((sum, order) => sum + decimalToNumber(order.totalAmount), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  const paymentBreakdown = orders
    .flatMap((order) => order.payments)
    .reduce<Record<string, number>>((acc, payment) => {
      const method = payment.method;
      acc[method] = (acc[method] ?? 0) + decimalToNumber(payment.amount);
      return acc;
    }, {});

  const bestSellerMap = new Map<string, number>();
  const peakHourMap = new Map<number, number>();

  for (const order of orders) {
    for (const item of order.items) {
      bestSellerMap.set(
        item.productName,
        (bestSellerMap.get(item.productName) ?? 0) + item.quantity,
      );
    }
    const hour = new Date(order.placedAt).getHours();
    peakHourMap.set(hour, (peakHourMap.get(hour) ?? 0) + 1);
  }

  const bestSellers = Array.from(bestSellerMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, qty]) => ({ name, qty }));

  const peakHours = Array.from(peakHourMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([hour, count]) => ({ hour, count }));

  const discountAndVoidAudits = orders
    .flatMap((order) => order.auditLogs)
    .filter((audit) =>
      ["DISCOUNT_APPLIED", "ORDER_VOIDED", "ORDER_REFUNDED"].includes(audit.action),
    )
    .slice(0, 25)
    .map((audit) => ({
      id: audit.id,
      action: audit.action,
      message: audit.message,
      createdAt: audit.createdAt,
      metadata: audit.metadata,
    }));

  const orderedItems = orders
    .flatMap((order) =>
      order.items.map((item) => {
        const unitCost = item.product
          ? decimalToNumber(item.product.costPrice)
          : Math.max(0, decimalToNumber(item.unitPrice) - 5000);
        const costAmount = unitCost * item.quantity;
        const salesAmount = decimalToNumber(item.lineTotal);

        return {
          id: item.id,
          orderNumber: order.orderNumber,
          placedAt: order.placedAt,
          productName: item.productName,
          quantity: item.quantity,
          cashierName: order.cashier?.name ?? "-",
          waiterName: "-",
          costAmount,
          salesAmount,
          profitAmount: salesAmount - costAmount,
        };
      }),
    )
    .sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime());

  return Response.json({
    range: {
      start,
      end,
    },
    metrics: {
      totalSales,
      totalOrders,
      avgOrderValue,
    },
    paymentBreakdown,
    bestSellers,
    peakHours,
    discountAndVoidAudits,
    orderedItems,
  });
}
