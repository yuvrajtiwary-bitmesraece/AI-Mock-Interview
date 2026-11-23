import { cn } from "@/lib/utils";

/** The look shared by every text field: <Input> and <Textarea>. */
export const fieldClasses = [
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-[15px] text-foreground sm:text-sm",
  "shadow-[inset_0_1px_2px_rgb(0_0_0/0.35)] transition-[border-color,background-color,box-shadow] duration-300 ease-out-expo",
  "placeholder:text-muted-foreground/70 hover:border-white/15",
  "focus-visible:border-primary/60 focus-visible:bg-white/[0.045] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ");

/** A single-line text field. */
export function Input({ className, type = "text", ...props }) {
  return (
    <input
      type={type}
      className={cn(fieldClasses, "h-11 file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground", className)}
      {...props}
    />
  );
}
