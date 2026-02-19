"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Loader2, ReceiptText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type HistoryData = {
  selectedDate: string;
  shifts: Array<{
    id: string;
    openedAt: string;
    closedAt?: string | null;
    status: string;
    registerName: string;
  }>;
  summary: {
    totalOrders: number;
    totalSales: number;
  };
  items: Array<{
    productName: string;
    qty: number;
    grossSales: number;
  }>;
  orders: Array<{
    id: string;
    orderNumber: string;
    placedAt: string;
    shiftId?: string | null;
    totalAmount: number;
    items: Array<{
      id: string;
      productName: string;
      quantity: number;
      lineTotal: number;
    }>;
  }>;
};

type Props = {
  storeId: string;
};

function todayValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function HistoryBoard({ storeId }: Props) {
  const [date, setDate] = useState(todayValue);
  const [shiftId, setShiftId] = useState("all");

  const historyQuery = useQuery<HistoryData>({
    queryKey: ["history", storeId, date, shiftId],
    queryFn: async () => {
      const params = new URLSearchParams({ storeId, date });
      if (shiftId !== "all") params.set("shiftId", shiftId);

      const response = await fetch(`/api/history?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch cashier history");
      return response.json();
    },
  });

  const topItems = useMemo(() => historyQuery.data?.items.slice(0, 12) ?? [], [historyQuery.data]);

  return (
    <main className="min-h-[calc(100vh-4rem)] space-y-4 p-4 sm:p-6">
      <Card className="border-border bg-card rounded-3xl">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_220px_220px] md:items-end">
          <div>
            <h1 className="font-display text-2xl font-semibold">Riwayat Penjualan Kasir</h1>
            <p className="text-sm text-neutral-600">
              Lihat produk terjual berdasarkan tanggal dan shift.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Tanggal</label>
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Shift</label>
            <Select value={shiftId} onValueChange={setShiftId}>
              <SelectTrigger>
                <SelectValue placeholder="Semua shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua shift</SelectItem>
                {(historyQuery.data?.shifts ?? []).map((shift) => (
                  <SelectItem key={shift.id} value={shift.id}>
                    {shift.registerName} • {shift.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {historyQuery.isLoading ? (
        <div className="flex h-36 items-center justify-center text-sm text-neutral-600">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading history...
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border bg-card rounded-3xl">
              <CardHeader>
                <CardTitle className="text-base">Total Pesanan</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {historyQuery.data?.summary.totalOrders ?? 0}
              </CardContent>
            </Card>
            <Card className="border-border bg-card rounded-3xl">
              <CardHeader>
                <CardTitle className="text-base">Total Penjualan</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {formatCurrency(historyQuery.data?.summary.totalSales ?? 0)}
              </CardContent>
            </Card>
            <Card className="border-border bg-card rounded-3xl">
              <CardHeader>
                <CardTitle className="text-base">Tanggal Terpilih</CardTitle>
              </CardHeader>
              <CardContent className="text-sm font-medium">
                {historyQuery.data?.selectedDate ?? "-"}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_1.9fr]">
            <Card className="border-border bg-card rounded-3xl">
              <CardHeader>
                <CardTitle className="text-base">Produk Terlaris (Shift/Tanggal)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topItems.length === 0 && (
                  <div className="border-border rounded-2xl border border-dashed p-4 text-sm text-neutral-500">
                    Belum ada transaksi pada filter ini.
                  </div>
                )}
                {topItems.map((item) => (
                  <div
                    key={item.productName}
                    className="border-border flex items-center justify-between rounded-2xl border bg-white p-3"
                  >
                    <div>
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-xs text-neutral-500">
                        {formatCurrency(item.grossSales)}
                      </div>
                    </div>
                    <Badge variant="secondary">{item.qty}x</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border bg-card rounded-3xl">
              <CardHeader>
                <CardTitle className="text-base">Daftar Order</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[56vh] space-y-3 overflow-y-auto pr-1">
                  {(historyQuery.data?.orders ?? []).length === 0 && (
                    <div className="border-border rounded-2xl border border-dashed p-4 text-sm text-neutral-500">
                      Tidak ada order pada periode ini.
                    </div>
                  )}
                  {(historyQuery.data?.orders ?? []).map((order) => (
                    <article
                      key={order.id}
                      className="border-border rounded-2xl border bg-white p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ReceiptText className="text-primary h-4 w-4" />
                          <span className="font-medium">{order.orderNumber}</span>
                        </div>
                        <span className="font-semibold">{formatCurrency(order.totalAmount)}</span>
                      </div>
                      <div className="mb-2 flex items-center gap-2 text-xs text-neutral-500">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDateTime(order.placedAt)}
                      </div>
                      <div className="space-y-1 text-sm">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="bg-muted flex items-center justify-between rounded-lg px-2 py-1"
                          >
                            <span>
                              {item.productName} x{item.quantity}
                            </span>
                            <span>{formatCurrency(item.lineTotal)}</span>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </main>
  );
}
