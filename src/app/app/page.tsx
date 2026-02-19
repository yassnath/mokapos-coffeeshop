import { redirect } from "next/navigation";

import { auth } from "@/lib/session";
import { routeForRole } from "@/lib/route-by-role";

export default async function AppRedirectPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  redirect(routeForRole(session.user.role));
}
