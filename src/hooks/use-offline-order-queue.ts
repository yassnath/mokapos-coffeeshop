"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const OFFLINE_QUEUE_KEY = "solvix-offline-orders";
const OFFLINE_QUEUE_EVENT = "solvix-offline-orders-changed";

type SyncFn<T> = (payload: T) => Promise<unknown>;
type FlushResult = {
  processed: number;
  remaining: number;
  failed: number;
  discarded: number;
  lastError?: string;
};

function readQueue<T>() {
  if (typeof window === "undefined") return [] as T[];

  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [] as T[];
    return JSON.parse(raw) as T[];
  } catch {
    return [] as T[];
  }
}

function writeQueue<T>(items: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(OFFLINE_QUEUE_EVENT));
}

function subscribeQueueCount(callback: () => void) {
  const onStorage = (event: Event) => {
    if (event instanceof StorageEvent && event.key && event.key !== OFFLINE_QUEUE_KEY) return;
    callback();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(OFFLINE_QUEUE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(OFFLINE_QUEUE_EVENT, callback);
  };
}

export function useOfflineOrderQueue<T>(syncFn: SyncFn<T>) {
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const queuedCount = useSyncExternalStore(
    subscribeQueueCount,
    () => readQueue<T>().length,
    () => 0,
  );

  const enqueue = useCallback((payload: T) => {
    const queue = readQueue<T>();
    queue.push(payload);
    writeQueue(queue);
    setLastSyncError(null);
  }, []);

  const flush = useCallback(async (): Promise<FlushResult> => {
    const queue = readQueue<T>();
    if (!queue.length) {
      setLastSyncError(null);
      return {
        processed: 0,
        remaining: 0,
        failed: 0,
        discarded: 0,
      };
    }

    const remaining: T[] = [];
    let lastError: string | undefined;
    let discarded = 0;

    for (const item of queue) {
      try {
        await syncFn(item);
      } catch (error) {
        const syncError = error as Error & { retryable?: boolean };
        const retryable = syncError.retryable ?? true;

        if (retryable) {
          remaining.push(item);
        } else {
          discarded += 1;
        }

        lastError = syncError.message || "Failed to sync queued order";
      }
    }

    writeQueue(remaining);
    setLastSyncError(
      remaining.length || discarded ? (lastError ?? "Failed to sync queued order") : null,
    );

    return {
      processed: queue.length - remaining.length - discarded,
      remaining: remaining.length,
      failed: remaining.length + discarded,
      discarded,
      lastError,
    };
  }, [syncFn]);

  const clearQueue = useCallback(() => {
    writeQueue<T>([]);
    setLastSyncError(null);
  }, []);

  useEffect(() => {
    const onOnline = () => {
      flush().catch(() => undefined);
    };

    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flush]);

  return {
    queuedCount,
    enqueue,
    flush,
    clearQueue,
    lastSyncError,
  };
}
