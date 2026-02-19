import { Role } from "@prisma/client";

import { forbiddenResponse, getApiSession, isAllowed, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { productUpsertSchema } from "@/lib/validations";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session?.user) return unauthorizedResponse();
  if (!isAllowed(session.user.role, [Role.ADMIN, Role.MANAGER])) return forbiddenResponse();

  const { id } = await context.params;
  const body = await request.json();
  const parsed = productUpsertSchema.partial().safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { modifierGroupIds, ...payload } = parsed.data;
  const normalizedBasePrice =
    typeof payload.basePrice === "number" ? Number(payload.basePrice) || 0 : undefined;

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...payload,
      basePrice: normalizedBasePrice,
      costPrice:
        typeof normalizedBasePrice === "number"
          ? Math.max(0, normalizedBasePrice - 5000)
          : undefined,
      stock: typeof normalizedBasePrice === "number" ? 100 : undefined,
      categoryId: payload.categoryId
        ? payload.categoryId
        : payload.categoryId === null
          ? null
          : undefined,
      modifierGroups: modifierGroupIds
        ? {
            deleteMany: {},
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

  return Response.json({ product });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session?.user) return unauthorizedResponse();
  if (!isAllowed(session.user.role, [Role.ADMIN, Role.MANAGER])) return forbiddenResponse();

  const { id } = await context.params;

  await prisma.product.update({
    where: { id },
    data: {
      isAvailable: false,
    },
  });

  return Response.json({ ok: true });
}
