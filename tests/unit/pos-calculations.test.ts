import { describe, expect, it } from "vitest";

import { calculateCartTotals } from "@/lib/pos-calculations";

describe("calculateCartTotals", () => {
  it("calculates totals with discount, tax and service", () => {
    const totals = calculateCartTotals({
      subtotal: 100000,
      itemDiscount: 5000,
      orderDiscount: 5000,
      taxRate: 11,
      serviceChargeRate: 5,
      tipAmount: 2000,
      roundingUnit: 100,
    });

    expect(totals.discountedSubtotal).toBe(90000);
    expect(Math.round(totals.taxAmount)).toBe(9900);
    expect(Math.round(totals.serviceChargeAmount)).toBe(4500);
    expect(Math.round(totals.totalAmount)).toBe(106400);
  });

  it("returns non-negative discounted subtotal", () => {
    const totals = calculateCartTotals({
      subtotal: 10000,
      itemDiscount: 8000,
      orderDiscount: 5000,
      taxRate: 11,
      serviceChargeRate: 0,
      tipAmount: 0,
      roundingUnit: 100,
    });

    expect(totals.discountedSubtotal).toBe(0);
    expect(totals.totalAmount).toBe(0);
  });
});
