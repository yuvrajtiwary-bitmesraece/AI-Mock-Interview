"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

import { ErrorScreen } from "@/components/site/ErrorScreen";
import { Button } from "@/components/ui/button";

/**
 * Shown when a dashboard page throws. It sits inside the dashboard layout, so
 * the header stays and every other page is still one click away.
 */
export default function DashboardError({ error, reset }) {
  return (
    <ErrorScreen error={error} reset={reset}>
      <Button asChild variant="glass" size="lg">
        <Link href="/dashboard">
          <LayoutDashboard /> Dashboard
        </Link>
      </Button>
    </ErrorScreen>
  );
}
