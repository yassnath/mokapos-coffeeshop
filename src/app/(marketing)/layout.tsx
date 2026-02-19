import Link from "next/link";

import { MarketingNav } from "@/components/marketing/marketing-nav";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-transparent">
      <MarketingNav />
      {children}
      <footer className="border-border text-muted-foreground border-t px-4 py-8 text-sm sm:px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Solvix POS. Built for modern coffee operations.</p>
          <div className="flex gap-4">
            <Link href="/features" className="hover:text-foreground">
              Features
            </Link>
            <Link href="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <a href="https://wa.me/6281234567890" className="hover:text-foreground">
              WhatsApp
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
