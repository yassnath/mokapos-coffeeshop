import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/layout/login-form";
import { auth } from "@/lib/session";

export default async function LoginPage() {
  const session = await auth();
  const role = session?.user?.role;
  const hasValidRole = Boolean(role && Object.values(Role).includes(role));

  if (session?.user && hasValidRole) {
    redirect("/app");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md space-y-4">
        <LoginForm />
        <section className="border-border bg-card rounded-2xl border p-4 text-sm">
          <h2 className="mb-2 font-semibold">Demo Accounts</h2>
          <div className="space-y-1 text-neutral-700">
            <p>
              Admin: <span className="font-medium">admin@solvixpos.local</span> /{" "}
              <span className="font-medium">password</span> / PIN{" "}
              <span className="font-medium">123456</span>
            </p>
            <p>
              Manager: <span className="font-medium">manager@solvixpos.local</span> /{" "}
              <span className="font-medium">password</span> / PIN{" "}
              <span className="font-medium">333333</span>
            </p>
            <p>
              Cashier: <span className="font-medium">cashier@solvixpos.local</span> /{" "}
              <span className="font-medium">password</span> / PIN{" "}
              <span className="font-medium">111111</span>
            </p>
            <p>
              Barista: <span className="font-medium">barista@solvixpos.local</span> /{" "}
              <span className="font-medium">password</span> / PIN{" "}
              <span className="font-medium">222222</span>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
