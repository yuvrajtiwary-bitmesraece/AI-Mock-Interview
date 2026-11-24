"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(onChange) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * A small notice while the connection is down, so a slow or failed click is
 * explained instead of looking broken. Unsent answers are kept as drafts
 * (lib/drafts.js), so nothing is lost while offline.
 */
export function OfflineNotice() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;

  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4 print:hidden">
      <p className="flex items-center gap-2 rounded-full border border-amber-300/25 bg-[#17130b] px-4 py-2 text-sm text-amber-100 shadow-[0_12px_32px_-12px_rgb(0_0_0/0.9)]">
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
        You&apos;re offline. Unsent answers are kept; reconnect to continue.
      </p>
    </div>
  );
}
