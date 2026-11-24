"use client";

import { useEffect } from "react";

// Under 25 frames a second while the page is idle, motion looks broken rather
// than smooth, and it takes time away from scrolling and taps.
const SLOW_FRAME_MS = 40;
const FRAMES = 60;

/**
 * Turns on lite mode (app/globals.css, [data-lite]) on a device that can't
 * keep the page smooth, for the rest of the visit. The script in app/layout.js
 * already turns it on up front for devices that report little memory, few
 * cores or Data Saver; this catches the rest by timing about a second of
 * frames once the page has loaded.
 */
export function SmoothnessGuard() {
  useEffect(() => {
    const root = document.documentElement;
    if (root.hasAttribute("data-lite") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    let frame = 0;
    let timer = 0;
    let first = 0;
    let count = 0;

    const sample = (now) => {
      // A hidden tab doesn't draw frames, so its timing says nothing.
      if (document.hidden) return;
      if (count === 0) first = now;
      count += 1;
      if (count < FRAMES) {
        frame = requestAnimationFrame(sample);
        return;
      }
      if ((now - first) / (count - 1) > SLOW_FRAME_MS) {
        root.setAttribute("data-lite", "");
        try {
          window.sessionStorage.setItem("lite", "1");
        } catch {
          // Storage blocked: lite mode just lasts until the next page load.
        }
      }
    };

    // Measure after loading has settled, so start-up work doesn't count.
    const begin = () => {
      timer = window.setTimeout(() => {
        frame = requestAnimationFrame(sample);
      }, 2000);
    };
    if (document.readyState === "complete") begin();
    else window.addEventListener("load", begin, { once: true });

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.removeEventListener("load", begin);
    };
  }, []);

  return null;
}
