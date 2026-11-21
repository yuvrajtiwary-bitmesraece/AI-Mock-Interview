"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Whether this browser can show a live transcript while you speak (Web Speech
 * API: Chrome, Edge, Safari). `null` while rendering on the server.
 */
export function useSpeechSupport() {
  return useSyncExternalStore(
    subscribe,
    () => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    () => null
  );
}

/**
 * Whether this browser can record the microphone for transcription (every
 * modern browser, including Firefox). `null` while rendering on the server.
 */
export function useRecordingSupport() {
  return useSyncExternalStore(
    subscribe,
    () => Boolean(navigator.mediaDevices?.getUserMedia && typeof window.MediaRecorder !== "undefined"),
    () => null
  );
}

/**
 * The language for the live transcript preview: the browser's own English
 * variant (en-IN, en-GB...) when it has one, since matching the speaker's
 * accent noticeably improves recognition. Falls back to en-US.
 */
export function useSpeechLanguage() {
  return useSyncExternalStore(
    subscribe,
    () => (/^en-[a-z]{2}$/i.test(navigator.language) ? navigator.language : "en-US"),
    () => "en-US"
  );
}
