"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/demo", label: "Demo" },
  { href: "/contact", label: "Contact" },
];

export function MarketingNav() {
  const pathname = usePathname();

  return (
    <header className="border-border bg-background/90 sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/login" className="flex items-center gap-2">
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
        <nav className="hidden items-center gap-2 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-muted-foreground hover:bg-muted hover:text-foreground rounded-xl px-3 py-2 text-sm transition",
                pathname === link.href && "bg-accent/45 text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild className="rounded-full px-5 text-sm">
            <Link href="/login">Open App</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
