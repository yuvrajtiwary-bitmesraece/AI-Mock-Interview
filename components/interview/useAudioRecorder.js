"use client";

import { useCallback, useEffect, useRef } from "react";

// Formats Gemini can transcribe, in order of preference. Chrome, Edge and
// Firefox record WebM/Opus; Safari records MP4/AAC.
const PREFERRED_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

function pickRecordingType() {
  return PREFERRED_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function releaseMicrophone(streamRef) {
  streamRef.current?.getTracks().forEach((track) => track.stop());
  streamRef.current = null;
}

/**
 * Records the microphone so the answer can be transcribed by Gemini.
 * `start()` asks for the microphone (and throws if access is denied);
 * `stop()` releases it and resolves with the recording as a Blob, or null.
 */
export function useAudioRecorder() {
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const mimeType = pickRecordingType();
    // 32 kbps Opus is plenty for speech: a 5-minute answer is about 1.2 MB.
    const recorder = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32_000 });
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.start(1000);
    recorderRef.current = recorder;
    streamRef.current = stream;
  }, []);

  const stop = useCallback(
    () =>
      new Promise((resolve) => {
        const recorder = recorderRef.current;
        recorderRef.current = null;
        if (!recorder || recorder.state === "inactive") {
          releaseMicrophone(streamRef);
          resolve(null);
          return;
        }
        recorder.onstop = () => {
          releaseMicrophone(streamRef);
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          resolve(blob.size > 0 ? blob : null);
        };
        recorder.stop();
      }),
    []
  );

  // Release the microphone if the user leaves mid-recording.
  useEffect(
    () => () => {
      try {
        recorderRef.current?.stop();
      } catch {
        // Already stopped.
      }
      releaseMicrophone(streamRef);
    },
    []
  );

  return { start, stop };
}
