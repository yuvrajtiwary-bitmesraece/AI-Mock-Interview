import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export const APP_NAME = "AI Mock Interview";

/** The logo mark plus the product name, linking to `href`. */
export function Logo({ href = "/", showName = true, className, priority = false }) {
  return (
    <Link
      href={href}
      aria-label={`${APP_NAME} home`}
      className={cn("group inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
    >
      <Image
        src="/logo.svg"
        width={32}
        height={31}
        alt=""
        priority={priority}
        className="h-8 w-8 transition-transform duration-300 group-hover:rotate-12"
      />
      {showName && (
        <span className="whitespace-nowrap text-[15px] font-bold tracking-tight text-foreground">
          AI Mock <span className="text-gradient">Interview</span>
        </span>
      )}
    </Link>
  );
}
