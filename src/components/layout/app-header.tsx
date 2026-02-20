"use client";

import { Role } from "@prisma/client";
import { LogOut, LayoutDashboard, ShoppingCart, ChefHat, History } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, type ComponentType } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

const roleNav: Record<
  Role,
  Array<{ href: string; label: string; icon: ComponentType<{ className?: string }> }>
> = {
  ADMIN: [
    { href: "/admin", label: "Admin", icon: LayoutDashboard },
    { href: "/pos", label: "POS", icon: ShoppingCart },
    { href: "/kds", label: "KDS", icon: ChefHat },
    { href: "/history", label: "History", icon: History },
  ],
  MANAGER: [
    { href: "/admin", label: "Admin", icon: LayoutDashboard },
    { href: "/pos", label: "POS", icon: ShoppingCart },
    { href: "/kds", label: "KDS", icon: ChefHat },
    { href: "/history", label: "History", icon: History },
  ],
  CASHIER: [
    { href: "/pos", label: "POS", icon: ShoppingCart },
    { href: "/history", label: "History", icon: History },
  ],
  BARISTA: [{ href: "/kds", label: "KDS", icon: ChefHat }],
};

type HeaderProps = {
  name: string;
  role: Role;
};

export function AppHeader({ name, role }: HeaderProps) {
  const pathname = usePathname();
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <>
      <header className="border-border bg-background/90 sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full items-center justify-between px-3 sm:px-5">
          <div className="flex items-center gap-3">
            <Link href="/app" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Solvix POS logo"
                width={36}
                height={36}
                className="h-9 w-9 rounded-lg object-cover"
                priority
              />
              <span className="font-display text-lg font-semibold tracking-tight">Solvix POS</span>
            </Link>
            <Badge variant="secondary" className="uppercase">
              {role}
            </Badge>
          </div>
          <nav className="hidden items-center gap-2 sm:flex">
            {roleNav[role].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                  pathname.startsWith(item.href) && "bg-accent/45 text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground hidden text-sm sm:inline">{name}</span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Sign out"
              onClick={() => setLogoutOpen(true)}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <ConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        title="Logout akun?"
        description="Sesi Anda akan diakhiri dan kembali ke halaman login."
        confirmText="Logout"
        isDanger
        onConfirm={async () => {
          if (role === Role.CASHIER) {
            try {
              const response = await fetch("/api/shifts/close-active", { method: "POST" });
              if (!response.ok) {
                const json = await response.json().catch(() => ({}));
                const message = json.error ?? "Gagal menutup shift sebelum logout.";
                throw new Error(message);
              }
              const json = (await response.json().catch(() => ({ closedCount: 0 }))) as {
                closedCount?: number;
              };
              if ((json.closedCount ?? 0) > 0) {
                toast.success("Shift closed");
              }
            } catch (error) {
              if (error instanceof Error) toast.error(error.message);
              throw error;
            }
          }
          await signOut({ callbackUrl: "/login" });
        }}
      />
    </>
  );
}
