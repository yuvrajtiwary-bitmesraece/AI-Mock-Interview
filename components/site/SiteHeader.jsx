import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

import { AuthNav } from "./AuthNav";

const LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#features", label: "Features" },
  // Only from lg up: on tablets, five links don't fit beside the logo and buttons.
  { href: "/#coding-round", label: "Coding round", wide: true },
  { href: "/#plans", label: "Plans", wide: true },
  { href: "/#faq", label: "FAQ" },
];

/** Top bar for the public pages (landing, privacy, terms). */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-background/70 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Logo priority className="[&>span]:max-[400px]:hidden" />

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${link.wide ? "hidden lg:block" : ""} whitespace-nowrap rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <AuthNav />
        </div>
      </div>
    </header>
  );
}
