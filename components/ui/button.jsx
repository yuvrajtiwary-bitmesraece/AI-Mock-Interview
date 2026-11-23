import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

const BASE = [
  "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium",
  "transition-[transform,background-color,border-color,color,box-shadow,filter] duration-300 ease-out-expo active:scale-[0.97]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "disabled:pointer-events-none disabled:opacity-45",
  "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
].join(" ");

const SIZES = {
  default: "h-10 px-5 text-sm",
  sm: "h-8 px-3.5 text-[13px] [&_svg]:size-3.5",
  lg: "h-11 px-6 text-[15px]",
  xl: "h-12 px-7 text-[15px]",
  icon: "h-10 w-10",
};

const VARIANTS = {
  // The main action: a bright pill.
  default:
    "bg-foreground text-background shadow-[inset_0_1px_0_rgb(255_255_255/0.6),0_10px_30px_-12px_rgb(255_255_255/0.35)] hover:bg-white hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.6),0_14px_36px_-12px_rgb(255_255_255/0.45)]",
  // The brand action, in the ember gradient.
  gradient:
    "bg-[linear-gradient(100deg,hsl(var(--ember-1)),hsl(var(--ember-2))_48%,hsl(var(--ember-3)))] text-[#141014] shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_12px_32px_-12px_hsl(var(--ember-2)/0.75)] hover:brightness-110 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_16px_40px_-12px_hsl(var(--ember-2)/0.85)]",
  // A quiet outlined pill, for secondary actions.
  glass: "border border-white/10 bg-white/[0.04] text-foreground hover:border-white/20 hover:bg-white/[0.08]",
  outline: "border border-white/15 bg-transparent text-foreground hover:bg-white/[0.06]",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  "destructive-soft": "border border-destructive/30 bg-destructive/10 text-red-200 hover:bg-destructive/20",
  link: "h-auto rounded-md px-0 text-primary underline-offset-4 hover:underline active:scale-100",
};

/** The class names of a button, for elements that can't be a <Button>. */
export function buttonVariants({ variant = "default", size = "default", className } = {}) {
  return cn(BASE, SIZES[size] ?? SIZES.default, VARIANTS[variant] ?? VARIANTS.default, className);
}

/**
 * A button. With `asChild`, the styles go onto the single child instead,
 * for example a <Link>.
 */
export function Button({ asChild = false, variant, size, className, ...props }) {
  const Component = asChild ? Slot : "button";
  return <Component className={buttonVariants({ variant, size, className })} {...props} />;
}
