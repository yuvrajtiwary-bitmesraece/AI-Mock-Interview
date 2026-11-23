"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Keyboard, LoaderCircle, Mic, RotateCcw, Send, Sparkles, Square } from "lucide-react";

import { saveAnswer, transcribeAnswer } from "@/actions/interview";
import { useAudioRecorder } from "@/components/interview/useAudioRecorder";
import { useSpeechRecognition } from "@/components/interview/useSpeechRecognition";
import { useRecordingSupport, useSpeechLanguage, useSpeechSupport } from "@/components/interview/useSpeechSupport";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAX_RECORDING_SECONDS } from "@/utils/audio";
import { countWords, formatDuration } from "@/utils/speech";

// Only microphone problems interrupt the answer. Other preview errors (such as
// "network") just stop the live preview; the recording continues.
const MICROPHONE_ERRORS = new Set(["not-allowed", "service-not-allowed", "audio-capture"]);

const WAVE_BARS = [0, 120, 240, 360, 480, 600, 720];

// What the reviewer is doing, shown in turn while the answer is being reviewed.
const REVIEW_STEPS = ["Reading your answer", "Scoring it on four skills", "Writing tips and a stronger version"];

const joinText = (...parts) => parts.map((part) => part.trim()).filter(Boolean).join(" ");

/**
 * Stands in for the feedback card while Gemini reviews the answer: the same
 * shape, plus what is happening right now, so the wait feels shorter.
 */
function ReviewProgress() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setStep((current) => Math.min(current + 1, REVIEW_STEPS.length - 1)), 1600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div role="status" aria-live="polite" className="mt-6 animate-page-in rounded-xl border border-white/[0.07] bg-black/20 p-5">
      <p className="flex items-center gap-2.5 text-sm text-foreground/85">
        <LoaderCircle className="h-4 w-4 animate-spin text-ember-2" aria-hidden="true" />
        {REVIEW_STEPS[step]}…
      </p>
      <div className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-2">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton h-1.5 rounded-full" />
          </div>
        ))}
      </div>
      <div className="skeleton mt-5 h-14 rounded-lg" aria-hidden="true" />
    </div>
  );
}

/**
 * Where the candidate answers one question, by voice or by typing, then
 * submits the answer for AI review. Mounted fresh for each question.
 *
 * Voice answers are recorded and transcribed by Gemini when the recording
 * stops, which is far more accurate than the browser's speech recognition,
 * especially for accents and technical terms. Where the browser supports it,
 * its recognizer shows a live preview while the candidate speaks.
 */
