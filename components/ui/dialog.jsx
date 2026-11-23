"use client";

import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { Slot } from "@radix-ui/react-slot";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/*
 * A modal dialog built on the browser's own <dialog> element, which already
 * traps focus, closes on Escape and returns focus to the trigger. The CSS for
 * the open and close animation is in app/globals.css (.dialog).
 *
 *   <Dialog open={open} onOpenChange={setOpen}>
 *     <DialogTrigger asChild><Button>Delete</Button></DialogTrigger>
 *     <DialogContent>
 *       <DialogHeader><DialogTitle /><DialogDescription /></DialogHeader>
 *       <DialogFooter />
 *     </DialogContent>
 *   </Dialog>
 */

const DialogContext = createContext(null);

function useDialog() {
  const context = useContext(DialogContext);
  if (!context) throw new Error("Dialog parts must be inside <Dialog>.");
  return context;
}

/** Holds the open state. Pass `open` and `onOpenChange` to control it. */
export function Dialog({ open: controlledOpen, onOpenChange, defaultOpen = false, children }) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const id = useId();

  const setOpen = (next) => {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    if (next !== open) onOpenChange?.(next);
  };

  return (
    <DialogContext.Provider value={{ open, setOpen, titleId: `${id}title`, descriptionId: `${id}description` }}>
      {children}
    </DialogContext.Provider>
  );
}

/** The element that opens the dialog. With `asChild`, the child element is used. */
export function DialogTrigger({ asChild = false, ...props }) {
  const { setOpen } = useDialog();
  const Component = asChild ? Slot : "button";
  return <Component {...(asChild ? {} : { type: "button" })} aria-haspopup="dialog" {...props} onClick={() => setOpen(true)} />;
}

/** The dialog panel. Clicking the dimmed backdrop or pressing Escape closes it. */
export function DialogContent({ className, children }) {
  const { open, setOpen, titleId, descriptionId } = useDialog();
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={() => setOpen(false)}
      onClick={(event) => {
        // A click on the <dialog> itself, not on the panel inside it, is a click on the backdrop.
        if (event.target === event.currentTarget) setOpen(false);
      }}
      className="dialog m-auto w-[calc(100%-2rem)] max-w-md overflow-visible border-0 bg-transparent p-0 text-foreground"
    >
      <div className={cn("surface-raised relative grid gap-6 p-6 sm:p-7", className)}>
        {children}
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors duration-300 hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </dialog>
  );
}

export function DialogHeader({ className, ...props }) {
  return <div className={cn("grid gap-2 pr-8", className)} {...props} />;
}

export function DialogFooter({ className, ...props }) {
  return <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}

export function DialogTitle({ className, ...props }) {
  const { titleId } = useDialog();
  return <h2 id={titleId} className={cn("text-lg font-semibold tracking-tight", className)} {...props} />;
}

export function DialogDescription({ className, ...props }) {
  const { descriptionId } = useDialog();
  return <p id={descriptionId} className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />;
}
