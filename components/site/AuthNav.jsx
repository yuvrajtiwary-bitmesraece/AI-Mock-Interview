"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The header buttons on public pages. They are decided in the browser, so the
 * public pages stay static: checking the session on the server would render
 * every visit on demand. Until Clerk loads, the signed-out buttons show.
 */
export function AuthNav() {
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && isSignedIn) {
    return (
      <Button asChild size="sm" className="h-9 px-4">
        <Link href="/dashboard">
          Dashboard <ArrowRight />
        </Link>
      </Button>
    );
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="hidden h-9 px-4 sm:inline-flex">
        <Link href="/sign-in">Sign in</Link>
      </Button>
      <Button asChild size="sm" className="h-9 px-4">
        <Link href="/sign-up">
          Get started <ArrowRight />
        </Link>
      </Button>
    </>
  );
}
