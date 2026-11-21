import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronDown, Gauge, MessageSquareText, Mic, Play, Timer } from "lucide-react";

import { CriteriaBars, DeliveryStats, ReviewDetails, ScoreBadge, scoreTone } from "@/components/interview/feedback-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getViewer } from "@/utils/auth";
import { formatDisplayDate, getCreatedDate } from "@/utils/dates";
import { difficultyLabel, interviewTypeLabel } from "@/utils/interview-options";
import { getAnswersForInterview, getOwnedInterview } from "@/utils/queries";
import { parseInterviewQuestions } from "@/utils/questions";
import { parseRating } from "@/utils/rating";
import { answersSignature, latestAnswersByIndex, normalizeReview, summarizeAnswers } from "@/utils/report";
import { formatDuration } from "@/utils/speech";

import AiReport from "./_components/AiReport";
import { PrintButton, RetakeButton } from "./_components/ReportActions";

export const metadata = { title: "Interview report" };

/** Circular gauge for the overall 0-5 score. */
function ScoreRing({ score }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const fraction = Number.isFinite(score) ? score / 5 : 0;
  const color = !Number.isFinite(score) ? "#475569" : score >= 4.5 ? "#34d399" : score >= 3.5 ? "#22d3ee" : score >= 2.5 ? "#fbbf24" : "#f87171";

  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-4xl font-bold">{Number.isFinite(score) ? score.toFixed(1) : "–"}</span>
        <span className="text-xs text-muted-foreground">out of 5</span>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
      </dt>
      <dd className="mt-1 font-mono text-lg font-semibold">{value}</dd>
    </div>
  );
}

/** One question: collapsed to a summary row, expanding to the full review. */
function QuestionReport({ index, question, row, mockId }) {
  const score = row ? parseRating(row.rating) : null;
  const review = row ? normalizeReview({ ...row.analysis, rating: score, feedback: row.feedback }) : null;

  return (
    <details className="glass group break-inside-avoid-page overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center gap-4 p-5 transition-colors hover:bg-white/[0.03]">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border font-mono text-sm font-semibold",
            row ? scoreTone(score) : "border-white/10 text-muted-foreground"
          )}
        >
          {index + 1}
        </span>
        <span className="flex-1 font-medium leading-snug">{question.ques}</span>
        {row ? <ScoreBadge score={score} className="hidden sm:inline-flex" /> : <Badge>Not answered</Badge>}
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 print:hidden" aria-hidden="true" />
      </summary>

      <div className="space-y-6 border-t border-white/10 p-5 sm:p-6">
        {row ? (
          <>
            {review.feedback && <p className="leading-relaxed text-foreground/90">{review.feedback}</p>}
            <CriteriaBars criteria={review.criteria} compact />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <h4 className="mb-2 text-sm font-semibold text-cyan-200">Your answer</h4>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{row.userAnswer}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <h4 className="mb-2 text-sm font-semibold text-emerald-200">Model answer</h4>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{row.correctAns || "Not available."}</p>
              </div>
            </div>

            <ReviewDetails review={review} />
            {row.metrics && (
              <div className="border-t border-white/10 pt-4">
                <DeliveryStats metrics={row.metrics} />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">You haven&apos;t answered this question yet.</p>
            <Button asChild variant="glass" size="sm" className="print:hidden">
              <Link href={`/dashboard/interview/${mockId}/start?q=${index}`}>
                Answer now <ArrowRight />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </details>
  );
}

export default async function InterviewReportPage({ params }) {
  const { interviewId } = await params;

  // 404 for interviews that don't exist or belong to someone else.
  const interview = await getOwnedInterview(await getViewer(), interviewId);
  if (!interview) notFound();

  const questions = parseInterviewQuestions(interview.jsonMockResp);
  const latest = latestAnswersByIndex(await getAnswersForInterview(interview.mockId), questions);
  const rows = [...latest.values()];
  const summary = summarizeAnswers(rows);
  const cachedReport = interview.report?.signature === answersSignature(rows) ? interview.report : null;
  const unanswered = questions.length - rows.length;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground print:hidden"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-sm font-medium text-primary">Interview report</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
            {interview.jobPosition}
            {interview.company ? <span className="text-muted-foreground"> · {interview.company}</span> : null}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="primary">{interviewTypeLabel(interview.interviewType)}</Badge>
            <Badge variant="violet">{difficultyLabel(interview.difficulty)}</Badge>
            <Badge>{formatDisplayDate(getCreatedDate(interview))}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          {unanswered > 0 && rows.length > 0 && (
            <Button asChild variant="gradient">
              <Link href={`/dashboard/interview/${interview.mockId}/start`}>
                <Play /> Continue ({unanswered} left)
              </Link>
            </Button>
          )}
          {rows.length > 0 && <PrintButton />}
          <RetakeButton mockId={interview.mockId} />
        </div>
      </header>

      {rows.length === 0 ? (
        <section className="glass flex flex-col items-center px-6 py-16 text-center">
          <Mic className="h-10 w-10 text-primary" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-semibold">No answers yet</h2>
          <p className="mt-2 max-w-md text-muted-foreground">Answer at least one question to get scores, feedback and your AI coaching report.</p>
          <Button asChild variant="gradient" size="lg" className="mt-6">
            <Link href={`/dashboard/interview/${interview.mockId}/start`}>
              <Play /> Start the interview
            </Link>
          </Button>
        </section>
      ) : (
        <>
          <section className="grid gap-6 md:grid-cols-3">
            <div className="glass flex flex-col items-center justify-center gap-3 p-6 text-center">
              <ScoreRing score={summary.overall} />
              <p className="font-medium">Overall score</p>
              <p className="text-sm text-muted-foreground">
                {summary.answered} of {questions.length} questions answered
              </p>
            </div>

            <div className="glass p-6 md:col-span-2">
              <h2 className="mb-5 text-lg font-semibold">Skills breakdown</h2>
              {Object.values(summary.criteria).some(Number.isFinite) ? (
                <CriteriaBars criteria={summary.criteria} />
              ) : (
                <p className="text-sm text-muted-foreground">Answers given before rubric scoring existed only have an overall score.</p>
              )}
              {summary.delivery && (
                <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
                  <Stat icon={Timer} label="Speaking time" value={formatDuration(summary.delivery.speakingSec)} />
                  <Stat icon={Gauge} label="Avg. pace" value={summary.delivery.avgWordsPerMinute ? `${summary.delivery.avgWordsPerMinute} wpm` : "–"} />
                  <Stat icon={MessageSquareText} label="Filler words" value={String(summary.delivery.fillerCount)} />
                </dl>
              )}
            </div>
          </section>

          <AiReport mockId={interview.mockId} initialReport={cachedReport} />
        </>
      )}

      <section aria-labelledby="questions-heading" className="space-y-4">
        <h2 id="questions-heading" className="text-lg font-semibold">
          Question by question
        </h2>
        {questions.map((question, index) => (
          <QuestionReport key={index} index={index} question={question} row={latest.get(index)} mockId={interview.mockId} />
        ))}
      </section>
    </div>
  );
}
