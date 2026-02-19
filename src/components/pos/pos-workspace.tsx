"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  Search,
  Trash2,
  WifiOff,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { cn, formatCurrency } from "@/lib/utils";
import {
  buildOrderItemsPayload,
  type CartPaymentMethod,
  useCartTotals,
  usePosStore,
} from "@/store/pos-store";
import type { PosCategory, PosProduct } from "@/types/pos";

type Props = {
  storeId: string;
  registerId: string;
  initialShiftId?: string;
  userRole: "ADMIN" | "MANAGER" | "CASHIER" | "BARISTA";
};

type SettingsPayload = {
  settings: { taxRate: number; serviceChargeRate: number; roundingUnit: number };
};
type ProductPayload = { products: PosProduct[] };
type CategoryPayload = { categories: PosCategory[] };
type ReceiptPayload = {
  order: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    items: Array<{
      id: string;
      productName: string;
      quantity: number;
      modifiers: Array<{ modifierOptionName: string }>;
    }>;
  };
};

type ModifierMap = Record<string, string[]>;

const PAYMENT_METHODS: CartPaymentMethod[] = ["CASH", "CARD", "QRIS", "EWALLET"];

function formatSignedCurrency(amount: number) {
  if (Math.abs(amount) <= 1) return formatCurrency(0);
  if (amount > 0) return `+${formatCurrency(amount)}`;
  return `-${formatCurrency(Math.abs(amount))}`;
}

