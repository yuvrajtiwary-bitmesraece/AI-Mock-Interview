"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Keyboard, LoaderCircle, Mic, RotateCcw, Send, Square } from "lucide-react";

import { saveAnswer } from "@/actions/interview";
import { useSpeechRecognition } from "@/components/interview/useSpeechRecognition";
import { useSpeechSupport } from "@/components/interview/useSpeechSupport";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { countWords, formatDuration } from "@/utils/speech";

const SPEECH_ERRORS = {
  "not-allowed": "Microphone access is blocked. Allow it in your browser's site settings.",
  "service-not-allowed": "Microphone access is blocked. Allow it in your browser's site settings.",
  "audio-capture": "No microphone was found. Plug one in, or type your answer instead.",
  network: "Speech recognition needs an internet connection. Check yours, or type your answer.",
};

const WAVE_BARS = [0, 120, 240, 360, 480, 600, 720];

/**
 * Where the candidate answers one question, by voice or by typing, then
 * submits the answer for AI review. Mounted fresh for each question.
 */
export default function AnswerComposer({ mockId, questionIndex, initialText = "", onSaved }) {
  const speechSupported = useSpeechSupport();
  const [chosenMode, setChosenMode] = useState(null);
  const mode = chosenMode ?? (speechSupported === false ? "text" : "voice");

  const [typed, setTyped] = useState(initialText);
  const [seconds, setSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const typingStartedRef = useRef(null);

  const speech = useSpeechRecognition({
    initialTranscript: initialText,
    onError: (code) => toast.error(SPEECH_ERRORS[code] ?? `Speech recognition stopped (${code}). Try again, or type your answer.`),
  });
  const { listening, transcript, replaceTranscript, start, stop } = speech;

  // Count speaking time while the microphone is on.
  useEffect(() => {
    if (!listening) return undefined;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [listening]);

  const answer = mode === "voice" ? transcript : typed;
  const words = countWords(answer);

  const switchMode = (next) => {
    if (next === mode) return;
    if (listening) stop();
    // Carry the text over, so switching never loses what was said or typed.
    if (next === "text") setTyped(transcript);
    else replaceTranscript(typed);
    setChosenMode(next);
  };

  const toggleRecording = () => {
    if (listening) {
      stop();
    } else if (!start()) {
      toast.error("Couldn't start the microphone. Check permissions, or type your answer instead.");
    }
  };

  const clear = () => {
    if (listening) stop();
    replaceTranscript("");
    setTyped("");
    setSeconds(0);
    typingStartedRef.current = null;
  };

  const submit = async () => {
    const text = answer.trim();
    if (listening) {
      toast.info("Stop recording first, then submit.");
      return;
    }
    if (countWords(text) < 3) {
      toast.error("Your answer is too short. Say or type a little more.");
      return;
    }

    setSubmitting(true);
    const durationSec =
      mode === "voice" ? seconds : typingStartedRef.current ? Math.round((Date.now() - typingStartedRef.current) / 1000) : 0;
    try {
      const result = await saveAnswer({ mockId, questionIndex, userAnswer: text, mode, durationSec });
      if (result?.success) {
        onSaved({ answer: text, score: result.review.rating, review: result.review, metrics: result.metrics });
        return;
      }
      toast.error(result?.error ?? "Could not review your answer. Please try again.");
    } catch (error) {
      console.error("saveAnswer failed:", error);
      toast.error("Something went wrong. Check your connection and try again.");
    }
    setSubmitting(false);
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <section className="glass p-5 sm:p-6" aria-label="Your answer">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Answer mode" className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {[
            { id: "voice", label: "Speak", icon: Mic, disabled: speechSupported === false },
            { id: "text", label: "Type", icon: Keyboard, disabled: false },
          ].map(({ id, label, icon: Icon, disabled }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              disabled={disabled || submitting}
              onClick={() => switchMode(id)}
              title={disabled ? "Speech recognition isn't supported in this browser" : undefined}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                mode === id && "bg-primary/15 text-foreground"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
        <p className="font-mono text-sm text-muted-foreground" aria-live="off">
          {mode === "voice" ? formatDuration(seconds) : `${words} ${words === 1 ? "word" : "words"}`}
        </p>
      </div>

      {mode === "voice" && (
        <div className="mb-5 flex flex-col items-center gap-4 py-2">
          <button
            type="button"
            onClick={toggleRecording}
            disabled={submitting}
            aria-pressed={listening}
            className={cn(
              "relative flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/50 active:scale-95 disabled:opacity-50",
              listening ? "bg-red-500 shadow-red-500/30" : "bg-gradient-to-br from-cyan-400 to-blue-600 shadow-cyan-500/30"
            )}
          >
            {listening && <span className="absolute inset-0 animate-ping rounded-full bg-red-500/40" aria-hidden="true" />}
            {listening ? <Square className="relative h-7 w-7 fill-current" aria-hidden="true" /> : <Mic className="h-8 w-8" aria-hidden="true" />}
            <span className="sr-only">{listening ? "Stop recording" : "Start recording"}</span>
          </button>
          <div className="flex h-6 items-center gap-1" aria-hidden="true">
            {WAVE_BARS.map((delay) => (
              <span
                key={delay}
                className={cn("h-full w-1 origin-center rounded-full bg-cyan-400/80", listening ? "animate-wave" : "scale-y-[0.25] opacity-40")}
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {listening ? "Listening… press the button when you're done." : transcript ? "Edit the transcript if anything was misheard." : "Press the button and answer out loud."}
          </p>
        </div>
      )}

      <label htmlFor={`answer-${questionIndex}`} className="sr-only">
        Your answer
      </label>
      <textarea
        id={`answer-${questionIndex}`}
        value={answer}
        readOnly={listening}
        disabled={submitting}
        onKeyDown={onKeyDown}
        onChange={(event) => {
          if (mode === "voice") {
            replaceTranscript(event.target.value);
          } else {
            typingStartedRef.current ??= Date.now();
            setTyped(event.target.value);
          }
        }}
        placeholder={mode === "voice" ? "Your words will appear here as you speak." : "Type your answer as you would say it in the interview…"}
        rows={mode === "voice" ? 5 : 8}
        className="w-full resize-y rounded-xl border border-white/10 bg-black/20 p-4 text-[15px] leading-relaxed placeholder:text-muted-foreground/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={submitting || !answer}>
          <RotateCcw /> Clear
        </Button>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">Ctrl + Enter to submit</span>
          <Button type="button" variant="gradient" onClick={submit} disabled={submitting || listening || !answer.trim()}>
            {submitting ? (
              <>
                <LoaderCircle className="animate-spin" aria-hidden="true" /> Reviewing your answer…
              </>
            ) : (
              <>
                <Send aria-hidden="true" /> Submit answer
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
