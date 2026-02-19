import { Role } from "@prisma/client";

import { AppHeader } from "@/components/layout/app-header";
import { PosWorkspace } from "@/components/pos/pos-workspace";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

export default async function PosPage() {
  const session = await requireRole([Role.ADMIN, Role.MANAGER, Role.CASHIER]);

  const store = session.user.defaultStoreId
    ? await prisma.store.findUnique({ where: { id: session.user.defaultStoreId } })
    : await prisma.store.findFirst({ orderBy: { createdAt: "asc" } });

  if (!store) {
    return (
      <main className="p-6 text-sm text-neutral-600">No store found. Run database seed first.</main>
    );
  }

  const register = await prisma.register.findFirst({
    where: { storeId: store.id, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  if (!register) {
    return <main className="p-6 text-sm text-neutral-600">No active register configured.</main>;
  }

  const activeShift = await prisma.shift.findFirst({
    where: {
      storeId: store.id,
      registerId: register.id,
      status: "OPEN",
    },
    orderBy: { openedAt: "desc" },
  });

  return (
    <>
      <AppHeader name={session.user.name ?? "Staff"} role={session.user.role} />
      <PosWorkspace
        storeId={store.id}
        registerId={register.id}
        initialShiftId={activeShift?.id}
        userRole={session.user.role}
      />
    </>
  );
}
