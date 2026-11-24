import Link from "next/link";
import { ArrowLeft, LayoutDashboard } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { AppLink } from "@/components/site/AppLink";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main id="main" className="relative flex min-h-dvh flex-col items-center justify-center overflow-clip px-6 py-16 text-center">
      <div aria-hidden="true" className="bg-dots absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_65%)]" />
      <Logo className="relative mb-14" />
      <p className="relative font-serif text-[7rem] italic leading-none text-ember sm:text-[9rem]">404</p>
      <h1 className="relative mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">This page doesn&apos;t exist</h1>
      <p className="relative mt-4 max-w-md text-muted-foreground">
        The link may be broken, or the interview was deleted or belongs to a different account.
      </p>
      <div className="relative mt-10 flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <AppLink href="/dashboard">
            <LayoutDashboard /> Go to dashboard
          </AppLink>
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
