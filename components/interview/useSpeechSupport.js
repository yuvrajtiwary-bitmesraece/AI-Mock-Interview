"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Whether this browser can transcribe speech (Web Speech API).
 * `null` while rendering on the server, then true or false in the browser.
 */
export function useSpeechSupport() {
  return useSyncExternalStore(
    subscribe,
    () => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    () => null
  );
}
