"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Clock, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn, formatDateTime } from "@/lib/utils";

type KdsOrder = {
  id: string;
  orderNumber: string;
  status: "NEW" | "IN_PROGRESS" | "READY" | "COMPLETED" | "VOIDED" | "REFUNDED";
  placedAt: string;
  notes?: string | null;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    note?: string | null;
    modifiers: Array<{
      id: string;
      modifierGroupName: string;
      modifierOptionName: string;
    }>;
  }>;
};

type Props = {
  storeId: string;
};

type KdsColumnStatus = "NEW" | "IN_PROGRESS" | "READY";

const columns: Array<{ key: KdsColumnStatus; title: string }> = [
  { key: "NEW", title: "New" },
  { key: "IN_PROGRESS", title: "In Progress" },
  { key: "READY", title: "Ready" },
];

function beep() {
  const ctx = new AudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.value = 0.08;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.15);
}

export function KdsBoard({ storeId }: Props) {
  const queryClient = useQueryClient();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const previousOrderCount = useRef(0);

  const ordersQuery = useQuery<{ orders: KdsOrder[] }>({
    queryKey: ["orders-kds", storeId],
    queryFn: async () => {
      const response = await fetch(`/api/orders?storeId=${storeId}&status=NEW,IN_PROGRESS,READY`);
      if (!response.ok) throw new Error("Failed to fetch KDS orders");
      return response.json();
    },
    refetchInterval: 20_000,
  });

  const updateStatus = useMutation({
    mutationFn: async (payload: { id: string; status: KdsOrder["status"] }) => {
      const response = await fetch(`/api/orders/${payload.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: payload.status }),
      });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.error ?? "Failed status update");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders-kds", storeId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    const eventSource = new EventSource("/api/orders/events");

    eventSource.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { type: string };
      queryClient.invalidateQueries({ queryKey: ["orders-kds", storeId] });

      if (payload.type === "order.created" && soundEnabled) {
        beep();
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [queryClient, storeId, soundEnabled]);

  useEffect(() => {
    if (!ordersQuery.data?.orders) return;
    const newOrders = ordersQuery.data.orders.filter((order) => order.status === "NEW").length;
    if (soundEnabled && newOrders > previousOrderCount.current && previousOrderCount.current > 0) {
      beep();
    }
    previousOrderCount.current = newOrders;
  }, [ordersQuery.data?.orders, soundEnabled]);

  const groupedOrders = useMemo(() => {
    const source = ordersQuery.data?.orders ?? [];
    const grouped: Record<KdsColumnStatus, KdsOrder[]> = {
      NEW: source.filter((order) => order.status === "NEW"),
      IN_PROGRESS: source.filter((order) => order.status === "IN_PROGRESS"),
      READY: source.filter((order) => order.status === "READY"),
    };
    return grouped;
  }, [ordersQuery.data?.orders]);

  return (
    <main className="min-h-[calc(100vh-4rem)] p-4 sm:p-6">
      <div className="border-border bg-card mb-4 flex items-center justify-between rounded-2xl border p-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Kitchen Display System</h1>
          <p className="text-sm text-neutral-500">Live queue for barista and kitchen staff.</p>
        </div>
        <div className="flex items-center gap-2">
          {soundEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          <Switch
            checked={soundEnabled}
            onCheckedChange={setSoundEnabled}
            aria-label="Toggle sound alert"
          />
        </div>
      </div>

      {ordersQuery.isLoading ? (
        <div className="flex h-40 items-center justify-center text-sm text-neutral-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading orders...
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {columns.map((column) => (
            <section key={column.key} className="border-border bg-card rounded-3xl border p-3">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold">{column.title}</h2>
                <Badge variant="secondary">{groupedOrders[column.key].length}</Badge>
              </div>

              <div className="space-y-3">
                {groupedOrders[column.key].length === 0 && (
                  <div className="border-border rounded-xl border border-dashed p-4 text-center text-sm text-neutral-500">
                    No orders
                  </div>
                )}

                {groupedOrders[column.key].map((order) => (
                  <Card
                    key={order.id}
                    className={cn("rounded-2xl", order.status === "NEW" && "ring-accent ring-1")}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{order.orderNumber}</CardTitle>
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDateTime(order.placedAt)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="bg-muted rounded-xl p-2 text-sm">
                          <div className="flex justify-between">
                            <span>{item.productName}</span>
                            <span>x{item.quantity}</span>
                          </div>
                          {!!item.modifiers.length && (
                            <div className="text-xs text-neutral-500">
                              {item.modifiers
                                .map((modifier) => modifier.modifierOptionName)
                                .join(" • ")}
                            </div>
                          )}
                          {item.note && (
                            <div className="text-primary text-xs">Note: {item.note}</div>
                          )}
                        </div>
                      ))}

                      {order.notes && (
                        <div className="text-xs text-neutral-500">Order note: {order.notes}</div>
                      )}

                      <div className="pt-1">
                        {order.status === "NEW" && (
                          <Button
                            className="w-full"
                            onClick={() =>
                              updateStatus.mutate({ id: order.id, status: "IN_PROGRESS" })
                            }
                          >
                            Start
                          </Button>
                        )}
                        {order.status === "IN_PROGRESS" && (
                          <Button
                            className="w-full"
                            onClick={() => updateStatus.mutate({ id: order.id, status: "READY" })}
                          >
                            Mark Ready
                          </Button>
                        )}
                        {order.status === "READY" && (
                          <Button
                            className="w-full"
                            onClick={() =>
                              updateStatus.mutate({ id: order.id, status: "COMPLETED" })
                            }
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
