"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const joinText = (...parts) => parts.map((part) => part.trim()).filter(Boolean).join(" ");

/**
 * Live speech-to-text with the browser's Web Speech API (Chrome, Edge, Safari).
 *
 * Browsers end recognition on their own after a pause or a time limit. While
 * the user is still recording, this hook restarts it and keeps the text so
 * far, so long answers aren't cut off. Event handlers read refs rather than
 * state, because they are attached once and would otherwise see stale values.
 */
export function useSpeechRecognition({ lang = "en-US", initialTranscript = "", onError } = {}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState(initialTranscript);
  const recognitionRef = useRef(null);
  const wantListeningRef = useRef(false);
  const committedRef = useRef(initialTranscript); // text from finished recognition sessions
  const sessionRef = useRef(""); // text from the current session
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return undefined;

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) text += `${event.results[i][0].transcript} `;
      sessionRef.current = text;
      setTranscript(joinText(committedRef.current, text));
    };

    recognition.onerror = (event) => {
      // "aborted" is our own stop; "no-speech" is silence, and onend restarts listening.
      if (event.error === "aborted" || event.error === "no-speech") return;
      wantListeningRef.current = false;
      setListening(false);
      onErrorRef.current?.(event.error);
    };

    recognition.onend = () => {
      committedRef.current = joinText(committedRef.current, sessionRef.current);
      sessionRef.current = "";
      if (wantListeningRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          wantListeningRef.current = false;
        }
      }
      setListening(false);
    };

    recognitionRef.current = recognition;
    return () => {
      wantListeningRef.current = false;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [lang]);

  /** Starts listening, adding to the current transcript. Returns false if it couldn't start. */
  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || wantListeningRef.current) return false;
    try {
      recognition.start();
      wantListeningRef.current = true;
      setListening(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  /** Stops listening. Text still being processed arrives before `listening` turns false. */
  const stop = useCallback(() => {
    wantListeningRef.current = false;
    recognitionRef.current?.stop();
  }, []);

  /** Replaces the transcript, e.g. after the user edits it or clears it. */
  const replaceTranscript = useCallback((text) => {
    committedRef.current = text;
    sessionRef.current = "";
    setTranscript(text);
  }, []);

  /** The latest transcript, read from refs so it is current even inside timers and old closures. */
  const getTranscript = useCallback(() => joinText(committedRef.current, sessionRef.current), []);

  return { listening, transcript, start, stop, replaceTranscript, getTranscript };
}
