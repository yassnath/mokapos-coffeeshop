import { Prisma, Role } from "@prisma/client";

import { forbiddenResponse, getApiSession, isAllowed, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { buildOrderNumber } from "@/lib/order-number";
import { realtimeBus } from "@/lib/realtime";
import { decimalToNumber } from "@/lib/serializers";
import { submitOrderSchema } from "@/lib/validations";

function jsonNumber(value: number) {
  return Math.round(value * 100) / 100;
}

export async function GET(request: Request) {
  const session = await getApiSession();
  if (!session?.user) return unauthorizedResponse();

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") ?? session.user.defaultStoreId;
  const status = searchParams.get("status");

  if (!storeId) return Response.json({ error: "storeId is required" }, { status: 400 });

  const statuses = status?.split(",").filter(Boolean);

  const orders = await prisma.order.findMany({
    where: {
      storeId,
      ...(statuses?.length ? { status: { in: statuses as never[] } } : {}),
    },
    include: {
      customer: { select: { id: true, name: true } },
      items: {
        include: {
          modifiers: true,
        },
      },
      payments: true,
    },
    orderBy: {
      placedAt: "asc",
    },
    take: 150,
  });

  return Response.json({
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      placedAt: order.placedAt,
      notes: order.notes,
      totalAmount: decimalToNumber(order.totalAmount),
      customer: order.customer,
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        note: item.note,
        status: item.itemStatus,
        modifiers: item.modifiers.map((modifier) => ({
          id: modifier.id,
          modifierGroupName: modifier.modifierGroupName,
          modifierOptionName: modifier.modifierOptionName,
          priceDelta: decimalToNumber(modifier.priceDelta),
        })),
      })),
      payments: order.payments.map((payment) => ({
        id: payment.id,
        method: payment.method,
        amount: decimalToNumber(payment.amount),
      })),
    })),
  });
}

