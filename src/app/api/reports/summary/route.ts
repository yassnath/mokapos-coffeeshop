import { Role } from "@prisma/client";

import { forbiddenResponse, getApiSession, isAllowed, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/serializers";

function getRange(period: string) {
  const now = new Date();
  const start = new Date(now);

  if (period === "weekly") {
    start.setDate(now.getDate() - 7);
  } else if (period === "monthly") {
    start.setMonth(now.getMonth() - 1);
  } else {
    start.setHours(0, 0, 0, 0);
  }

  return { start, end: now };
}

export async function GET(request: Request) {
  const session = await getApiSession();
  if (!session?.user) return unauthorizedResponse();
  if (!isAllowed(session.user.role, [Role.ADMIN, Role.MANAGER])) return forbiddenResponse();

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") ?? session.user.defaultStoreId;
  const period = searchParams.get("period") ?? "daily";

  if (!storeId) return Response.json({ error: "storeId is required" }, { status: 400 });

  const { start, end } = getRange(period);

  const orders = await prisma.order.findMany({
    where: {
      storeId,
      placedAt: { gte: start, lte: end },
      status: { notIn: ["VOIDED"] },
    },
    include: {
      payments: true,
      items: true,
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

  return Response.json({
    metrics: {
      totalSales,
      totalOrders,
      avgOrderValue,
    },
    paymentBreakdown,
    bestSellers,
    peakHours,
    discountAndVoidAudits,
  });
}
