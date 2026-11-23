import { cn } from "@/lib/utils";

import { fieldClasses } from "./input";

/** A multi-line text field. */
export function Textarea({ className, ...props }) {
  return <textarea className={cn(fieldClasses, "min-h-28 py-3 leading-relaxed", className)} {...props} />;
}
