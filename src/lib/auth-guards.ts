import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/lib/session";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(allowed: Role[]) {
  const session = await requireSession();
  if (!session.user.role || !Object.values(Role).includes(session.user.role)) {
    redirect("/login");
  }
  if (!allowed.includes(session.user.role)) {
    redirect("/forbidden");
  }
  return session;
}
