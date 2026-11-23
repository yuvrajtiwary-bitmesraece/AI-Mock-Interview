"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { LayoutDashboard, Plus, Settings } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    isActive: (path) => path.startsWith("/dashboard") && path !== "/dashboard/new" && path !== "/dashboard/settings",
  },
  { name: "New interview", href: "/dashboard/new", icon: Plus, isActive: (path) => path === "/dashboard/new" },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, isActive: (path) => path === "/dashboard/settings" },
];

/** The app's top bar: a floating pill with the main sections and the account menu. */
export default function Header() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4 print:hidden">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-full border border-white/[0.08] bg-[hsl(240_8%_6%/0.72)] pl-4 pr-2 shadow-[0_12px_40px_-16px_rgb(0_0_0/0.9)] backdrop-blur-xl backdrop-saturate-150 sm:pl-5">
        <Logo href="/dashboard" nameClassName="max-[420px]:hidden" />

        <nav aria-label="Main" className="flex items-center gap-1">
          {NAV_ITEMS.map(({ name, href, icon: Icon, isActive }) => {
            const active = isActive(pathname);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full px-3 text-[13.5px] font-medium text-muted-foreground transition-colors duration-300 hover:text-foreground sm:px-3.5",
                  active && "bg-white/[0.08] text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", active && "text-ember-2")} aria-hidden="true" />
                {/* Icons only on small screens; screen readers still get the name. */}
                <span className="sr-only md:not-sr-only">{name}</span>
              </Link>
            );
          })}

          <div className="ml-1.5 grid h-9 w-9 place-items-center">
            <UserButton appearance={{ elements: { userButtonAvatarBox: "h-9 w-9 ring-2 ring-white/10" } }} />
          </div>
        </nav>
      </div>
    </header>
  );
}