export function PosWorkspace({ storeId, registerId, initialShiftId, userRole }: Props) {
  const canDiscount = userRole === "ADMIN" || userRole === "MANAGER";
  const isOnline = useOnlineStatus();

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [modifierProduct, setModifierProduct] = useState<PosProduct | null>(null);
  const [modifierMap, setModifierMap] = useState<ModifierMap>({});
  const [modifierNote, setModifierNote] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptPayload["order"] | null>(null);
  const [selectedOrderItem, setSelectedOrderItem] = useState<string | null>(null);
  const [openingCash, setOpeningCash] = useState(0);
  const [shiftId, setShiftId] = useState<string | undefined>(initialShiftId);

  const searchRef = useRef<HTMLInputElement>(null);

  const items = usePosStore((s) => s.items);
  const orderNote = usePosStore((s) => s.orderNote);
  const orderDiscount = usePosStore((s) => s.orderDiscount);
  const tipAmount = usePosStore((s) => s.tipAmount);
  const paymentSplits = usePosStore((s) => s.paymentSplits);
  const setRates = usePosStore((s) => s.setRates);
  const addItem = usePosStore((s) => s.addItem);
  const increment = usePosStore((s) => s.increment);
  const decrement = usePosStore((s) => s.decrement);
  const removeItem = usePosStore((s) => s.removeItem);
  const setItemNote = usePosStore((s) => s.setItemNote);
  const setItemDiscount = usePosStore((s) => s.setItemDiscount);
  const setOrderDiscount = usePosStore((s) => s.setOrderDiscount);
  const setTipAmount = usePosStore((s) => s.setTipAmount);
  const setOrderNote = usePosStore((s) => s.setOrderNote);
  const setPaymentSplits = usePosStore((s) => s.setPaymentSplits);
  const resetCart = usePosStore((s) => s.resetCart);

  const totals = useCartTotals();

  const categories = useQuery<CategoryPayload>({
    queryKey: ["pos-categories", storeId],
    queryFn: async () => (await fetch(`/api/categories?storeId=${storeId}`)).json(),
  });
  const posCategories = useMemo(
    () =>
      (categories.data?.categories ?? []).filter(
        (category) => category.name.trim() !== "Tea & Matcha",
      ),
    [categories.data?.categories],
  );
  const effectiveCategoryId = useMemo(
    () =>
      categoryId && posCategories.some((category) => category.id === categoryId)
        ? categoryId
        : undefined,
    [categoryId, posCategories],
  );

  const products = useQuery<ProductPayload>({
    queryKey: ["pos-products", storeId, search, effectiveCategoryId, favoritesOnly],
    queryFn: async () => {
      const params = new URLSearchParams({ storeId });
      if (search) params.set("q", search);
      if (effectiveCategoryId) params.set("categoryId", effectiveCategoryId);
      if (favoritesOnly) params.set("favorites", "1");
      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) throw new Error("Failed products");
      return response.json();
    },
  });

  const settings = useQuery<SettingsPayload>({
    queryKey: ["store-settings", storeId],
    queryFn: async () => (await fetch(`/api/settings?storeId=${storeId}`)).json(),
  });

  useEffect(() => {
    if (!settings.data?.settings) return;
    setRates({
      taxRate: settings.data.settings.taxRate,
      serviceChargeRate: settings.data.settings.serviceChargeRate,
      roundingUnit: settings.data.settings.roundingUnit,
    });
  }, [settings.data?.settings, setRates]);

  const postOrder = async (payload: unknown) => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);

    let response: Response;
    try {
      response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (fetchError) {
      const error = new Error(
        fetchError instanceof DOMException && fetchError.name === "AbortError"
          ? "Sync timeout. Coba lagi."
          : "Network error while sending order",
      ) as Error & { status?: number; retryable?: boolean };
      error.retryable = true;
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }

    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      const detail = typeof json.detail === "string" ? ` (${json.detail})` : "";
      const message = (typeof json.error === "string" ? json.error : "Submit failed") + detail;
      const error = new Error(message) as Error & { status?: number; retryable?: boolean };
      error.status = response.status;
      error.retryable = response.status >= 500 || response.status === 429;
      throw error;
    }

    return (await response.json()) as ReceiptPayload;
  };

  const submitOrder = useMutation({
    mutationFn: postOrder,
    onSuccess: (data) => {
      setReceipt(data.order);
      resetCart();
      setPaymentDialogOpen(false);
      toast.success(`Order ${data.order.orderNumber} submitted`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openShift = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/shifts/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, registerId, openingCash }),
      });
      if (!response.ok) throw new Error("Failed to open shift");
      return (await response.json()) as { shift: { id: string } };
    },
    onSuccess: (data) => {
      setShiftId(data.shift.id);
      toast.success("Shift opened");
    },
  });

  const productList = products.data?.products ?? [];
  const stockBadgeClass = (stockValue?: number) => {
    const stock = typeof stockValue === "number" ? stockValue : 0;
    if (stock <= 0) return "border-red-200 bg-red-100 text-red-800";
    if (stock <= 50) return "border-amber-200 bg-amber-100 text-amber-800";
    return "border-green-200 bg-green-100 text-green-800";
  };
  const categoryBadgeClass = (categoryName?: string | null) => {
    const name = (categoryName ?? "").toLowerCase();
    if (name.includes("non-coffee") || name.includes("tea") || name.includes("matcha")) {
      return "border-sky-200 bg-sky-100 text-sky-800";
    }
    if (name.includes("pastry")) return "border-amber-200 bg-amber-100 text-amber-800";
    if (name.includes("coffee")) return "border-[#6F4E37]/35 bg-[#DDB892]/35 text-[#6F4E37]";
    return "border-gray-200 bg-gray-100 text-gray-600";
  };

  const paidTotal = paymentSplits.reduce((sum, split) => sum + split.amount, 0);
  const cashPaidTotal = paymentSplits
    .filter((split) => split.method === "CASH")
    .reduce((sum, split) => sum + split.amount, 0);
  const nonCashPaidTotal = paidTotal - cashPaidTotal;
  const hasCashPayment = paymentSplits.some((split) => split.method === "CASH");
  const isSplitPayment = paymentSplits.length > 1;
  const balance = paidTotal - totals.totalAmount;
  const isNonCashOverTotal = hasCashPayment && nonCashPaidTotal - totals.totalAmount > 1;
  const balanceClassName = !hasCashPayment
    ? Math.abs(balance) <= 1
      ? "text-success"
      : "text-danger"
    : isNonCashOverTotal || balance < -1
      ? "text-danger"
      : "text-success";

  const addProduct = (product: PosProduct) => {
    if (!product.modifierGroups.length) {
      addItem({
        productId: product.id,
        productName: product.name,
        unitPrice: product.basePrice,
        quantity: 1,
        discountAmount: 0,
        modifiers: [],
      });
      return;
    }

    setModifierProduct(product);
    setModifierMap({});
    setModifierNote("");
  };

  const confirmModifier = () => {
    if (!modifierProduct) return;

    const hasMissingRequired = modifierProduct.modifierGroups.some(
      (group) => group.required && !modifierMap[group.id]?.length,
    );

    if (hasMissingRequired) {
      toast.error("Please select required modifiers");
      return;
    }

    const modifiers = modifierProduct.modifierGroups.flatMap((group) =>
      group.options
        .filter((option) => (modifierMap[group.id] ?? []).includes(option.id))
        .map((option) => ({
          optionId: option.id,
          modifierGroupName: group.name,
          modifierOptionName: option.name,
          priceDelta: option.priceDelta,
        })),
    );

    addItem({
      productId: modifierProduct.id,
      productName: modifierProduct.name,
      unitPrice: modifierProduct.basePrice,
      quantity: 1,
      discountAmount: 0,
      note: modifierNote,
      modifiers,
    });

    setModifierProduct(null);
  };

  const charge = useCallback(async () => {
    if (!shiftId) {
      toast.error("Open shift first");
      return;
    }

    if (!items.length) {
      toast.error("Order is empty");
      return;
    }

    if (paymentSplits.some((split) => split.amount <= 0)) {
      toast.error("Nominal payment harus diisi");
      return;
    }

    if (!hasCashPayment && Math.abs(balance) > 1) {
      toast.error("Non-cash harus sama dengan total");
      return;
    }

    if (hasCashPayment && nonCashPaidTotal - totals.totalAmount > 1) {
      toast.error("Nominal non-cash melebihi total");
      return;
    }

    if (hasCashPayment && balance < -1) {
      toast.error("Nominal cash kurang dari total");
      return;
    }

    const normalizedPayments = (() => {
      if (!hasCashPayment) return paymentSplits;

      let remainingCashNeeded = Math.max(0, totals.totalAmount - nonCashPaidTotal);

      return paymentSplits
        .map((split) => {
          if (split.method !== "CASH") return split;

          const appliedAmount = Math.min(split.amount, remainingCashNeeded);
          remainingCashNeeded = Math.max(0, remainingCashNeeded - appliedAmount);
          return {
            ...split,
            amount: appliedAmount,
          };
        })
        .filter((split) => split.amount > 0);
    })();

    if (!normalizedPayments.length) {
      toast.error("Payment tidak valid");
      return;
    }

    const payload = {
      storeId,
      registerId,
      shiftId,
      notes: orderNote,
      subtotal: totals.subtotal,
      itemDiscount: totals.itemDiscount,
      orderDiscount,
      taxAmount: totals.taxAmount,
      serviceChargeAmount: totals.serviceChargeAmount,
      tipAmount,
      roundingAmount: totals.roundingAmount,
      totalAmount: totals.totalAmount,
      items: buildOrderItemsPayload(items),
      payments: normalizedPayments.map((split) => ({
        method: split.method,
        amount: split.amount,
        reference: split.reference,
      })),
    };

    if (!isOnline) {
      toast.error("Tidak ada koneksi internet. Order tidak bisa dikirim.");
      return;
    }

    try {
      await submitOrder.mutateAsync(payload);
    } catch {
      // handled by React Query onError toast
    }
  }, [
    shiftId,
    items,
    balance,
    storeId,
    registerId,
    orderNote,
    totals.subtotal,
    totals.itemDiscount,
    totals.taxAmount,
    totals.serviceChargeAmount,
    totals.roundingAmount,
    totals.totalAmount,
    orderDiscount,
    tipAmount,
    paymentSplits,
    hasCashPayment,
    nonCashPaidTotal,
    isOnline,
    submitOrder,
  ]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }

      if (event.altKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        if (!paymentDialogOpen) {
          if (!items.length) {
            toast.error("Order is empty");
            return;
          }
          setPaymentDialogOpen(true);
          return;
        }
        void charge();
      }

      if ((event.key === "+" || event.key === "=") && selectedOrderItem) {
        increment(selectedOrderItem);
      }

      if ((event.key === "-" || event.key === "_") && selectedOrderItem) {
        decrement(selectedOrderItem);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [charge, decrement, increment, items.length, paymentDialogOpen, selectedOrderItem]);

  return (
    <main className="h-[calc(100vh-4rem)] overflow-hidden p-3 sm:p-4">
      <div className="grid h-full gap-3 lg:grid-cols-[2fr_1fr]">
        <section className="flex h-full min-h-0 flex-col overflow-hidden">
          {!isOnline && (
            <div className="border-warning/40 bg-warning/10 text-warning mb-3 flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm">
              <WifiOff className="h-4 w-4" />
              Offline mode: order tidak bisa dikirim ke kitchen.
            </div>
          )}

          <Card className="border-border bg-card min-h-0 flex-1 overflow-hidden rounded-3xl">
            <CardContent className="grid h-full w-full min-w-0 grid-rows-[auto_1fr] gap-3 p-4">
              <div className="grid w-full gap-2 md:grid-cols-[1fr_auto_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                  <Input
                    ref={searchRef}
                    className="pl-9"
                    placeholder="Cari menu (Ctrl+K)"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>

                <Button
                  variant={favoritesOnly ? "default" : "outline"}
                  onClick={() => setFavoritesOnly((prev) => !prev)}
                >
                  Favorites
                </Button>

                <Select
                  value={effectiveCategoryId ?? "all"}
                  onValueChange={(value) => setCategoryId(value === "all" ? undefined : value)}
                >
                  <SelectTrigger className="min-w-40">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {posCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-border h-full w-full overflow-y-auto rounded-2xl border bg-white p-3">
                {products.isLoading ? (
                  <div className="grid w-full grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-4">
                    {Array.from({ length: 12 }).map((_, index) => (
                      <Skeleton key={index} className="h-36 rounded-2xl" />
                    ))}
                  </div>
                ) : productList.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                    Tidak ada produk
                  </div>
                ) : (
                  <div className="grid w-full grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-4">
                    {productList.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addProduct(product)}
                        className="group border-border bg-background hover:border-primary w-full overflow-hidden rounded-2xl border text-left transition hover:shadow-sm"
                      >
                        <div className="bg-muted relative h-32 w-full">
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              fill
                              sizes="220px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-neutral-500">
                              No image
                            </div>
                          )}
                          <span
                            className={cn(
                              "absolute right-2 bottom-2 rounded-full border px-2 py-0.5 text-[11px] font-semibold shadow-sm",
                              stockBadgeClass(product.stock),
                            )}
                          >
                            Stok: {product.stock ?? 0}
                          </span>
                        </div>
                        <div className="p-2">
                          <div className="line-clamp-2 text-[13px] leading-snug font-semibold">
                            {product.name}
                          </div>
                          <div className="-mt-0.5 mb-1.5">
                            <span
                              className={cn(
                                "inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[10px] leading-tight font-medium",
                                categoryBadgeClass(product.categoryName),
                              )}
                            >
                              <span className="line-clamp-1">{product.categoryName ?? "-"}</span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-0.5">
                            <span className="text-xs font-semibold sm:text-sm">
                              {formatCurrency(product.basePrice)}
                            </span>
                            <span className="bg-primary inline-flex h-6 w-6 items-center justify-center rounded-full text-white transition group-hover:scale-105">
                              <Plus className="h-3 w-3" />
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
          <Card className="border-border bg-card max-h-[calc(100%-3.75rem)] overflow-hidden rounded-3xl transition-all duration-200">
            <div className="flex h-full min-h-0 flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Order Items</CardTitle>
                  <Badge variant="secondary">{items.length} item</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col space-y-2">
                {!shiftId && (
                  <div className="border-warning/40 bg-warning/10 rounded-2xl border p-2 text-sm">
                    <div className="mb-2 font-medium">Shift is closed</div>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={0}
                        value={openingCash}
                        onChange={(event) => setOpeningCash(Number(event.target.value) || 0)}
                        placeholder="Opening cash"
                      />
                      <Button onClick={() => openShift.mutate()} disabled={openShift.isPending}>
                        {openShift.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Open"
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 pb-2">
                  {items.length === 0 ? (
                    <div className="border-border rounded-xl border border-dashed p-3 text-sm text-neutral-500">
                      Belum ada item.
                    </div>
                  ) : (
                    items.map((item) => (
                      <article
                        key={item.id}
                        onClick={() => setSelectedOrderItem(item.id)}
                        className={cn(
                          "border-border rounded-2xl border bg-white p-3",
                          selectedOrderItem === item.id && "border-primary",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium">{item.productName}</div>
                            {!!item.modifiers.length && (
                              <div className="text-xs text-neutral-500">
                                {item.modifiers
                                  .map((modifier) => modifier.modifierOptionName)
                                  .join(" • ")}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-danger hover:text-danger hover:bg-danger/10"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <Button variant="outline" size="icon" onClick={() => decrement(item.id)}>
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="min-w-8 text-center font-medium">{item.quantity}</span>
                          <Button variant="outline" size="icon" onClick={() => increment(item.id)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                          <span className="ml-auto text-sm font-semibold">
                            {formatCurrency(item.unitPrice)}
                          </span>
                        </div>

                        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_100px]">
                          <Input
                            placeholder="Item note"
                            value={item.note ?? ""}
                            onChange={(event) => setItemNote(item.id, event.target.value)}
                          />
                          <Input
                            type="number"
                            min={0}
                            disabled={!canDiscount}
                            placeholder="Disc"
                            value={item.discountAmount}
                            onChange={(event) =>
                              setItemDiscount(item.id, Number(event.target.value) || 0)
                            }
                          />
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </CardContent>
            </div>
          </Card>

          <Button
            className="mt-auto h-12 w-full shrink-0 text-base font-semibold"
            disabled={!shiftId || !items.length}
            onClick={() => setPaymentDialogOpen(true)}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Continue to Payment
          </Button>
        </section>
      </div>
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment & Order Summary</DialogTitle>
            <DialogDescription>Lengkapi payment, tip, diskon, dan order note.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-3">
              <div>
                <Label htmlFor="order-note">Order Note</Label>
                <Textarea
                  id="order-note"
                  className="min-h-[96px]"
                  placeholder="Catatan pesanan"
                  value={orderNote ?? ""}
                  onChange={(event) => setOrderNote(event.target.value)}
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label htmlFor="order-disc">Order Discount</Label>
                  <Input
                    id="order-disc"
                    type="number"
                    min={0}
                    disabled={!canDiscount}
                    value={orderDiscount}
                    onChange={(event) => setOrderDiscount(Number(event.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="tip">Tip</Label>
                  <Input
                    id="tip"
                    type="number"
                    min={0}
                    value={tipAmount}
                    onChange={(event) => setTipAmount(Number(event.target.value) || 0)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{isSplitPayment ? "Split Payment" : "Payment"}</Label>
                  <div className="flex items-center gap-2">
                    {isSplitPayment && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const [first] = paymentSplits;
                          if (!first) return;
                          setPaymentSplits([
                            {
                              ...first,
                              amount: paymentSplits.reduce((sum, split) => sum + split.amount, 0),
                            },
                          ]);
                        }}
                      >
                        Single Mode
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPaymentSplits([
                          ...paymentSplits,
                          { id: crypto.randomUUID(), method: "CARD", amount: 0 },
                        ])
                      }
                    >
                      {isSplitPayment ? "Add Split" : "Use Split"}
                    </Button>
                  </div>
                </div>

                {paymentSplits.map((split) => (
                  <div key={split.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <Select
                      value={split.method}
                      onValueChange={(value) =>
                        setPaymentSplits(
                          paymentSplits.map((item) =>
                            item.id === split.id
                              ? {
                                  ...item,
                                  method: value as CartPaymentMethod,
                                  amount:
                                    paymentSplits.length === 1 && value !== "CASH"
                                      ? totals.totalAmount
                                      : item.amount,
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      min={0}
                      value={split.method === "CASH" && split.amount === 0 ? "" : split.amount}
                      placeholder={split.method === "CASH" ? "Masukkan cash" : "Nominal payment"}
                      onChange={(event) =>
                        setPaymentSplits(
                          paymentSplits.map((item) =>
                            item.id === split.id
                              ? {
                                  ...item,
                                  amount:
                                    event.target.value === ""
                                      ? 0
                                      : Math.max(0, Number(event.target.value) || 0),
                                }
                              : item,
                          ),
                        )
                      }
                    />

                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "text-danger hover:text-danger hover:bg-danger/10",
                        paymentSplits.length === 1 && "pointer-events-none invisible",
                      )}
                      onClick={() =>
                        paymentSplits.length > 1 &&
                        setPaymentSplits(paymentSplits.filter((item) => item.id !== split.id))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <div
                  className={cn(
                    "text-xs font-semibold",
                    balanceClassName,
                  )}
                >
                  Balance: {formatSignedCurrency(balance)}
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const targetIndex = paymentSplits.findIndex((split) => split.method === "CASH");
                    const editableIndex = targetIndex >= 0 ? targetIndex : 0;
                    setPaymentSplits(
                      paymentSplits.map((split, index) => {
                        if (index !== editableIndex) return split;
                        const otherAmount = paymentSplits.reduce(
                          (sum, item, itemIndex) =>
                            itemIndex === editableIndex ? sum : sum + item.amount,
                          0,
                        );
                        return {
                          ...split,
                          amount: Math.max(0, totals.totalAmount - otherAmount),
                        };
                      }),
                    );
                  }}
                >
                  Auto Balance
                </Button>
              </div>
            </div>

            <div className="border-border bg-card space-y-2 rounded-2xl border p-3 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Item discount</span>
                <span>-{formatCurrency(totals.itemDiscount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatCurrency(totals.taxAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Service</span>
                <span>{formatCurrency(totals.serviceChargeAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Rounding</span>
                <span>{formatCurrency(totals.roundingAmount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatCurrency(totals.totalAmount)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Back
            </Button>
            <Button
              disabled={submitOrder.isPending || !items.length || !shiftId}
              onClick={() => void charge()}
            >
              {submitOrder.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Charge (Alt+P)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(modifierProduct)}
        onOpenChange={(open) => !open && setModifierProduct(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modifierProduct?.name}</DialogTitle>
            <DialogDescription>Pilih modifier produk</DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] space-y-3 overflow-auto">
            {modifierProduct?.modifierGroups.map((group) => {
              const selected = modifierMap[group.id] ?? [];
              return (
                <div key={group.id} className="border-border rounded-xl border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h4>{group.name}</h4>
                    {group.required && <Badge variant="secondary">Required</Badge>}
                  </div>
                  <div className="grid gap-2">
                    {group.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={cn(
                          "flex justify-between rounded-lg border px-3 py-2 text-sm",
                          selected.includes(option.id)
                            ? "border-primary/40 bg-primary/10"
                            : "border-neutral-200",
                        )}
                        onClick={() =>
                          setModifierMap((prev) => {
                            const current = prev[group.id] ?? [];
                            if (group.isMulti) {
                              const exists = current.includes(option.id);
                              const next = exists
                                ? current.filter((id) => id !== option.id)
                                : [...current, option.id];
                              return {
                                ...prev,
                                [group.id]: next.slice(0, group.maxSelect || undefined),
                              };
                            }
                            return { ...prev, [group.id]: [option.id] };
                          })
                        }
                      >
                        <span>{option.name}</span>
                        <span>
                          {option.priceDelta > 0
                            ? `+${formatCurrency(option.priceDelta)}`
                            : "Included"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <Textarea
              placeholder="Item note"
              value={modifierNote}
              onChange={(event) => setModifierNote(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModifierProduct(null)}>
              Cancel
            </Button>
            <Button onClick={confirmModifier}>Add to order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(receipt)} onOpenChange={(open) => !open && setReceipt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment successful</DialogTitle>
            <DialogDescription>Order {receipt?.orderNumber}</DialogDescription>
          </DialogHeader>
          {receipt && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <ul className="space-y-2">
                  {receipt.items.map((item) => (
                    <li key={item.id} className="bg-muted rounded-lg p-2">
                      {item.productName} x{item.quantity}
                      <div className="text-xs text-neutral-500">
                        {item.modifiers.map((modifier) => modifier.modifierOptionName).join(" • ")}
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col items-center gap-2">
                  <QRCodeSVG value={receipt.orderNumber} size={88} />
                  <span className="text-xs text-neutral-500">Receipt QR</span>
                </div>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(receipt.totalAmount)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                receipt && window.open(`/receipt/${receipt.id}`, "_blank", "noopener,noreferrer")
              }
            >
              Print
            </Button>
            <Button onClick={() => setReceipt(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!canDiscount && (orderDiscount > 0 || totals.itemDiscount > 0) && (
        <div className="border-danger/40 bg-danger/10 text-danger fixed top-20 right-3 rounded-xl px-3 py-2 text-xs">
          <AlertTriangle className="mr-1 inline h-3 w-3" />
          Discounts require MANAGER/ADMIN access
        </div>
      )}
    </main>
  );
}
