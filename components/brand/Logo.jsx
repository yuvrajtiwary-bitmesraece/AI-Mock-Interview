import Link from "next/link";

import { cn } from "@/lib/utils";
import { SITE } from "@/utils/site";

/**
 * The logo mark: four bars of a voice waveform on an ember tile. The tile is
 * a CSS gradient rather than an SVG one, so several marks on a page never
 * clash over gradient IDs. Same drawing as scripts/generate-icons.mjs.
 */
export function LogoMark({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block h-7 w-7 shrink-0 rounded-[28%] bg-[linear-gradient(135deg,#ffcd94,#ff813d_50%,#f45273)] shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]",
        className
      )}
    >
      <svg viewBox="0 0 32 32" className="h-full w-full" fill="#0b0b0e">
        <rect x="6.25" y="12" width="3" height="8" rx="1.5" />
        <rect x="11.75" y="8.5" width="3" height="15" rx="1.5" />
        <rect x="17.25" y="6.5" width="3" height="19" rx="1.5" />
        <rect x="22.75" y="11" width="3" height="10" rx="1.5" />
      </svg>
    </span>
  );
}

/** The mark and the product name, linking to `href`. `nameClassName` styles the name, e.g. to hide it on tiny screens. */
export function Logo({ href = "/", showName = true, className, nameClassName }) {
  return (
    <Link
      href={href}
      aria-label={`${SITE.name} home`}
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
        className
      )}
    >
      <LogoMark className="transition-transform duration-500 ease-out-expo group-hover:-rotate-6 group-hover:scale-105" />
      {showName && (
        <span className={cn("whitespace-nowrap text-[15px] font-semibold tracking-tight text-foreground", nameClassName)}>
          AI Mock <span className="font-serif text-[17px] font-normal italic tracking-normal">Interview</span>
        </span>
      )}
    </Link>
  );
}
