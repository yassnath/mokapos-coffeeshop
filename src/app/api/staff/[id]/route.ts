import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";

import { forbiddenResponse, getApiSession, isAllowed, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { staffUpdateSchema } from "@/lib/validations";

function normalizeOptionalString(value?: string | null) {
  const next = value?.trim();
  return next ? next : null;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session?.user) return unauthorizedResponse();
  if (!isAllowed(session.user.role, [Role.ADMIN])) return forbiddenResponse();

  const { id } = await context.params;
  const body = await request.json();
  const parsed = staffUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  const updateData: Record<string, unknown> = {};

  if (typeof payload.name === "string") updateData.name = payload.name.trim();
  if (typeof payload.username === "string") updateData.username = payload.username.trim();
  if (typeof payload.role !== "undefined") updateData.role = payload.role;
  if (typeof payload.isActive === "boolean") updateData.isActive = payload.isActive;
  if (typeof payload.email !== "undefined")
    updateData.email = normalizeOptionalString(payload.email);
  if (typeof payload.defaultStoreId !== "undefined") {
    updateData.defaultStoreId = normalizeOptionalString(payload.defaultStoreId);
  }

  if (typeof payload.password === "string" && payload.password.trim()) {
    updateData.passwordHash = await bcrypt.hash(payload.password, 10);
  }

  if (typeof payload.pin === "string") {
    updateData.pinHash = payload.pin.trim() ? await bcrypt.hash(payload.pin, 10) : null;
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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

    return Response.json({ user });
  } catch (error) {
    return Response.json(
      {
        error: "Failed to update staff account. Email/username may already be used.",
        detail: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 409 },
    );
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session?.user) return unauthorizedResponse();
  if (!isAllowed(session.user.role, [Role.ADMIN])) return forbiddenResponse();

  const { id } = await context.params;

  if (id === session.user.id) {
    return Response.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id },
    data: {
      isActive: false,
    },
  });

  return Response.json({ ok: true });
}
