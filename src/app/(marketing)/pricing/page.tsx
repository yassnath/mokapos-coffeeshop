import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Starter",
    price: "Rp799.000",
    note: "per outlet / month",
    features: ["1 register", "Realtime KDS", "Basic reports", "WhatsApp support"],
  },
  {
    name: "Growth",
    price: "Rp1.499.000",
    note: "per outlet / month",
    features: ["3 registers", "Shift management", "Audit + exports", "Priority support"],
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    note: "multi-outlet",
    features: ["Custom integrations", "SLA support", "Onboarding training", "Advanced analytics"],
  },
];

export default function PricingPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pt-12 pb-20 sm:px-6">
      <div className="mx-auto mb-10 max-w-3xl text-center">
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">
          Simple plans for coffee businesses
        </h1>
        <p className="text-muted-foreground mt-4">
          Transparent monthly pricing. No lock-in contracts.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={`rounded-3xl border p-6 shadow-sm ${
              plan.featured ? "border-accent bg-accent/25" : "border-border bg-card/95"
            }`}
          >
            <h2 className="font-display text-2xl font-medium">{plan.name}</h2>
            <div className="mt-2 text-3xl font-semibold">{plan.price}</div>
            <p className="text-muted-foreground text-sm">{plan.note}</p>
            <ul className="mt-5 space-y-3 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="text-success h-4 w-4" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button className="mt-6 w-full rounded-full">Start trial</Button>
          </article>
        ))}
      </div>
    </main>
  );
}
