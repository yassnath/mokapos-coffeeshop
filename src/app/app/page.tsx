import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/lib/session";
import { routeForRole } from "@/lib/route-by-role";

export default async function AppRedirectPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.role || !Object.values(Role).includes(session.user.role)) {
    redirect("/login");
  }

  redirect(routeForRole(session.user.role));
}
