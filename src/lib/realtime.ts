type RealtimeEventType = "order.created" | "order.updated";

export type RealtimePayload = {
  type: RealtimeEventType;
  orderId: string;
  data?: unknown;
};

type Listener = (payload: RealtimePayload) => void;

class RealtimeBus {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publish(payload: RealtimePayload) {
    for (const listener of this.listeners) {
      try {
        listener(payload);
      } catch (error) {
        console.error("[realtimeBus.publish] listener error", error);
      }
    }
  }
}

const globalBus = globalThis as typeof globalThis & { __solvixBus?: RealtimeBus };

export const realtimeBus = globalBus.__solvixBus ?? new RealtimeBus();

if (!globalBus.__solvixBus) {
  globalBus.__solvixBus = realtimeBus;
}