export async function POST(request: Request) {
  const session = await getApiSession();
  if (!session?.user) return unauthorizedResponse();
  if (!isAllowed(session.user.role, [Role.ADMIN, Role.MANAGER, Role.CASHIER]))
    return forbiddenResponse();

  const body = await request.json();
  const parsed = submitOrderSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;

  const register = await prisma.register.findFirst({
    where: { id: payload.registerId, storeId: payload.storeId, isActive: true },
    select: { id: true },
  });
  if (!register) {
    return Response.json(
      { error: "Register tidak valid untuk store ini. Buat ulang order dari POS." },
      { status: 409 },
    );
  }

  if (payload.shiftId) {
    const shift = await prisma.shift.findFirst({
      where: {
        id: payload.shiftId,
        storeId: payload.storeId,
        registerId: payload.registerId,
      },
      select: { id: true },
    });

    if (!shift) {
      return Response.json(
        { error: "Shift tidak valid atau sudah berubah. Buka shift lalu buat ulang order." },
        { status: 409 },
      );
    }
  }

  if (payload.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: payload.customerId, storeId: payload.storeId },
      select: { id: true },
    });

    if (!customer) {
      return Response.json(
        { error: "Customer tidak valid untuk store ini. Silakan pilih customer lagi." },
        { status: 409 },
      );
    }
  }

  if (
    (payload.itemDiscount > 0 || payload.orderDiscount > 0) &&
    !isAllowed(session.user.role, [Role.ADMIN, Role.MANAGER])
  ) {
    return Response.json({ error: "Only MANAGER/ADMIN can apply discounts." }, { status: 403 });
  }

  const paymentsTotal = payload.payments.reduce((sum, payment) => sum + payment.amount, 0);
  if (Math.abs(paymentsTotal - payload.totalAmount) > 1) {
    return Response.json({ error: "Payment total must match order total." }, { status: 400 });
  }

  const orderNumber = buildOrderNumber();
  const stockUsage = payload.items.reduce<Map<string, { quantity: number; productName: string }>>(
    (acc, item) => {
      if (!item.productId) return acc;
      const current = acc.get(item.productId);
      if (current) {
        current.quantity += item.quantity;
        return acc;
      }
      acc.set(item.productId, { quantity: item.quantity, productName: item.productName });
      return acc;
    },
    new Map(),
  );

  const order = await (async () => {
    try {
      return await prisma.$transaction(async (tx) => {
        for (const [productId, usage] of stockUsage.entries()) {
          const stockUpdated = await tx.product.updateMany({
            where: {
              id: productId,
              storeId: payload.storeId,
              isAvailable: true,
              stock: { gte: usage.quantity },
            },
            data: {
              stock: { decrement: usage.quantity },
            },
          });

          if (stockUpdated.count === 0) {
            throw new Error(`INSUFFICIENT_STOCK:${usage.productName}`);
          }
        }

        const created = await tx.order.create({
          data: {
            orderNumber,
            storeId: payload.storeId,
            registerId: payload.registerId,
            shiftId: payload.shiftId,
            customerId: payload.customerId,
            cashierId: session.user.id,
            notes: payload.notes,
            subtotal: jsonNumber(payload.subtotal),
            itemDiscount: jsonNumber(payload.itemDiscount),
            orderDiscount: jsonNumber(payload.orderDiscount),
            taxAmount: jsonNumber(payload.taxAmount),
            serviceChargeAmount: jsonNumber(payload.serviceChargeAmount),
            tipAmount: jsonNumber(payload.tipAmount),
            roundingAmount: jsonNumber(payload.roundingAmount),
            totalAmount: jsonNumber(payload.totalAmount),
            items: {
              create: payload.items.map((item) => ({
                productId: item.productId,
                productName: item.productName,
                unitPrice: jsonNumber(item.unitPrice),
                quantity: item.quantity,
                discountAmount: jsonNumber(item.discountAmount),
                lineTotal: jsonNumber(item.lineTotal),
                note: item.note,
                modifiers: {
                  create: item.modifiers.map((modifier) => ({
                    optionId: modifier.optionId,
                    modifierGroupName: modifier.modifierGroupName,
                    modifierOptionName: modifier.modifierOptionName,
                    priceDelta: jsonNumber(modifier.priceDelta),
                  })),
                },
              })),
            },
            payments: {
              create: payload.payments.map((payment) => ({
                method: payment.method,
                amount: jsonNumber(payment.amount),
                reference: payment.reference,
                shiftId: payload.shiftId,
              })),
            },
          },
          include: {
            customer: { select: { id: true, name: true } },
            items: {
              include: {
                modifiers: true,
              },
            },
            payments: true,
          },
        });

        await tx.auditLog.create({
          data: {
            storeId: payload.storeId,
            userId: session.user.id,
            orderId: created.id,
            action: "ORDER_CREATED",
            entity: "Order",
            entityId: created.id,
            message: `Order ${created.orderNumber} created`,
          },
        });

        if (payload.itemDiscount > 0 || payload.orderDiscount > 0) {
          await tx.auditLog.create({
            data: {
              storeId: payload.storeId,
              userId: session.user.id,
              orderId: created.id,
              action: "DISCOUNT_APPLIED",
              entity: "Order",
              entityId: created.id,
              message: "Discount applied during checkout",
              metadata: {
                itemDiscount: payload.itemDiscount,
                orderDiscount: payload.orderDiscount,
              },
            },
          });
        }

        return created;
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("INSUFFICIENT_STOCK:")) {
        const productName = error.message.split(":")[1] ?? "product";
        throw new Error(`STOCK_RESPONSE:${productName}`);
      }
      throw error;
    }
  })().catch((error) => {
    if (error instanceof Error && error.message.startsWith("STOCK_RESPONSE:")) {
      const productName = error.message.split(":")[1] ?? "product";
      return Response.json({ error: `Stock not enough for ${productName}` }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        return Response.json(
          { error: "Referensi data order sudah tidak valid. Silakan input order ulang." },
          { status: 409 },
        );
      }

      if (error.code === "P2002") {
        return Response.json({ error: "Nomor order bentrok. Coba submit ulang." }, { status: 409 });
      }
    }

    console.error("[orders.post] unhandled error", error);
    const debugMessage =
      error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";
    return Response.json(
      {
        error: "Failed to create order",
        ...(process.env.NODE_ENV !== "production" ? { detail: debugMessage } : {}),
      },
      { status: 500 },
    );
  });

  if (order instanceof Response) return order;

  const normalized = {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    placedAt: order.placedAt,
    totalAmount: decimalToNumber(order.totalAmount),
    notes: order.notes,
    customer: order.customer,
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      quantity: item.quantity,
      note: item.note,
      modifiers: item.modifiers.map((modifier) => ({
        id: modifier.id,
        modifierGroupName: modifier.modifierGroupName,
        modifierOptionName: modifier.modifierOptionName,
        priceDelta: decimalToNumber(modifier.priceDelta),
      })),
    })),
    payments: order.payments.map((payment) => ({
      id: payment.id,
      method: payment.method,
      amount: decimalToNumber(payment.amount),
    })),
  };

  try {
    realtimeBus.publish({
      type: "order.created",
      orderId: order.id,
      data: normalized,
    });
  } catch (error) {
    console.error("[orders.post] publish failed", error);
  }

  return Response.json({ order: normalized }, { status: 201 });
}
