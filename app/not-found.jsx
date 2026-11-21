import Link from "next/link";
import { ArrowLeft, LayoutDashboard } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <Logo className="mb-12" />
      <p className="font-mono text-sm font-semibold text-primary">404</p>
      <h1 className="mt-3 text-4xl font-bold sm:text-5xl">This page doesn&apos;t exist</h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        The link may be broken, or the interview was deleted or belongs to a different account.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button asChild variant="gradient" size="lg">
          <Link href="/dashboard">
            <LayoutDashboard /> Go to dashboard
          </Link>
        </Button>
        <Button asChild variant="glass" size="lg">
          <Link href="/">
            <ArrowLeft /> Back to home
          </Link>
        </Button>
      </div>
    </main>
  );
}
