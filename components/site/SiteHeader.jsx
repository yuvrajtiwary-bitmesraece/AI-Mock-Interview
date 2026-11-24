import Link from "next/link";

import { Logo } from "@/components/brand/Logo";

import { AuthNav } from "./AuthNav";
import { MobileMenu } from "./MobileMenu";

export const NAV_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#coding-round", label: "Coding round" },
  { href: "/#plans", label: "Plans" },
  { href: "/#faq", label: "FAQ" },
];

/**
 * Top bar for the public pages: a floating pill. It is nearly opaque instead
 * of blurring what's behind it: a backdrop blur has to be recomputed on every
 * frame while the page scrolls.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 rounded-full border border-white/[0.08] bg-[hsl(240_8%_6%/0.9)] pl-4 pr-2 shadow-[0_12px_40px_-16px_rgb(0_0_0/0.9)] sm:pl-5">
        <Logo />

        <nav aria-label="Main" className="hidden items-center lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-full px-3.5 py-2 text-[13.5px] text-muted-foreground transition-colors duration-300 hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <AuthNav />
          <MobileMenu links={NAV_LINKS} />
        </div>
      </div>
    </header>
  );
}
