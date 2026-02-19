import { MessageCircle, PhoneCall } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-12 pb-20 sm:px-6">
      <div className="border-border bg-card/95 rounded-3xl border p-8 shadow-sm">
        <h1 className="font-display text-4xl font-semibold">Talk with the Solvix team</h1>
        <p className="text-muted-foreground mt-4 max-w-2xl">
          Need migration from your current POS, multi-outlet setup, or custom onboarding? Reach us
          directly on WhatsApp.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" className="rounded-full px-7">
            <a href="https://wa.me/6281234567890">
              <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp Sales
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full px-7">
            <a href="tel:+6281234567890">
              <PhoneCall className="mr-2 h-4 w-4" /> Call Us
            </a>
          </Button>
        </div>
      </div>
    </main>
  );
}
