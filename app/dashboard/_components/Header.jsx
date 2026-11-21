"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { House, LayoutDashboard } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, isActive: (path) => path.startsWith("/dashboard") },
  { name: "Home", href: "/", icon: House, isActive: (path) => path === "/" },
];

function Header() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-background/70 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-3">
        <Logo href="/dashboard" className="[&>span]:max-[400px]:hidden" />

        <nav aria-label="Main" className="flex items-center gap-1">
          {NAV_ITEMS.map(({ name, href, icon: Icon, isActive }) => {
            const active = isActive(pathname);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground",
                  active && "bg-white/[0.06] text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", active && "text-primary")} aria-hidden="true" />
                {/* Icons only on small screens; the name stays available to screen readers. */}
                <span className="sr-only sm:not-sr-only">{name}</span>
              </Link>
            );
          })}

          <div className="ml-2 flex h-9 w-9 items-center justify-center">
            <UserButton appearance={{ elements: { userButtonAvatarBox: "h-9 w-9 ring-2 ring-white/10" } }} />
          </div>
        </nav>
      </div>
    </header>
  );
}

export default Header;
