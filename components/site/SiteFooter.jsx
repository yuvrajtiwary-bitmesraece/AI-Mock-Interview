import Link from "next/link";
import { ArrowUpRight, Github } from "lucide-react";

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

const EXTERNAL = { target: "_blank", rel: "noopener noreferrer" };

export function SiteFooter() {
  return (
    <footer className="relative overflow-clip border-t border-white/[0.06]">
      <div className="container grid gap-12 pb-12 pt-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Rehearse real interviews with an AI interviewer and get specific, scored feedback on every answer. Free and open source.
          </p>
          <Link
            href={SITE.repoUrl}
            {...EXTERNAL}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-foreground/85 transition-colors duration-300 hover:border-white/20 hover:text-foreground"
          >
            <Github className="h-3.5 w-3.5" aria-hidden="true" /> Star on GitHub
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:col-span-7">
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="text-[13px] font-medium text-foreground">{column.title}</h2>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      {...(link.external ? EXTERNAL : {})}
                      className="group inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground"
                    >
                      {link.label}
                      {link.external && (
                        <ArrowUpRight
                          className="h-3 w-3 opacity-0 transition-all duration-300 ease-out-expo group-hover:translate-x-0.5 group-hover:opacity-100"
                          aria-hidden="true"
                        />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="container">
        <div className="hairline" />
        <div className="flex flex-col gap-2 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.name}. Open source under the MIT License.
          </p>
          <p>Built by Yuvraj Tiwary.</p>
        </div>
      </div>

      <p
        aria-hidden="true"
        className="pointer-events-none select-none whitespace-nowrap text-center font-serif text-[13vw] italic leading-[0.8] text-white/[0.035] xl:text-[10.5rem]"
      >
        AI Mock Interview
      </p>
    </footer>
  );
}
