import { OrderStatus, Role } from "@prisma/client";

import { forbiddenResponse, getApiSession, isAllowed, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/serializers";
import { productUpsertSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId");
  const q = searchParams.get("q")?.trim();
  const categoryId = searchParams.get("categoryId");
  const favoritesOnly = searchParams.get("favorites") === "1";
  const includeAll = searchParams.get("all") === "1";
  const includeCost = searchParams.get("includeCost") === "1";

  let canReadAll = false;
  let canReadCost = false;

  if (includeAll || includeCost) {
    const session = await getApiSession();
    if (!session?.user) return unauthorizedResponse();
    if (!isAllowed(session.user.role, [Role.ADMIN, Role.MANAGER])) return forbiddenResponse();

    canReadAll = includeAll;
    canReadCost = includeCost && session.user.role === Role.ADMIN;
  }

  if (!storeId) {
    return Response.json({ products: [] });
  }

  let bestSellerProductIds: string[] = [];

  if (favoritesOnly) {
    const grouped = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        productId: { not: null },
        order: {
          storeId,
          status: { notIn: [OrderStatus.VOIDED, OrderStatus.REFUNDED] },
        },
      },
      _sum: { quantity: true },
    });

    bestSellerProductIds = grouped
      .filter((row) => (row._sum.quantity ?? 0) >= 5 && Boolean(row.productId))
      .map((row) => row.productId as string);

    if (!bestSellerProductIds.length) {
      return Response.json({ products: [] });
    }
  }

  const products = await prisma.product.findMany({
    where: {
      storeId,
      ...(canReadAll ? {} : { isAvailable: true }),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(favoritesOnly ? { id: { in: bestSellerProductIds } } : {}),
    },
    include: {
      category: { select: { id: true, name: true } },
      modifierGroups: {
        orderBy: { sortOrder: "asc" },
        include: {
          group: {
            include: {
              options: {
                where: { isAvailable: true },
                orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
              },
            },
          },
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return Response.json({
    products: products.map((product) => {
      const basePrice = decimalToNumber(product.basePrice);
      const derivedCostPrice = Math.max(basePrice - 5000, 0);

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        description: product.description,
        basePrice,
        costPrice: canReadCost ? derivedCostPrice : undefined,
        profitPerItem: canReadCost ? basePrice - derivedCostPrice : undefined,
        stock: typeof product.stock === "number" ? product.stock : 100,
        imageUrl: product.imageUrl,
        isFavorite: product.isFavorite,
        isAvailable: product.isAvailable,
        categoryId: product.categoryId,
        categoryName: product.category?.name,
        modifierGroups: product.modifierGroups.map((entry) => ({
          id: entry.group.id,
          name: entry.group.name,
          required: entry.group.required,
          minSelect: entry.group.minSelect,
          maxSelect: entry.group.maxSelect,
          isMulti: entry.group.isMulti,
          options: entry.group.options.map((option) => ({
            id: option.id,
            name: option.name,
            priceDelta: decimalToNumber(option.priceDelta),
          })),
        })),
      };
    }),
  });
}

export async function POST(request: Request) {
  const session = await getApiSession();
  if (!session?.user) return unauthorizedResponse();
  if (!isAllowed(session.user.role, [Role.ADMIN, Role.MANAGER])) return forbiddenResponse();

  const body = await request.json();
  const parsed = productUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { modifierGroupIds, ...payload } = parsed.data;
  const normalizedBasePrice = Number(payload.basePrice) || 0;
  const normalizedCostPrice = Math.max(0, normalizedBasePrice - 5000);

  const product = await prisma.product.create({
    data: {
      ...payload,
      basePrice: normalizedBasePrice,
      costPrice: normalizedCostPrice,
      stock: 100,
      categoryId: payload.categoryId || null,
      modifierGroups: modifierGroupIds?.length
        ? {
            createMany: {
              data: modifierGroupIds.map((groupId, index) => ({
                groupId,
                sortOrder: index,
              })),
            },
          }
        : undefined,
    },
  });

  return Response.json({ product }, { status: 201 });
}
