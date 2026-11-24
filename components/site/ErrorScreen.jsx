"use client";

import { startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

// A script file of the previous version is gone after the site was updated.
const STALE_FILE = /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;
const RELOAD_KEY = "error-screen:reloaded-at";

/** Reloads the page once for a stale-file error; not again within a minute, so it can't loop. */
function reloadForStaleFile(error) {
  if (!STALE_FILE.test(`${error?.name ?? ""} ${error?.message ?? ""}`)) return false;
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_KEY));
    if (Date.now() - last < 60_000) return false;
    window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

/**
 * What a page shows instead of crashing (app/error.jsx, app/dashboard/error.jsx).
 * "Try again" fetches the page's data again before rendering it, which fixes
 * the usual causes: a dropped connection or a busy database.
 */
export function ErrorScreen({ error, reset, children }) {
  const router = useRouter();

  useEffect(() => {
    if (!reloadForStaleFile(error)) console.error(error);
  }, [error]);

  const retry = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-amber-300/25 bg-amber-300/10">
        <TriangleAlert className="h-6 w-6 text-amber-200" aria-hidden="true" />
      </div>
      <h1 className="mt-7 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Something went wrong</h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        This page didn&apos;t load properly. Your saved interviews and unsent answers are safe. Try again, or go somewhere else.
      </p>
      {error?.digest && <p className="mt-3 font-mono text-xs text-muted-foreground">Error ID: {error.digest}</p>}
      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={retry}>
          <RotateCcw /> Try again
        </Button>
        {children}
      </div>
    </div>
  );
}
