import { cn } from "@/lib/utils";

const TONES = {
  default: "border-white/10 bg-white/[0.05] text-foreground/90",
  primary: "border-primary/30 bg-primary/10 text-ember-1",
  violet: "border-violet-400/25 bg-violet-400/10 text-violet-200",
  success: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  warning: "border-amber-300/25 bg-amber-300/10 text-amber-200",
  danger: "border-red-400/25 bg-red-400/10 text-red-200",
};

/** A small rounded label. */
export function Badge({ variant = "default", className, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONES[variant] ?? TONES.default,
        className
      )}
      {...props}
    />
  );
}
