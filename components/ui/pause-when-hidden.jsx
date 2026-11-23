"use client";

import { useEffect, useRef } from "react";

/**
 * Pauses the looping animations inside (waveforms, glows, the marquee) while
 * this block is off screen, so the browser only animates what you can see.
 * The CSS rule is in app/globals.css ([data-paused]).
 */
export function PauseWhenHidden({ as: Tag = "div", className, children, ...props }) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) element.removeAttribute("data-paused");
        else element.setAttribute("data-paused", "");
      },
      // Start again a little before the block scrolls into view.
      { rootMargin: "120px 0px" }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={className} {...props}>
      {children}
    </Tag>
  );
}
