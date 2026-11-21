"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Webcam from "react-webcam";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  CameraOff,
  CircleAlert,
  CircleCheck,
  FileText,
  Lightbulb,
  Play,
  ShieldCheck,
} from "lucide-react";

import { MicCheck } from "@/components/interview/MicCheck";
import { useSpeechSupport } from "@/components/interview/useSpeechSupport";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { difficultyLabel, interviewTips, interviewTypeLabel } from "@/utils/interview-options";

const STEPS = [
  { title: "Hear the question", text: "Read it on screen, or have it read aloud." },
  { title: "Answer out loud", text: "Your speech is transcribed live. Edit the text before you submit." },
  { title: "Get feedback", text: "Each answer gets a score and tips, plus a full report at the end." },
];

/** Pre-interview screen: what to expect, tips, and a camera and microphone check. */
export default function InterviewLobby({ interview, questionCount }) {
  const [cameraOn, setCameraOn] = useState(false);
  const webcamRef = useRef(null);
  const speechSupported = useSpeechSupport();

  const stopCamera = () => {
    // `stream` is null until the camera has started, so guard against it.
    webcamRef.current?.stream?.getTracks().forEach((track) => track.stop());
    setCameraOn(false);
  };

  const minutes = Math.max(5, Math.round(questionCount * 2.5));

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard
      </Link>

      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-bold sm:text-4xl">
          Get ready for your <span className="text-gradient">{interviewTypeLabel(interview.interviewType).toLowerCase()} interview</span>
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          {interview.jobPosition}
          {interview.company ? ` at ${interview.company}` : ""} · {interview.jobExperience} {interview.jobExperience === "1" ? "year" : "years"} of experience
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="primary">{interviewTypeLabel(interview.interviewType)}</Badge>
          <Badge variant="violet">{difficultyLabel(interview.difficulty)}</Badge>
          <Badge>{questionCount} questions</Badge>
          <Badge>About {minutes} min</Badge>
          {interview.resumeUsed && (
            <Badge variant="success">
              <FileText className="h-3 w-3" aria-hidden="true" /> Tailored to your resume
            </Badge>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <section className="glass p-6">
            <h2 className="text-lg font-semibold">How it works</h2>
            <ol className="mt-5 space-y-5">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-200">
              <Lightbulb className="h-5 w-5" aria-hidden="true" /> Tips for this interview
            </h2>
            <ul className="mt-4 space-y-2.5">
              {interviewTips(interview.interviewType).map((tip) => (
                <li key={tip} className="flex gap-2.5 text-sm text-amber-50/90">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" aria-hidden="true" />
                  {tip}
                </li>
              ))}
            </ul>
          </section>

          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
            Your camera preview never leaves your device, and no audio or video is recorded. Only the text of your answers is saved, so you can review your feedback.
          </p>
        </div>

        <aside className="space-y-6 lg:col-span-2">
          <section className="glass p-6">
            <h2 className="text-lg font-semibold">Check your setup</h2>

            <div className="mt-5">
              <p className="mb-3 text-sm font-medium">Microphone</p>
              <MicCheck />
            </div>

            <div className="mt-6 border-t border-white/10 pt-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium">
                  Camera <span className="font-normal text-muted-foreground">(optional)</span>
                </p>
                {cameraOn ? (
                  <Button type="button" variant="glass" size="sm" onClick={stopCamera}>
                    <CameraOff /> Turn off
                  </Button>
                ) : (
                  <Button type="button" variant="glass" size="sm" onClick={() => setCameraOn(true)}>
                    <Camera /> Preview
                  </Button>
                )}
              </div>
              <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/40">
                {cameraOn ? (
                  <Webcam
                    ref={webcamRef}
                    mirrored
                    audio={false}
                    onUserMediaError={() => {
                      toast.error("Couldn't start the camera. Check your browser's camera permission.");
                      setCameraOn(false);
                    }}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <p className="px-6 text-center text-sm text-muted-foreground">
                    A camera helps you practice eye contact and body language. It stays on your device.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 border-t border-white/10 pt-6">
              {speechSupported === false ? (
                <p className="flex items-start gap-2 text-sm text-amber-200">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  This browser can&apos;t transcribe speech. Use Chrome or Edge to answer out loud.
                </p>
              ) : speechSupported ? (
                <p className="flex items-start gap-2 text-sm text-emerald-300">
                  <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  Voice answers are supported in this browser.
                </p>
              ) : null}
            </div>
          </section>

          <Button asChild variant="gradient" size="xl" className="w-full">
            <Link href={`/dashboard/interview/${interview.mockId}/start`}>
              <Play aria-hidden="true" /> Start interview
            </Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
