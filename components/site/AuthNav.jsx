"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Header buttons for public pages. Decided in the browser, so the public pages
 * can stay static (checking the session on the server would make every
 * visit server-rendered). Signed-out buttons show until Clerk has loaded.
 */
export function AuthNav() {
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && isSignedIn) {
    return (
      <Button asChild variant="gradient" size="sm">
        <Link href="/dashboard">
          Dashboard <ArrowRight />
        </Link>
      </Button>
    );
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
        <Link href="/sign-in">Sign in</Link>
      </Button>
      <Button asChild variant="gradient" size="sm">
        <Link href="/sign-up">
          Get started <ArrowRight />
        </Link>
      </Button>
    </>
  );
}