export default function AnswerComposer({ mockId, questionIndex, initialText = "", onSaved }) {
  const canRecord = useRecordingSupport();
  const livePreview = useSpeechSupport();
  const speechLanguage = useSpeechLanguage();

  const [chosenMode, setChosenMode] = useState(null);
  const mode = chosenMode ?? (canRecord === false ? "text" : "voice");

  const [voiceText, setVoiceText] = useState(initialText);
  const [typed, setTyped] = useState(initialText);
  const [status, setStatus] = useState("idle"); // idle | starting | recording | transcribing | submitting
  const [transcribed, setTranscribed] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const autoStopRef = useRef(null);
  const typingStartedRef = useRef(null);

  const recorder = useAudioRecorder();
  const preview = useSpeechRecognition({
    lang: speechLanguage,
    onError: (code) => {
      if (MICROPHONE_ERRORS.has(code)) toast.error("Microphone access is blocked. Allow it in your browser's site settings.");
    },
  });

  // Count speaking time while recording.
  useEffect(() => {
    if (status !== "recording") return undefined;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  // Stop the auto-stop timer when leaving the question.
  useEffect(() => () => clearTimeout(autoStopRef.current), []);

  const busy = status !== "idle";
  const recording = status === "recording";
  // While recording, the text box is read-only, so voiceText is the text from before this recording.
  const shownVoiceText = recording ? joinText(voiceText, preview.transcript) : voiceText;
  const answer = mode === "voice" ? shownVoiceText : typed;
  const words = countWords(answer);

  const stopRecording = async () => {
    // voiceText can't change while recording, so this is the text from before the recording,
    // even when the five-minute auto-stop calls this from an earlier render.
    const base = voiceText;
    clearTimeout(autoStopRef.current);
    preview.stop();
    const previewText = preview.getTranscript();
    setStatus("transcribing");
    // Show the live preview (if any) until Gemini's transcript arrives.
    setVoiceText(joinText(base, previewText));

    const audio = await recorder.stop();
    if (!audio) {
      toast.error("No audio was recorded. Check your microphone and try again.");
      setStatus("idle");
      return;
    }

    const formData = new FormData();
    formData.set("mockId", mockId);
    formData.set("questionIndex", String(questionIndex));
    formData.set("audio", audio, "answer");

    try {
      const result = await transcribeAnswer(formData);
      if (result?.success) {
        setVoiceText(joinText(base, result.transcript));
        setTranscribed(true);
      } else {
        toast.error(`${result?.error ?? "Transcription failed."} You can edit the text, or type your answer.`);
      }
    } catch {
      toast.error("Couldn't transcribe your answer. Check your connection, then try again or type your answer.");
    }
    setStatus("idle");
  };

  const startRecording = async () => {
    setStatus("starting");
    try {
      await recorder.start();
    } catch {
      toast.error("Couldn't use the microphone. Allow microphone access, or type your answer instead.");
      setStatus("idle");
      return;
    }
    if (livePreview) {
      preview.replaceTranscript("");
      preview.start();
    }
    setTranscribed(false);
    setStatus("recording");
    autoStopRef.current = setTimeout(() => {
      toast.info("Recordings are limited to five minutes, so this one stopped automatically.");
      stopRecording();
    }, MAX_RECORDING_SECONDS * 1000);
  };

  const switchMode = (next) => {
    if (next === mode || busy) return;
    // Carry the text over, so switching never loses what was said or typed.
    if (next === "text") setTyped(voiceText);
    else setVoiceText(typed);
    setChosenMode(next);
  };

  const clear = () => {
    setVoiceText("");
    setTyped("");
    setSeconds(0);
    setTranscribed(false);
    typingStartedRef.current = null;
  };

  const submit = async () => {
    if (busy) return;
    const text = answer.trim();
    if (countWords(text) < 3) {
      toast.error("Your answer is too short. Say or type a little more.");
      return;
    }

    setStatus("submitting");
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
    setStatus("idle");
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      submit();
    }
  };

  const voiceHint = {
    starting: "Starting the microphone…",
    recording: livePreview ? "Listening… press the button when you're done." : "Recording… your words appear when you stop.",
    transcribing: "Transcribing your answer with Gemini…",
  }[status] ?? (transcribed ? "Check the transcript and fix anything misheard, then submit." : "Press the button and answer out loud.");

  return (
    <section className="surface p-6 sm:p-7" aria-label="Your answer">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Answer mode" className="inline-flex rounded-full border border-white/[0.08] bg-black/20 p-1">
          {[
            { id: "voice", label: "Speak", icon: Mic, disabled: canRecord === false },
            { id: "text", label: "Type", icon: Keyboard, disabled: false },
          ].map(({ id, label, icon: Icon, disabled }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              disabled={disabled || busy}
              onClick={() => switchMode(id)}
              title={disabled ? "This browser can't record audio" : undefined}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-[background-color,color] duration-300 ease-out-expo hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
                mode === id && "bg-white/[0.09] text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]"
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
        <div className="mb-6 flex flex-col items-center gap-4 py-3">
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            disabled={busy && !recording}
            aria-pressed={recording}
            className={cn(
              "relative grid h-20 w-20 place-items-center rounded-full transition-[transform,box-shadow] duration-300 ease-out-expo hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 active:scale-95 disabled:opacity-50",
              recording
                ? "bg-red-500 text-white shadow-[0_16px_40px_-12px_rgb(239_68_68/0.7)]"
                : "bg-[linear-gradient(135deg,hsl(var(--ember-1)),hsl(var(--ember-2))_50%,hsl(var(--ember-3)))] text-[#141014] shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_16px_40px_-12px_hsl(var(--ember-2)/0.75)]"
            )}
          >
            {recording && <span className="absolute inset-0 animate-ping rounded-full bg-red-500/40" aria-hidden="true" />}
            {status === "transcribing" || status === "starting" ? (
              <LoaderCircle className="h-8 w-8 animate-spin" aria-hidden="true" />
            ) : recording ? (
              <Square className="relative h-7 w-7 fill-current" aria-hidden="true" />
            ) : (
              <Mic className="h-8 w-8" aria-hidden="true" />
            )}
            <span className="sr-only">{recording ? "Stop recording" : "Start recording"}</span>
          </button>
          <div className="flex h-6 items-center gap-1 overflow-hidden" aria-hidden="true">
            {WAVE_BARS.map((delay) => (
              <span
                key={delay}
                className={cn("h-full w-1 origin-center rounded-full bg-ember-2/85", recording ? "animate-wave" : "scale-y-[0.25] opacity-40")}
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground" aria-live="polite">
            {voiceHint}
          </p>
        </div>
      )}

      <label htmlFor={`answer-${questionIndex}`} className="sr-only">
        Your answer
      </label>
      <textarea
        id={`answer-${questionIndex}`}
        value={answer}
        readOnly={mode === "voice" && busy}
        disabled={status === "submitting"}
        onKeyDown={onKeyDown}
        onChange={(event) => {
          if (mode === "voice") {
            setVoiceText(event.target.value);
          } else {
            typingStartedRef.current ??= Date.now();
            setTyped(event.target.value);
          }
        }}
        placeholder={mode === "voice" ? "Your answer appears here. You can edit it before submitting." : "Type your answer as you would say it in the interview…"}
        rows={mode === "voice" ? 5 : 8}
        className={cn(
          "w-full resize-y rounded-xl border border-white/10 bg-black/25 p-4 text-[15px] leading-relaxed shadow-[inset_0_1px_2px_rgb(0_0_0/0.35)] transition-[border-color,box-shadow] duration-300 ease-out-expo placeholder:text-muted-foreground/70 hover:border-white/15 focus:outline-none focus-visible:border-primary/60 focus-visible:ring-4 focus-visible:ring-primary/15 disabled:opacity-60",
          recording && "text-foreground/70"
        )}
      />
      {mode === "voice" && transcribed && !busy && (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-ember-1">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Transcribed by Gemini. The recording isn&apos;t stored.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={busy || !answer}>
          <RotateCcw /> Clear
        </Button>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">Ctrl + Enter to submit</span>
          <Button type="button" variant="gradient" onClick={submit} disabled={busy || !answer.trim()}>
            {status === "submitting" ? (
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

      {status === "submitting" && <ReviewProgress />}
    </section>
  );
}
