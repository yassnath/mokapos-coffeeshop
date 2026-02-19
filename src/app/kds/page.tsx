import { Role } from "@prisma/client";

import { AppHeader } from "@/components/layout/app-header";
import { KdsBoard } from "@/components/kds/kds-board";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

export default async function KdsPage() {
  const session = await requireRole([Role.ADMIN, Role.MANAGER, Role.BARISTA]);

  const store = session.user.defaultStoreId
    ? await prisma.store.findUnique({ where: { id: session.user.defaultStoreId } })
    : await prisma.store.findFirst({ orderBy: { createdAt: "asc" } });

  if (!store) {
    return <main className="p-6 text-sm text-neutral-600">No store found.</main>;
  }

  return (
    <>
      <AppHeader name={session.user.name ?? "Staff"} role={session.user.role} />
      <KdsBoard storeId={store.id} />
    </>
  );
}
