import { cn } from "@/lib/utils";

/*
 * Placeholders shaped like the page that is loading. Each route's loading.jsx
 * uses them, so a click shows the next screen's layout at once while the
 * server prepares the real content.
 */

/** One grey placeholder block. */
export function Bone({ className }) {
  return <div className={cn("skeleton", className)} />;
}

/** The page title block: back link, small label, title and description. */
export function HeaderBones({ back = true, description = true }) {
  return (
    <div className="space-y-3 pb-6">
      {back && <Bone className="mb-5 h-4 w-28" />}
      <Bone className="h-3 w-24" />
      <Bone className="h-11 w-80 max-w-full rounded-xl sm:h-12" />
      {description && <Bone className="h-4 w-[28rem] max-w-full" />}
    </div>
  );
}

/** The wrapper every loading screen shares, announced to screen readers. */
export function PageSkeleton({ label, className, children }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={cn("animate-page-in", className)}>
      {children}
    </div>
  );
}
