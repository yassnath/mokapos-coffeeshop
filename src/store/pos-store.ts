"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { calculateCartTotals } from "@/lib/pos-calculations";

export type CartPaymentMethod = "CASH" | "CARD" | "QRIS" | "EWALLET";

export type CartModifier = {
  optionId?: string;
  modifierGroupName: string;
  modifierOptionName: string;
  priceDelta: number;
};

export type CartItem = {
  id: string;
  productId?: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  note?: string;
  discountAmount: number;
  modifiers: CartModifier[];
};

export type PaymentSplit = {
  id: string;
  method: CartPaymentMethod;
  amount: number;
  reference?: string;
};

type CartState = {
  items: CartItem[];
  customerId?: string;
  orderNote?: string;
  orderDiscount: number;
  tipAmount: number;
  taxRate: number;
  serviceChargeRate: number;
  roundingUnit: number;
  paymentSplits: PaymentSplit[];
  setRates: (payload: { taxRate: number; serviceChargeRate: number; roundingUnit: number }) => void;
  addItem: (item: Omit<CartItem, "id">) => void;
  increment: (id: string) => void;
  decrement: (id: string) => void;
  removeItem: (id: string) => void;
  setItemNote: (id: string, note: string) => void;
  setItemDiscount: (id: string, discountAmount: number) => void;
  setOrderDiscount: (amount: number) => void;
  setTipAmount: (amount: number) => void;
  setCustomerId: (customerId?: string) => void;
  setOrderNote: (note: string) => void;
  setPaymentSplits: (splits: PaymentSplit[]) => void;
  resetCart: () => void;
};

const defaultPaymentSplit: PaymentSplit = {
  id: "main",
  method: "CASH",
  amount: 0,
};

function calculateLineTotal(item: CartItem) {
  const modifiersTotal = item.modifiers.reduce((sum, modifier) => sum + modifier.priceDelta, 0);
  return Math.max(0, (item.unitPrice + modifiersTotal) * item.quantity - item.discountAmount);
}

export const usePosStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      customerId: undefined,
      orderNote: "",
      orderDiscount: 0,
      tipAmount: 0,
      taxRate: 11,
      serviceChargeRate: 5,
      roundingUnit: 100,
      paymentSplits: [defaultPaymentSplit],
      setRates: ({ taxRate, serviceChargeRate, roundingUnit }) =>
        set(() => ({
          taxRate,
          serviceChargeRate,
          roundingUnit,
        })),
      addItem: (newItem) =>
        set((state) => {
          const existing = state.items.find(
            (item) =>
              item.productId === newItem.productId &&
              JSON.stringify(item.modifiers) === JSON.stringify(newItem.modifiers) &&
              !item.note,
          );

          if (existing) {
            return {
              items: state.items.map((item) =>
                item.id === existing.id
                  ? { ...item, quantity: item.quantity + newItem.quantity }
                  : item,
              ),
            };
          }

          return {
            items: [
              ...state.items,
              {
                ...newItem,
                id: crypto.randomUUID(),
              },
            ],
          };
        }),
      increment: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
          ),
        })),
      decrement: (id) =>
        set((state) => ({
          items: state.items
            .map((item) =>
              item.id === id ? { ...item, quantity: Math.max(1, item.quantity - 1) } : item,
            )
            .filter((item) => item.quantity > 0),
        })),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      setItemNote: (id, note) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, note } : item)),
        })),
      setItemDiscount: (id, discountAmount) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, discountAmount } : item)),
        })),
      setOrderDiscount: (amount) => set(() => ({ orderDiscount: amount })),
      setTipAmount: (amount) => set(() => ({ tipAmount: amount })),
      setCustomerId: (customerId) => set(() => ({ customerId })),
      setOrderNote: (note) => set(() => ({ orderNote: note })),
      setPaymentSplits: (splits) => set(() => ({ paymentSplits: splits })),
      resetCart: () =>
        set(() => ({
          items: [],
          customerId: undefined,
          orderNote: "",
          orderDiscount: 0,
          tipAmount: 0,
          paymentSplits: [defaultPaymentSplit],
        })),
    }),
    {
      name: "solvix-pos-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        customerId: state.customerId,
        orderNote: state.orderNote,
        orderDiscount: state.orderDiscount,
        tipAmount: state.tipAmount,
        paymentSplits: state.paymentSplits,
      }),
    },
  ),
);

export function useCartTotals() {
  const items = usePosStore((state) => state.items);
  const orderDiscount = usePosStore((state) => state.orderDiscount);
  const tipAmount = usePosStore((state) => state.tipAmount);
  const taxRate = usePosStore((state) => state.taxRate);
  const serviceChargeRate = usePosStore((state) => state.serviceChargeRate);
  const roundingUnit = usePosStore((state) => state.roundingUnit);

  const subtotal = items.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  const itemDiscount = items.reduce((sum, item) => sum + item.discountAmount, 0);

  const totals = calculateCartTotals({
    subtotal,
    itemDiscount,
    orderDiscount,
    taxRate,
    serviceChargeRate,
    tipAmount,
    roundingUnit,
  });

  return {
    subtotal,
    itemDiscount,
    ...totals,
  };
}

export function buildOrderItemsPayload(items: CartItem[]) {
  return items.map((item) => {
    const modifiersTotal = item.modifiers.reduce((sum, modifier) => sum + modifier.priceDelta, 0);
    const lineTotal = Math.max(
      0,
      (item.unitPrice + modifiersTotal) * item.quantity - item.discountAmount,
    );

    return {
      productId: item.productId,
      productName: item.productName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      discountAmount: item.discountAmount,
      lineTotal,
      note: item.note,
      modifiers: item.modifiers,
    };
  });
}
