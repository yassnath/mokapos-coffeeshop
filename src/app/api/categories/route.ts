import { Role } from "@prisma/client";
import { z } from "zod";

import { forbiddenResponse, getApiSession, isAllowed, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const categorySchema = z.object({
  storeId: z.string().min(1),
  name: z.string().min(2).max(80),
  sortOrder: z.number().int().nonnegative().default(0),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId");

  if (!storeId) {
    return Response.json({ categories: [] });
  }

  const categories = await prisma.category.findMany({
    where: { storeId, isActive: true },
    select: { id: true, name: true, sortOrder: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return Response.json({ categories });
}

export async function POST(request: Request) {
  const session = await getApiSession();
  if (!session?.user) return unauthorizedResponse();
  if (!isAllowed(session.user.role, [Role.ADMIN, Role.MANAGER])) return forbiddenResponse();

  const body = await request.json();
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const category = await prisma.category.create({
    data: parsed.data,
  });

  return Response.json({ category }, { status: 201 });
}
