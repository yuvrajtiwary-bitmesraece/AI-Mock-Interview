"use client";

import Link from "next/link";
import { House } from "lucide-react";

import { ErrorScreen } from "@/components/site/ErrorScreen";
import { Button } from "@/components/ui/button";

/** Shown when a public page throws while rendering. Dashboard pages have their own (app/dashboard/error.jsx). */
export default function Error({ error, reset }) {
  return (
    <main id="main">
      <ErrorScreen error={error} reset={reset}>
        <Button asChild variant="glass" size="lg">
          <Link href="/">
            <House /> Home
          </Link>
        </Button>
      </ErrorScreen>
    </main>
  );
}
