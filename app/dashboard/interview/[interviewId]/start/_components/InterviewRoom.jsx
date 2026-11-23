"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Webcam from "react-webcam";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CameraOff,
  Check,
  Flag,
  Lightbulb,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";

import { CriteriaBars, DeliveryStats, ReviewDetails, ScoreBadge } from "@/components/interview/feedback-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { interviewTips, interviewTypeLabel } from "@/utils/interview-options";
import { averageRating } from "@/utils/rating";

import AnswerComposer from "./AnswerComposer";

/** Numbered buttons for jumping between questions; answered ones show a check. */
function QuestionNav({ total, index, results, onSelect }) {
  return (
    <nav aria-label="Questions" className="flex flex-wrap gap-2">
      {Array.from({ length: total }, (_, i) => {
        const answered = Boolean(results[i]);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-current={i === index ? "step" : undefined}
            aria-label={`Question ${i + 1}${answered ? ", answered" : ""}`}
            className={cn(
              "flex h-9 min-w-9 items-center justify-center gap-1 rounded-full border px-3 font-mono text-[13px] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
              i === index
                ? "border-white/25 bg-foreground text-background"
                : answered
                  ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15"
                  : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:border-white/15 hover:text-foreground"
            )}
          >
            {answered && i !== index ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            {i + 1}
          </button>
        );
      })}
    </nav>
  );
}

