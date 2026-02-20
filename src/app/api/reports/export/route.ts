import { Role } from "@prisma/client";
import { stringify } from "csv-stringify/sync";

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

export async function GET(request: Request) {
  const session = await getApiSession();
  if (!session?.user) return unauthorizedResponse();
  if (!isAllowed(session.user.role, [Role.ADMIN, Role.MANAGER])) return forbiddenResponse();

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") ?? session.user.defaultStoreId;
  const startDate = parseDay(searchParams.get("startDate"));
  const endDate = parseDay(searchParams.get("endDate"));
  const hasDateRange = Boolean(startDate || endDate);
  const rawStart = startOfDay(startDate ?? endDate ?? new Date());
  const rawEnd = endOfDay(endDate ?? startDate ?? new Date());
  const dateRange = hasDateRange
    ? rawStart.getTime() <= rawEnd.getTime()
      ? { gte: rawStart, lte: rawEnd }
      : { gte: startOfDay(rawEnd), lte: endOfDay(rawStart) }
    : undefined;

  if (!storeId) {
    return Response.json({ error: "storeId is required" }, { status: 400 });
  }

  const orders = await prisma.order.findMany({
    where: { storeId, ...(dateRange ? { placedAt: dateRange } : {}) },
    orderBy: { placedAt: "desc" },
    take: 500,
    include: {
      payments: true,
      cashier: { select: { name: true } },
      customer: { select: { name: true } },
    },
  });

  const records = orders.map((order) => ({
    orderNumber: order.orderNumber,
    status: order.status,
    totalAmount: decimalToNumber(order.totalAmount),
    subtotal: decimalToNumber(order.subtotal),
    discount: decimalToNumber(order.itemDiscount) + decimalToNumber(order.orderDiscount),
    paymentMethods: order.payments.map((payment) => payment.method).join("|"),
    cashier: order.cashier?.name ?? "-",
    customer: order.customer?.name ?? "Walk-in",
    placedAt: order.placedAt.toISOString(),
  }));

  const csv = stringify(records, {
    header: true,
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="solvix-sales-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
