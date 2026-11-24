"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const START_EVENT = "navigation-progress:start";

// Navigations that finish sooner than this (prefetched pages) never show the bar.
const SHOW_AFTER_MS = 120;
// Never leave the bar running, e.g. after a navigation that failed.
const GIVE_UP_AFTER_MS = 12_000;

/** Shows the bar for a navigation started in code, e.g. router.push() after an action. */
export function startNavigationProgress() {
  window.dispatchEvent(new Event(START_EVENT));
}

/** True for a plain click on a link to another page of this site. */
function opensAnotherPage(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return false;
  const url = new URL(link.href, window.location.href);
  // Another site, or only a #section of this page: nothing to wait for.
  return url.origin === window.location.origin && url.pathname !== window.location.pathname;
}

/**
 * A thin ember bar at the top of the window that starts the moment a link is
 * clicked and fills while the next page loads, so every click gets an instant
 * response, even on a slow connection. It only animates transform and
 * opacity (app/globals.css, .nav-progress), which costs the page nothing.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const barRef = useRef(null);
  const finishRef = useRef(null);

  useEffect(() => {
    const bar = barRef.current;
    let active = false;
    let showTimer = 0;
    let giveUpTimer = 0;
    let resetTimer = 0;

    const finish = () => {
      if (!active) return;
      active = false;
      window.clearTimeout(showTimer);
      window.clearTimeout(giveUpTimer);
      if (bar.dataset.state !== "loading") {
        bar.dataset.state = "";
        return;
      }
      bar.dataset.state = "done";
      resetTimer = window.setTimeout(() => {
        bar.dataset.state = "";
      }, 600);
    };

    const start = () => {
      if (active) return;
      active = true;
      window.clearTimeout(resetTimer);
      bar.dataset.state = "";
      showTimer = window.setTimeout(() => {
        bar.dataset.state = "loading";
      }, SHOW_AFTER_MS);
      giveUpTimer = window.setTimeout(finish, GIVE_UP_AFTER_MS);
    };

    const onClick = (event) => {
      if (opensAnotherPage(event)) start();
    };
    // Back/forward can restore this page from the browser's cache with the bar mid-way.
    const onPageShow = (event) => {
      if (!event.persisted) return;
      active = false;
      bar.dataset.state = "";
    };

    finishRef.current = finish;
    // Capture phase: runs before Next.js handles the click.
    document.addEventListener("click", onClick, true);
    window.addEventListener(START_EVENT, start);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(START_EVENT, start);
      window.removeEventListener("pageshow", onPageShow);
      window.clearTimeout(showTimer);
      window.clearTimeout(giveUpTimer);
      window.clearTimeout(resetTimer);
    };
  }, []);

  // The new page is showing: complete the bar.
  useEffect(() => {
    finishRef.current?.();
  }, [pathname]);

  return <div ref={barRef} className="nav-progress print:hidden" aria-hidden="true" />;
}
