import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-white/10 bg-white/5 text-foreground",
        primary: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
        violet: "border-violet-400/30 bg-violet-400/10 text-violet-200",
        success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
        warning: "border-amber-400/30 bg-amber-400/10 text-amber-200",
        danger: "border-red-400/30 bg-red-400/10 text-red-200",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
