import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function DemoPage() {
  return (
    <main className="mx-auto grid w-full max-w-7xl gap-8 px-4 pt-12 pb-20 sm:px-6 md:grid-cols-2">
      <section className="border-border bg-card/95 rounded-3xl border p-6 shadow-sm">
        <h1 className="font-display text-3xl font-semibold">Interactive product demo</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Explore cashier flow, KDS live queue, and admin analytics in a seeded demo environment.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="rounded-full px-6">
            <Link href="/login">Open Solvix POS App</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full px-6">
            <Link href="/kds">Open KDS</Link>
          </Button>
        </div>
      </section>
      <section className="border-border bg-card/95 rounded-3xl border p-4 shadow-sm">
        <Image
          src="/screenshots/admin-placeholder.svg"
          alt="Admin analytics screenshot"
          width={1200}
          height={700}
          className="h-auto w-full rounded-2xl"
        />
      </section>
    </main>
  );
}
