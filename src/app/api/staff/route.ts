import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";

import { forbiddenResponse, getApiSession, isAllowed, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { staffCreateSchema } from "@/lib/validations";

function normalizeOptionalString(value?: string | null) {
  const next = value?.trim();
  return next ? next : null;
}

export async function GET() {
  const session = await getApiSession();
  if (!session?.user) return unauthorizedResponse();
  if (!isAllowed(session.user.role, [Role.ADMIN])) return forbiddenResponse();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      isActive: true,
      defaultStoreId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return Response.json({ users });
}

export async function POST(request: Request) {
  const session = await getApiSession();
  if (!session?.user) return unauthorizedResponse();
  if (!isAllowed(session.user.role, [Role.ADMIN])) return forbiddenResponse();

  const body = await request.json();
  const parsed = staffCreateSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const pinHash = parsed.data.pin ? await bcrypt.hash(parsed.data.pin, 10) : null;

  try {
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name.trim(),
        email: normalizeOptionalString(parsed.data.email),
        username: parsed.data.username.trim(),
        role: parsed.data.role,
        isActive: parsed.data.isActive,
        defaultStoreId: normalizeOptionalString(parsed.data.defaultStoreId),
        passwordHash,
        pinHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        defaultStoreId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return Response.json({ user }, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error: "Failed to create staff account. Email/username may already be used.",
        detail: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 409 },
    );
  }
}
