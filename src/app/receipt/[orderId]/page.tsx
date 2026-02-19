import { notFound } from "next/navigation";

import { PrintButton } from "@/components/layout/print-button";
import { prisma } from "@/lib/db";
import { decimalToNumber } from "@/lib/serializers";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type Props = {
  params: Promise<{ orderId: string }>;
};

export default async function ReceiptPage({ params }: Props) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      store: true,
      items: { include: { modifiers: true } },
      payments: true,
      customer: true,
      cashier: true,
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-xl p-4 print:p-0">
      <div className="mb-3 print:hidden">
        <PrintButton />
      </div>
      <article className="border-border bg-card rounded-2xl border p-5 text-sm shadow print:rounded-none print:border-none print:shadow-none">
        <header className="text-center">
          <h1 className="font-display text-2xl font-semibold">{order.store.name}</h1>
          {order.store.receiptHeader && (
            <p className="mt-1 text-xs text-neutral-500">{order.store.receiptHeader}</p>
          )}
          <p className="mt-1">Order {order.orderNumber}</p>
          <p className="text-xs text-neutral-500">{formatDateTime(order.placedAt)}</p>
        </header>

        <section className="mt-4 space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="bg-muted rounded-xl p-2">
              <div className="flex justify-between">
                <span>{item.productName}</span>
                <span>x{item.quantity}</span>
              </div>
              {!!item.modifiers.length && (
                <div className="text-xs text-neutral-500">
                  {item.modifiers.map((m) => m.modifierOptionName).join(" • ")}
                </div>
              )}
              {item.note && <div className="text-xs text-neutral-500">Note: {item.note}</div>}
            </div>
          ))}
        </section>

        <section className="border-border mt-4 space-y-1 border-t border-dashed pt-3">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(decimalToNumber(order.subtotal))}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount</span>
            <span>
              -
              {formatCurrency(
                decimalToNumber(order.itemDiscount) + decimalToNumber(order.orderDiscount),
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{formatCurrency(decimalToNumber(order.taxAmount))}</span>
          </div>
          <div className="flex justify-between">
            <span>Service</span>
            <span>{formatCurrency(decimalToNumber(order.serviceChargeAmount))}</span>
          </div>
          <div className="flex justify-between">
            <span>Tip</span>
            <span>{formatCurrency(decimalToNumber(order.tipAmount))}</span>
          </div>
          <div className="flex justify-between">
            <span>Rounding</span>
            <span>{formatCurrency(decimalToNumber(order.roundingAmount))}</span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span>{formatCurrency(decimalToNumber(order.totalAmount))}</span>
          </div>
        </section>

        <section className="border-border mt-4 border-t border-dashed pt-3 text-xs">
          <p>Payment methods:</p>
          <ul className="mt-1 space-y-1">
            {order.payments.map((payment) => (
              <li key={payment.id} className="flex justify-between">
                <span>{payment.method}</span>
                <span>{formatCurrency(decimalToNumber(payment.amount))}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2">Cashier: {order.cashier?.name ?? "-"}</p>
          <p>Customer: {order.customer?.name ?? "Walk-in"}</p>
        </section>

        {order.store.receiptFooter && (
          <footer className="mt-5 text-center text-xs text-neutral-500">
            {order.store.receiptFooter}
          </footer>
        )}
      </article>
    </main>
  );
}
