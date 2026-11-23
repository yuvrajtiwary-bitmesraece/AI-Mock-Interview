import Link from "next/link";

import { Logo } from "@/components/brand/Logo";
import { SITE } from "@/utils/site";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Start practicing", href: "/dashboard/new" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Plans", href: "/#plans" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Open source",
    links: [
      { label: "Source code", href: SITE.repoUrl, external: true },
      { label: "Code judge (Go)", href: `${SITE.repoUrl}/tree/main/verdict`, external: true },
      { label: "Report an issue", href: `${SITE.repoUrl}/issues/new/choose`, external: true },
      { label: "Contributing", href: `${SITE.repoUrl}/blob/main/CONTRIBUTING.md`, external: true },
      { label: "Changelog", href: `${SITE.repoUrl}/blob/main/CHANGELOG.md`, external: true },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "MIT License", href: `${SITE.repoUrl}/blob/main/LICENSE`, external: true },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06]">
      <div className="container grid gap-10 py-14 md:grid-cols-5">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Practice interviews with an AI interviewer and get scored feedback on every answer. Free and open source.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <h2 className="text-sm font-semibold">{column.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/[0.06]">
        <div className="container flex flex-col gap-2 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.name}. Open source under the MIT License.
          </p>
          <p>
            Built by Yuvraj Tiwary.
          </p>
        </div>
      </div>
    </footer>
  );
}
