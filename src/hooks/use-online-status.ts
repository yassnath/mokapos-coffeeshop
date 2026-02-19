"use client";

import { useSyncExternalStore } from "react";

const ONLINE_EVENT_NAMES = ["online", "offline"] as const;

function subscribeToOnlineStatus(callback: () => void) {
  ONLINE_EVENT_NAMES.forEach((eventName) => window.addEventListener(eventName, callback));
  return () => {
    ONLINE_EVENT_NAMES.forEach((eventName) => window.removeEventListener(eventName, callback));
  };
}

function getOnlineSnapshot() {
  return window.navigator.onLine;
}

export function useOnlineStatus() {
  return useSyncExternalStore(subscribeToOnlineStatus, getOnlineSnapshot, () => true);
}
