"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";

/** The navigation menu on screens too narrow for the header links. */
export function MobileMenu({ links }) {
  const [open, setOpen] = useState(false);

  // Escape closes the menu.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
        className="grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition-colors duration-300 hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
      >
        {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
      </button>

      <div
        id="mobile-menu"
        inert={!open}
        className={cn(
          "absolute inset-x-3 top-[calc(100%+0.5rem)] origin-top rounded-3xl border border-white/[0.08] bg-[hsl(240_8%_6%/0.92)] p-2 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.9)] backdrop-blur-xl transition-[opacity,transform,visibility] duration-500 ease-out-expo sm:inset-x-4",
          open ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-2 scale-[0.98] opacity-0"
        )}
      >
        <nav aria-label="Mobile">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-2xl px-4 py-3 text-[15px] text-foreground/85 transition-colors duration-300 hover:bg-white/[0.05] hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/sign-in"
            onClick={() => setOpen(false)}
            className="block rounded-2xl px-4 py-3 text-[15px] text-muted-foreground transition-colors duration-300 hover:bg-white/[0.05] hover:text-foreground sm:hidden"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </div>
  );
}
