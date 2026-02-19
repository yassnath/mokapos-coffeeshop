import Image from "next/image";
import { CheckCircle2, Package, ShieldCheck, Signal, Wallet } from "lucide-react";

const features = [
  {
    title: "Fast Checkout",
    desc: "Big product tiles, keyboard shortcuts, split payment, tips, and receipt print in one flow.",
    icon: Wallet,
  },
  {
    title: "Realtime KDS",
    desc: "Cashier to barista instant order updates with clear notes/modifiers and ready-state controls.",
    icon: Signal,
  },
  {
    title: "Product + Inventory",
    desc: "Simple cafe-grade product management with modifiers, variants, and ingredient stock alerts.",
    icon: Package,
  },
  {
    title: "Security & Audit",
    desc: "RBAC enforced on discounts/void/refund with immutable audit trails for owner visibility.",
    icon: ShieldCheck,
  },
];

export default function FeaturesPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pt-12 pb-20 sm:px-6">
      <div className="mb-10 max-w-3xl">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Built for real café floor operations
        </h1>
        <p className="text-muted-foreground mt-4 text-base">
          Solvix POS combines speed at checkout, kitchen clarity, and manager-grade controls in one
          system.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {features.map((feature) => (
          <article
            key={feature.title}
            className="border-border bg-card/95 rounded-3xl border p-6 shadow-sm"
          >
            <feature.icon className="text-primary mb-3 h-5 w-5" />
            <h2 className="font-display text-2xl font-medium">{feature.title}</h2>
            <p className="text-muted-foreground mt-2 text-sm">{feature.desc}</p>
            <ul className="text-muted-foreground mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="text-success h-4 w-4" />
                Mobile/tablet/desktop responsive
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="text-success h-4 w-4" />
                Indonesian locale and IDR formatting
              </li>
            </ul>
          </article>
        ))}
      </div>

      <div className="border-border bg-card/95 mt-10 rounded-3xl border p-4 shadow-sm">
        <Image
          src="/screenshots/kds-placeholder.svg"
          alt="KDS screenshot"
          width={1200}
          height={700}
          className="h-auto w-full rounded-2xl"
        />
      </div>
    </main>
  );
}