/** The current question, with read-aloud and an optional hint. Mounted fresh for each question. */
function QuestionCard({ question, index, total }) {
  const [speaking, setSpeaking] = useState(false);
  const [showTip, setShowTip] = useState(false);

  // Stop reading when the question changes or the page is left.
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const toggleSpeech = () => {
    if (!("speechSynthesis" in window)) {
      toast.error("Your browser can't read text aloud.");
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(question.ques);
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <section className="surface animate-page-in p-6 sm:p-8" aria-labelledby="current-question">
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Question {index + 1} of {total}
        </span>
        {question.topic && <Badge variant="primary">{question.topic}</Badge>}
      </div>
      <h2 id="current-question" className="text-xl font-semibold leading-snug tracking-tight sm:text-[1.65rem] sm:leading-[1.3]">
        {question.ques}
      </h2>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button type="button" variant="glass" size="sm" onClick={toggleSpeech} aria-pressed={speaking}>
          {speaking ? <VolumeX /> : <Volume2 />} {speaking ? "Stop reading" : "Read aloud"}
        </Button>
        {question.tip && (
          <Button type="button" variant="glass" size="sm" onClick={() => setShowTip((value) => !value)} aria-expanded={showTip}>
            <Lightbulb /> {showTip ? "Hide hint" : "Show hint"}
          </Button>
        )}
      </div>
      {showTip && question.tip && (
        <p className="mt-5 animate-page-in rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm leading-relaxed text-amber-50/90">
          {question.tip}
        </p>
      )}
    </section>
  );
}

/** The AI review of a saved answer, with what to do next. */
function ResultCard({ result, onRetry, onNext, nextLabel, feedbackHref }) {
  const { review, metrics, score, answer } = result;
  return (
    <section className="surface animate-page-in space-y-7 p-6 sm:p-7" aria-label="Feedback on your answer" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold tracking-tight">Feedback</h3>
          {review?.feedback && <p className="mt-2 text-sm leading-relaxed text-foreground/85">{review.feedback}</p>}
        </div>
        <ScoreBadge score={score} className="text-base" />
      </div>

      <CriteriaBars criteria={review?.criteria} compact />
      <ReviewDetails review={review} />
      {metrics && (
        <div className="border-t border-white/[0.07] pt-5">
          <DeliveryStats metrics={metrics} />
        </div>
      )}

      {answer && (
        <details className="accordion group rounded-xl border border-white/[0.08] bg-black/20 px-4">
          <summary className="cursor-pointer py-4 text-sm font-medium text-muted-foreground transition-colors duration-300 hover:text-foreground">
            Your answer
          </summary>
          <p className="whitespace-pre-line pb-4 text-sm leading-relaxed text-foreground/90">{answer}</p>
        </details>
      )}

      <div className="flex flex-wrap justify-between gap-3 border-t border-white/[0.07] pt-6">
        <Button type="button" variant="glass" onClick={onRetry}>
          <RotateCcw /> Answer again
        </Button>
        {onNext ? (
          <Button type="button" onClick={onNext}>
            {nextLabel} <ArrowRight />
          </Button>
        ) : (
          <Button asChild variant="gradient">
            <Link href={feedbackHref}>
              <Flag /> See your report
            </Link>
          </Button>
        )}
      </div>
    </section>
  );
}

function CameraPanel() {
  const [on, setOn] = useState(false);
  const webcamRef = useRef(null);

  const turnOff = () => {
    webcamRef.current?.stream?.getTracks().forEach((track) => track.stop());
    setOn(false);
  };

  return (
    <section className="surface overflow-hidden" aria-label="Camera">
      <div className="grid aspect-video place-items-center bg-black/40">
        {on ? (
          <Webcam
            ref={webcamRef}
            mirrored
            audio={false}
            className="h-full w-full object-cover"
            onUserMediaError={() => {
              toast.error("Couldn't start the camera. Check your browser's camera permission.");
              setOn(false);
            }}
          />
        ) : (
          <p className="px-6 text-center text-sm leading-relaxed text-muted-foreground">
            Practice eye contact by watching yourself answer. Nothing is recorded.
          </p>
        )}
      </div>
      <div className="flex justify-end border-t border-white/[0.06] p-3">
        {on ? (
          <Button type="button" variant="glass" size="sm" onClick={turnOff}>
            <CameraOff /> Camera off
          </Button>
        ) : (
          <Button type="button" variant="glass" size="sm" onClick={() => setOn(true)}>
            <Camera /> Camera on
          </Button>
        )}
      </div>
    </section>
  );
}

/**
 * The interview: one question at a time, answered by voice or text, with
 * instant feedback after each answer. `saved` holds answers from earlier
 * visits, keyed by question index.
 */
export default function InterviewRoom({ interview, questions, saved, initialIndex }) {
  const [index, setIndex] = useState(initialIndex);
  const [results, setResults] = useState(saved);
  const [retrying, setRetrying] = useState({});

  const total = questions.length;
  const question = questions[index];
  const result = results[index];
  const answeredCount = Object.keys(results).length;
  const average = averageRating(Object.values(results).map((item) => item.score ?? null));
  const feedbackHref = `/dashboard/interview/${interview.mockId}/feedback`;
  const nextUnanswered = questions.findIndex((_, i) => i > index && !results[i]);

  const goTo = (next) => {
    setIndex(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSaved = (data) => {
    setResults((current) => ({ ...current, [index]: data }));
    setRetrying((current) => ({ ...current, [index]: false }));
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href={`/dashboard/interview/${interview.mockId}`}
            className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 ease-out-expo group-hover:-translate-x-0.5" aria-hidden="true" />{" "}
            {interview.jobPosition}
          </Link>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {interviewTypeLabel(interview.interviewType)} interview · {answeredCount} of {total} answered
          </p>
        </div>
        <Button asChild variant={answeredCount === total ? "gradient" : "glass"}>
          <Link href={feedbackHref}>
            <Flag /> {answeredCount === total ? "See your report" : "Finish interview"}
          </Link>
        </Button>
      </div>

      <div className="mb-8 h-1 overflow-hidden rounded-full bg-white/[0.07]" aria-hidden="true">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,hsl(var(--ember-1)),hsl(var(--ember-2))_60%,hsl(var(--ember-3)))] transition-[width] duration-700 ease-out-expo"
          style={{ width: `${(answeredCount / total) * 100}%` }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <QuestionNav total={total} index={index} results={results} onSelect={goTo} />
          <QuestionCard key={`question-${index}`} question={question} index={index} total={total} />

          {result && !retrying[index] ? (
            <ResultCard
              result={result}
              feedbackHref={feedbackHref}
              onRetry={() => setRetrying((current) => ({ ...current, [index]: true }))}
              onNext={
                nextUnanswered !== -1
                  ? () => goTo(nextUnanswered)
                  : index < total - 1
                    ? () => goTo(index + 1)
                    : null
              }
              nextLabel={nextUnanswered !== -1 ? "Next question" : "Next"}
            />
          ) : (
            <AnswerComposer
              key={`answer-${index}-${retrying[index] ? "again" : "new"}`}
              mockId={interview.mockId}
              questionIndex={index}
              initialText={retrying[index] ? (result?.answer ?? "") : ""}
              onSaved={onSaved}
            />
          )}
        </div>

        <aside className="space-y-4 lg:col-span-2">
          <CameraPanel />

          <section className="surface p-6">
            <h2 className="text-sm font-semibold">Your session</h2>
            <dl className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-muted-foreground">Answered</dt>
                <dd className="mt-1.5 text-3xl font-semibold tracking-[-0.03em]">
                  {answeredCount}
                  <span className="text-lg font-normal text-muted-foreground">/{total}</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Average score</dt>
                <dd className="mt-1.5 text-3xl font-semibold tracking-[-0.03em]">{average === null ? "–" : average.toFixed(1)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-100">
              <Lightbulb className="h-4 w-4 text-amber-300" aria-hidden="true" /> Remember
            </h2>
            <ul className="mt-4 space-y-2.5">
              {interviewTips(interview.interviewType).map((tip) => (
                <li key={tip} className="flex gap-2.5 text-sm leading-relaxed text-amber-50/85">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" aria-hidden="true" />
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
