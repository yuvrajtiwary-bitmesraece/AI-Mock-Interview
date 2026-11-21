"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BAR_COUNT = 18;

/**
 * "Test your microphone": shows a live input level so people can confirm
 * their mic works before the interview. Audio is analyzed in the browser
 * and never recorded; the mic is released when the test stops.
 */
export function MicCheck() {
  const [status, setStatus] = useState("idle"); // idle | listening | denied | unsupported
  const [level, setLevel] = useState(0); // 0 to 1
  const [heard, setHeard] = useState(false);
  const stopRef = useRef(null);

  const stop = () => {
    stopRef.current?.();
    stopRef.current = null;
    setStatus("idle");
    setLevel(0);
  };

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === "undefined") {
      setStatus("unsupported");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      context.createMediaStreamSource(stream).connect(analyser);

      const samples = new Uint8Array(analyser.fftSize);
      let frame;
      const measure = () => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) {
          const value = (sample - 128) / 128;
          sum += value * value;
        }
        const next = Math.min(1, Math.sqrt(sum / samples.length) * 5);
        setLevel(next);
        if (next > 0.15) setHeard(true);
        frame = requestAnimationFrame(measure);
      };
      measure();

      stopRef.current = () => {
        cancelAnimationFrame(frame);
        stream.getTracks().forEach((track) => track.stop());
        context.close();
      };
      setStatus("listening");
    } catch {
      setStatus("denied");
    }
  };

  // Release the microphone when leaving the page.
  useEffect(() => () => stopRef.current?.(), []);

  const message = {
    idle: heard ? "Your microphone works." : "Check that your voice is picked up before you start.",
    listening: heard ? "We can hear you. Your microphone works." : "Say something…",
    denied: "Microphone access was blocked. Allow it in your browser's site settings, then try again.",
    unsupported: "This browser can't access a microphone.",
  }[status];

  return (
    <div className="space-y-4">
      <div className="flex h-12 items-end gap-1" aria-hidden="true">
        {Array.from({ length: BAR_COUNT }, (_, index) => {
          const active = status === "listening" && level * BAR_COUNT > index;
          return (
            <span
              key={index}
              className={cn(
                "w-full rounded-full bg-white/10 transition-[height,background-color] duration-75",
                active && (index > BAR_COUNT * 0.8 ? "bg-amber-300" : "bg-gradient-to-t from-cyan-400 to-blue-500")
              )}
              style={{ height: `${20 + (index / BAR_COUNT) * 80}%` }}
            />
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          aria-live="polite"
          className={cn("text-sm", status === "denied" || status === "unsupported" ? "text-red-300" : heard ? "text-emerald-300" : "text-muted-foreground")}
        >
          {message}
        </p>
        {status === "listening" ? (
          <Button type="button" variant="glass" size="sm" onClick={stop}>
            <MicOff /> Stop test
          </Button>
        ) : (
          <Button type="button" variant="glass" size="sm" onClick={start}>
            <Mic /> Test microphone
          </Button>
        )}
      </div>
    </div>
  );
}
