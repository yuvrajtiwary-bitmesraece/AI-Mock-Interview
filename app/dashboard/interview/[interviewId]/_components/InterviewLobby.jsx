"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { toast } from "sonner";
import { Camera, CameraOff, CircleAlert, CircleCheck, FileText, Lightbulb, LoaderCircle, Play, ShieldCheck } from "lucide-react";

import { MicCheck } from "@/components/interview/MicCheck";
import { useRecordingSupport, useSpeechSupport } from "@/components/interview/useSpeechSupport";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accent, PageHeader } from "@/components/ui/page-header";
import { difficultyLabel, interviewTips, interviewTypeLabel } from "@/utils/interview-options";

// The camera library is only downloaded when someone turns the preview on.
const Webcam = dynamic(() => import("react-webcam"), {
  ssr: false,
  loading: () => <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Starting the camera" />,
});

const STEPS = [
  { title: "Hear the question", text: "Read it on screen, or have it read aloud." },
  { title: "Answer out loud or type", text: "Gemini transcribes your answer when you stop, technical terms included. Edit it before you submit." },
  { title: "Get instant feedback", text: "Each answer is scored on four skills with tips, and you get a coaching report at the end." },
];

/** The screen before the interview: what to expect, tips, and a camera and microphone check. */
export default function InterviewLobby({ interview, questionCount }) {
  const [cameraOn, setCameraOn] = useState(false);
  const canRecord = useRecordingSupport();
  const livePreview = useSpeechSupport();

  // Unmounting the webcam releases the camera.
  const stopCamera = () => setCameraOn(false);

  const minutes = Math.max(5, Math.round(questionCount * 2.5));
  const years = `${interview.jobExperience} ${interview.jobExperience === "1" ? "year" : "years"} of experience`;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        className="mb-10"
        back={{ href: "/dashboard", label: "Dashboard" }}
        eyebrow="Get ready"
        title={
          <>
            Your <Accent>{interviewTypeLabel(interview.interviewType).toLowerCase()} interview</Accent>
          </>
        }
        description={`${interview.jobPosition}${interview.company ? ` at ${interview.company}` : ""} · ${years}`}
      />
      <div className="-mt-4 mb-10 flex flex-wrap gap-2">
        <Badge variant="primary">{interviewTypeLabel(interview.interviewType)}</Badge>
        <Badge>{difficultyLabel(interview.difficulty)}</Badge>
        <Badge>{questionCount} questions</Badge>
        <Badge>About {minutes} min</Badge>
        {interview.resumeUsed && (
          <Badge variant="success">
            <FileText className="h-3 w-3" aria-hidden="true" /> Tailored to your resume
          </Badge>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <section className="surface p-6 sm:p-7">
            <h2 className="text-lg font-semibold tracking-tight">How it works</h2>
            <ol className="mt-6 space-y-6">
              {STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-[#0c0c0f] font-mono text-sm font-medium text-ember-2">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-6 sm:p-7">
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-amber-100">
              <Lightbulb className="h-5 w-5 text-amber-300" aria-hidden="true" /> Tips for this interview
            </h2>
            <ul className="mt-5 space-y-3">
              {interviewTips(interview.interviewType).map((tip) => (
                <li key={tip} className="flex gap-2.5 text-sm leading-relaxed text-amber-50/85">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" aria-hidden="true" />
                  {tip}
                </li>
              ))}
            </ul>
          </section>

          <p className="flex items-start gap-2.5 px-1 text-sm leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
            Your camera preview never leaves your device. Voice answers are sent to Google Gemini once to be transcribed and are never stored. Only
            the text of your answers is saved, so you can review your feedback.
          </p>
        </div>

        <aside className="space-y-4 lg:col-span-2">
          <section className="surface p-6 sm:p-7">
            <h2 className="text-lg font-semibold tracking-tight">Check your setup</h2>

            <div className="mt-6">
              <p className="mb-3 text-sm font-medium">Microphone</p>
              <MicCheck />
            </div>

            <div className="mt-7 border-t border-white/[0.07] pt-7">
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
              <div className="grid aspect-video place-items-center overflow-hidden rounded-xl border border-white/[0.08] bg-black/40">
                {cameraOn ? (
                  <Webcam
                    mirrored
                    audio={false}
                    onUserMediaError={() => {
                      toast.error("Couldn't start the camera. Check your browser's camera permission.");
                      setCameraOn(false);
                    }}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <p className="px-6 text-center text-sm leading-relaxed text-muted-foreground">
                    A camera helps you practice eye contact and body language. It stays on your device.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-7 border-t border-white/[0.07] pt-7">
              {canRecord === false ? (
                <p className="flex items-start gap-2 text-sm text-amber-200">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  This browser can&apos;t record audio, so you&apos;ll type your answers.
                </p>
              ) : canRecord ? (
                <p className="flex items-start gap-2 text-sm text-emerald-300">
                  <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {livePreview
                    ? "Voice answers work in this browser, with a live preview while you speak. You can also type."
                    : "Voice answers work in this browser. Your words appear when you stop recording. You can also type."}
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
