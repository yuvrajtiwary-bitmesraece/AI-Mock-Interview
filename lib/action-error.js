import { toast } from "sonner";

/*
 * What to tell people when a server action call throws instead of returning a
 * result. Actions catch their own errors (actions/interview.js), so a throw
 * here means the request itself failed: no connection, or a page that was open
 * while a new version of the site went live. Each case gets a message that
 * says what to do, instead of a generic error.
 */

// Next.js throws this when the page comes from an older deployment and the
// action it calls no longer exists on the server.
const STALE_PAGE = /UnrecognizedActionError|Server Action .* was not found|Failed to find Server Action/i;

// fetch() rejections: Chrome, Firefox and Safari word them differently.
const NETWORK_FAILURE = /Failed to fetch|NetworkError|Load failed|network error|fetch failed/i;

/** True when the browser knows it has no connection. */
export function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/** Which of the cases above `error` is: "offline", "stale" or "unknown". */
export function classifyActionError(error) {
  const text = `${error?.name ?? ""} ${error?.message ?? error ?? ""}`;
  if (STALE_PAGE.test(text)) return "stale";
  if (isOffline() || NETWORK_FAILURE.test(text)) return "offline";
  return "unknown";
}

/** The message for an action call that threw; `fallback` for unknown errors. */
export function actionErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const kind = classifyActionError(error);
  if (kind === "stale") return "A new version of the site is live. Reload the page to continue.";
  if (kind === "offline") return "You're offline, or the connection dropped. Check it and try again.";
  return fallback;
}

/**
 * Shows the right toast for an action call that threw. An out-of-date page
 * gets a Reload button, and the toast stays until it is used or closed.
 */
export function toastActionError(error, fallback) {
  const kind = classifyActionError(error);
  const message = actionErrorMessage(error, fallback);
  if (kind === "stale") {
    toast.error(message, {
      id: "stale-page",
      duration: Infinity,
      action: { label: "Reload", onClick: () => window.location.reload() },
    });
  } else {
    toast.error(message, kind === "offline" ? { id: "offline" } : undefined);
  }
}
