import { useMemo, useSyncExternalStore } from "react";

/*
 * Unsent text kept in sessionStorage, so it survives a reload, a crash or the
 * browser discarding the tab to save memory (common on low-end phones). It is
 * per tab and gone when the tab is closed. Storage can be unavailable (private
 * modes, blocked cookies), so every access is allowed to fail: drafts are a
 * convenience, never a requirement.
 */

const PREFIX = "draft:v1:";
const subscribe = () => () => {};

function readRaw(key) {
  try {
    return window.sessionStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

/** Saves `value` (any JSON) under `key`, or removes the draft when `value` is null. */
export function writeDraft(key, value) {
  try {
    if (value == null) window.sessionStorage.removeItem(PREFIX + key);
    else window.sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Full or blocked storage: the draft just isn't kept.
  }
}

/**
 * The draft saved under `key`, or null. While rendering on the server, and
 * during hydration, it is null, so the first render always matches the HTML.
 */
export function useDraft(key) {
  const raw = useSyncExternalStore(subscribe, () => readRaw(key), () => null);
  return useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [raw]);
}
