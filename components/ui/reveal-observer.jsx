"use client";

import { useEffect } from "react";

/**
 * Fades the page's `.reveal` sections in the first time they scroll into
 * view, by adding `.is-visible` (the CSS is in app/globals.css). One shared
 * IntersectionObserver, and each section is let go once it's shown, so after
 * a section appears the browser has nothing left to animate.
 *
 * Sections already on screen are marked visible before anything is hidden,
 * so nothing flickers on load. With reduced motion, nothing is hidden at all.
 */
export function RevealObserver() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    // Lite mode (app/layout.js) shows every section at once.
    if (document.documentElement.hasAttribute("data-lite")) return undefined;

    const elements = [...document.querySelectorAll(".reveal:not(.is-visible)")];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      // Start a little before a section enters the screen, so a fast scroll never lands on an empty space.
      { rootMargin: "0px 0px 8% 0px" }
    );

    for (const element of elements) {
      const { top } = element.getBoundingClientRect();
      if (top < window.innerHeight) element.classList.add("is-visible");
      else observer.observe(element);
    }
    document.documentElement.classList.add("reveal-ready");

    return () => observer.disconnect();
  }, []);

  return null;
}
