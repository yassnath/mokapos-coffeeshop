import { Role } from "@prisma/client";
import { stringify } from "csv-stringify/sync";

import { forbiddenResponse, getApiSession, isAllowed, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/serializers";

export async function GET(request: Request) {
  const session = await getApiSession();
  if (!session?.user) return unauthorizedResponse();
  if (!isAllowed(session.user.role, [Role.ADMIN, Role.MANAGER])) return forbiddenResponse();

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") ?? session.user.defaultStoreId;

  if (!storeId) {
    return Response.json({ error: "storeId is required" }, { status: 400 });
  }

  const orders = await prisma.order.findMany({
    where: { storeId },
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
