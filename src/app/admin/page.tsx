import { Role } from "@prisma/client";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AppHeader } from "@/components/layout/app-header";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

export default async function AdminPage() {
  const session = await requireRole([Role.ADMIN, Role.MANAGER]);

  const store = session.user.defaultStoreId
    ? await prisma.store.findUnique({ where: { id: session.user.defaultStoreId } })
    : await prisma.store.findFirst({ orderBy: { createdAt: "asc" } });

  if (!store) {
    return <main className="p-6 text-sm text-neutral-600">No store found.</main>;
  }

  return (
    <>
      <AppHeader name={session.user.name ?? "Manager"} role={session.user.role} />
      <AdminDashboard storeId={store.id} role={session.user.role} />
    </>
  );
}
