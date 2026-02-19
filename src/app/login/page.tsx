import { redirect } from "next/navigation";

import { LoginForm } from "@/components/layout/login-form";
import { auth } from "@/lib/session";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/app");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <LoginForm />
    </main>
  );
}
