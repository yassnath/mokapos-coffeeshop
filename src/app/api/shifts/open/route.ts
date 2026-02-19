import { Role } from "@prisma/client";

import { forbiddenResponse, getApiSession, isAllowed, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { openShiftSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const session = await getApiSession();
  if (!session?.user) return unauthorizedResponse();
  if (!isAllowed(session.user.role, [Role.ADMIN, Role.MANAGER, Role.CASHIER]))
    return forbiddenResponse();

  const body = await request.json();
  const parsed = openShiftSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const activeShift = await prisma.shift.findFirst({
    where: {
      registerId: data.registerId,
      status: "OPEN",
    },
  });

  if (activeShift) {
    return Response.json({ error: "Register already has an open shift" }, { status: 409 });
  }

  const shift = await prisma.shift.create({
    data: {
      storeId: data.storeId,
      registerId: data.registerId,
      userId: session.user.id,
      openingCash: data.openingCash,
      notes: data.notes,
    },
  });

  return Response.json({ shift }, { status: 201 });
}
