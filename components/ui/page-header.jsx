import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

/** The serif italic accent used inside headings, in the ember gradient. */
export function Accent({ children, className }) {
  return <em className={cn("font-serif font-normal italic tracking-normal text-ember", className)}>{children}</em>;
}

/**
 * The title block at the top of an app page: an optional back link, a small
 * label, the title, a description and actions on the right.
 */
export function PageHeader({ back, eyebrow, title, description, actions, className }) {
  return (
    <header className={cn("animate-fade-up", className)}>
      {back && (
        <Link
          href={back.href}
          className="group mb-7 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground print:hidden"
        >
          <ArrowLeft className="h-4 w-4 transition-transform duration-300 ease-out-expo group-hover:-translate-x-0.5" aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0">
          {eyebrow && (
            <p className="eyebrow">
              <span className="h-px w-6 bg-gradient-to-r from-transparent to-ember-2" aria-hidden="true" />
              {eyebrow}
            </p>
          )}
          <h1 className={cn("text-4xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-5xl", eyebrow && "mt-3")}>{title}</h1>
          {description && <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
    </header>
  );
}
