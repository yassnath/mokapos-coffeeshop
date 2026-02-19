import { Role } from "@prisma/client";

import { forbiddenResponse, getApiSession, isAllowed, unauthorizedResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { settingsUpdateSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId");
  if (!storeId) return Response.json({ error: "storeId is required" }, { status: 400 });

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: { settings: true },
  });

  if (!store) return Response.json({ error: "Store not found" }, { status: 404 });

  return Response.json({
    settings: {
      storeId: store.id,
      taxRate: Number(store.taxRate),
      serviceChargeRate: Number(store.serviceChargeRate),
      roundingUnit: store.roundingUnit,
      receiptHeader: store.receiptHeader,
      receiptFooter: store.receiptFooter,
      printerName: store.settings?.printerName,
      receiptCopies: store.settings?.receiptCopies ?? 1,
      allowTips: store.settings?.allowTips ?? true,
    },
  });
}

export async function PATCH(request: Request) {
  const session = await getApiSession();
  if (!session?.user) return unauthorizedResponse();
  if (!isAllowed(session.user.role, [Role.ADMIN, Role.MANAGER])) return forbiddenResponse();

  const body = await request.json();
  const parsed = settingsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    storeId,
    taxRate,
    serviceChargeRate,
    roundingUnit,
    receiptHeader,
    receiptFooter,
    printerName,
    receiptCopies,
    allowTips,
  } = parsed.data;

  await prisma.$transaction([
    prisma.store.update({
      where: { id: storeId },
      data: {
        taxRate,
        serviceChargeRate,
        roundingUnit,
        receiptHeader,
        receiptFooter,
      },
    }),
    prisma.storeSetting.upsert({
      where: { storeId },
      update: {
        printerName,
        receiptCopies,
        allowTips,
      },
      create: {
        storeId,
        printerName,
        receiptCopies,
        allowTips,
      },
    }),
  ]);

  return Response.json({ ok: true });
}
