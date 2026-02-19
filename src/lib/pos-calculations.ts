import { roundToUnit } from "@/lib/utils";

export type CartTotalsInput = {
  subtotal: number;
  itemDiscount: number;
  orderDiscount: number;
  taxRate: number;
  serviceChargeRate: number;
  tipAmount: number;
  roundingUnit: number;
};

export type CartTotals = {
  discountedSubtotal: number;
  taxAmount: number;
  serviceChargeAmount: number;
  roundingAmount: number;
  totalAmount: number;
};

export function calculateCartTotals(input: CartTotalsInput): CartTotals {
  const discountedSubtotal = Math.max(0, input.subtotal - input.itemDiscount - input.orderDiscount);
  const taxAmount = discountedSubtotal * (input.taxRate / 100);
  const serviceChargeAmount = discountedSubtotal * (input.serviceChargeRate / 100);
  const rawTotal = discountedSubtotal + taxAmount + serviceChargeAmount + input.tipAmount;
  const rounded = roundToUnit(rawTotal, input.roundingUnit);
  const roundingAmount = rounded - rawTotal;

  return {
    discountedSubtotal,
    taxAmount,
    serviceChargeAmount,
    roundingAmount,
    totalAmount: rounded,
  };
}
