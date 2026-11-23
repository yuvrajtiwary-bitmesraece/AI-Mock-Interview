"use client";

import { useEffect } from "react";
import Link from "next/link";
import { LayoutDashboard, RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Shown when a page throws while rendering. `reset` renders the page again. */
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="flex min-h-[70dvh] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-amber-300/25 bg-amber-300/10">
        <TriangleAlert className="h-6 w-6 text-amber-200" aria-hidden="true" />
      </div>
      <h1 className="mt-7 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Something went wrong</h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        An unexpected error stopped this page from loading. Your saved interviews are safe. Try again, or head back to the dashboard.
      </p>
      {error?.digest && <p className="mt-3 font-mono text-xs text-muted-foreground">Error ID: {error.digest}</p>}
      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={() => reset()}>
          <RotateCcw /> Try again
        </Button>
        <Button asChild variant="glass" size="lg">
          <Link href="/dashboard">
            <LayoutDashboard /> Dashboard
          </Link>
        </Button>
      </div>
    </main>
  );
}
