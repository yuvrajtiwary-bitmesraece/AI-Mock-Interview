"use client";

import { useSyncExternalStore } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

import { AppLink } from "./AppLink";

const subscribe = () => () => {};

// Clerk keeps a "__client_uat" cookie (or a suffixed copy, "__client_uat_<id>")
// on this site's own domain: a timestamp while someone is signed in, 0 after
// they sign out. Reading it avoids loading Clerk on public pages.
const SIGNED_IN_COOKIE = /(?:^|;\s*)__client_uat(?:_[^=;]*)?=[1-9]/;
const readSignedIn = () => SIGNED_IN_COOKIE.test(document.cookie);

/**
 * The header buttons on public pages. They are decided in the browser, so the
 * public pages stay static: checking the session on the server would render
 * every visit on demand. If the cookie is ever missing, the signed-out buttons
 * show, and signing in from there still lands on the dashboard.
 */
export function AuthNav() {
  const signedIn = useSyncExternalStore(subscribe, readSignedIn, () => false);

  if (signedIn) {
    return (
      <Button asChild size="sm" className="h-9 px-4">
        <AppLink href="/dashboard">
          Dashboard <ArrowRight />
        </AppLink>
      </Button>
    );
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="hidden h-9 px-4 sm:inline-flex">
        <AppLink href="/sign-in">Sign in</AppLink>
      </Button>
      <Button asChild size="sm" className="h-9 px-4">
        <AppLink href="/sign-up">
          Get started <ArrowRight />
        </AppLink>
      </Button>
    </>
  );
}
