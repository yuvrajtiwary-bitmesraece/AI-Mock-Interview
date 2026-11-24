import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronDown, Gauge, MessageSquareText, Mic, Play, Timer } from "lucide-react";

import { CriteriaBars, DeliveryStats, ReviewDetails, ScoreBadge, scoreTone } from "@/components/interview/feedback-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import { getViewer } from "@/utils/auth";
import { formatDisplayDate, getCreatedDate } from "@/utils/dates";
import { difficultyLabel, interviewTypeLabel } from "@/utils/interview-options";
import { getOwnedInterviewWithAnswers, waitForReport } from "@/utils/queries";
import { parseInterviewQuestions } from "@/utils/questions";
import { parseRating } from "@/utils/rating";
import { answersSignature, latestAnswersByIndex, normalizeReview, reportWaitMs, summarizeAnswers } from "@/utils/report";
import { formatDuration } from "@/utils/speech";

import AiReport from "./_components/AiReport";
import { PrintButton, RetakeButton } from "./_components/ReportActions";

export const metadata = { title: "Interview report" };

/** Colour of the overall score ring, by score. */
function ringColor(score) {
  if (!Number.isFinite(score)) return "#52525b";
  if (score >= 4.5) return "#34d399";
  if (score >= 3.5) return "#ff813d";
  if (score >= 2.5) return "#fcd34d";
  return "#f87171";
}

/** A circular gauge for the overall 0 to 5 score. */
function ScoreRing({ score }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const fraction = Number.isFinite(score) ? score / 5 : 0;

  return (
    <div className="relative h-40 w-40">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={ringColor(score)}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-semibold tracking-[-0.04em]">{Number.isFinite(score) ? score.toFixed(1) : "–"}</span>
        <span className="mt-0.5 text-xs text-muted-foreground">out of 5</span>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
      </dt>
      <dd className="mt-1.5 text-lg font-semibold tracking-tight">{value}</dd>
    </div>
  );
}

/** One question: a summary row that opens to the full review. */
function QuestionReport({ index, question, row, mockId }) {
  const score = row ? parseRating(row.rating) : null;
  const review = row ? normalizeReview({ ...row.analysis, rating: score, feedback: row.feedback }) : null;

  return (
    <details className="accordion surface group break-inside-avoid-page overflow-clip">
      <summary className="flex cursor-pointer items-center gap-4 p-5 transition-colors duration-300 hover:bg-white/[0.025] sm:px-6">
        <span
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-xl border font-mono text-sm font-semibold",
            row ? scoreTone(score) : "border-white/10 text-muted-foreground"
          )}
        >
          {index + 1}
        </span>
        <span className="flex-1 font-medium leading-snug">{question.ques}</span>
        {row ? <ScoreBadge score={score} className="hidden sm:inline-flex" /> : <Badge>Not answered</Badge>}
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-500 ease-out-expo group-open:rotate-180 print:hidden"
          aria-hidden="true"
        />
      </summary>

      <div className="space-y-6 border-t border-white/[0.07] p-5 sm:p-6">
        {row ? (
          <>
            {review.feedback && <p className="leading-relaxed text-foreground/90">{review.feedback}</p>}
            <CriteriaBars criteria={review.criteria} compact />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
                <h4 className="mb-2 text-sm font-semibold text-ember-1">Your answer</h4>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">{row.userAnswer}</p>
              </div>
              <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
                <h4 className="mb-2 text-sm font-semibold text-emerald-200">Model answer</h4>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">{row.correctAns || "Not available."}</p>
              </div>
            </div>

            <ReviewDetails review={review} />
            {row.metrics && (
              <div className="border-t border-white/[0.07] pt-5">
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

/**
 * The coaching report once the background job has saved it (saveAnswer starts
 * one after the last answer). If it isn't saved in time, AiReport asks for it.
 */
async function PreparedReport({ mockId, signature, waitMs }) {
  const report = await waitForReport(mockId, signature, waitMs);
  return <AiReport mockId={mockId} initialReport={report} />;
}

export default async function InterviewReportPage({ params }) {
  const { interviewId } = await params;

  // 404 for interviews that don't exist or belong to someone else.
  const { interview, answers } = await getOwnedInterviewWithAnswers(await getViewer(), interviewId);
  if (!interview) notFound();

  const questions = parseInterviewQuestions(interview.jsonMockResp);
  const latest = latestAnswersByIndex(answers, questions);
  const rows = [...latest.values()];
  const summary = summarizeAnswers(rows);
  const signature = answersSignature(rows);
  const cachedReport = interview.report?.signature === signature ? interview.report : null;
  // If the last answer was saved moments ago, its report is probably still
  // being written in the background: wait for that one (the rest of the page
  // shows straight away) instead of asking Gemini for a second one.
  const waitMs = cachedReport ? 0 : reportWaitMs(rows, questions.length);
  const unanswered = questions.length - rows.length;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader
        className="mb-6"
        back={{ href: "/dashboard", label: "Dashboard" }}
        eyebrow="Interview report"
        title={
          <>
            {interview.jobPosition}
            {interview.company ? <span className="text-muted-foreground"> · {interview.company}</span> : null}
          </>
        }
        actions={
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
        }
      />
      <div className="flex flex-wrap gap-2 pb-4">
        <Badge variant="primary">{interviewTypeLabel(interview.interviewType)}</Badge>
        <Badge>{difficultyLabel(interview.difficulty)}</Badge>
        <Badge>{formatDisplayDate(getCreatedDate(interview))}</Badge>
      </div>

      {rows.length === 0 ? (
        <section className="surface flex flex-col items-center px-6 py-20 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-ember-2">
            <Mic className="h-6 w-6" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-xl font-semibold tracking-tight">No answers yet</h2>
          <p className="mt-2 max-w-md text-muted-foreground">Answer at least one question to get scores, feedback and your AI coaching report.</p>
          <Button asChild variant="gradient" size="lg" className="mt-8">
            <Link href={`/dashboard/interview/${interview.mockId}/start`}>
              <Play /> Start the interview
            </Link>
          </Button>
        </section>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <div className="surface flex flex-col items-center justify-center gap-3 p-7 text-center">
              <ScoreRing score={summary.overall} />
              <p className="font-medium">Overall score</p>
              <p className="text-sm text-muted-foreground">
                {summary.answered} of {questions.length} questions answered
              </p>
            </div>

            <div className="surface p-6 sm:p-7 md:col-span-2">
              <h2 className="mb-6 text-lg font-semibold tracking-tight">Skills breakdown</h2>
              {Object.values(summary.criteria).some(Number.isFinite) ? (
                <CriteriaBars criteria={summary.criteria} />
              ) : (
                <p className="text-sm text-muted-foreground">Answers given before rubric scoring existed only have an overall score.</p>
              )}
              {summary.delivery && (
                <dl className="mt-7 grid grid-cols-3 gap-3 border-t border-white/[0.07] pt-6">
                  <Stat icon={Timer} label="Speaking time" value={formatDuration(summary.delivery.speakingSec)} />
                  <Stat icon={Gauge} label="Avg. pace" value={summary.delivery.avgWordsPerMinute ? `${summary.delivery.avgWordsPerMinute} wpm` : "–"} />
                  <Stat icon={MessageSquareText} label="Filler words" value={String(summary.delivery.fillerCount)} />
                </dl>
              )}
            </div>
          </section>

          {waitMs > 0 ? (
            <Suspense fallback={<AiReport mockId={interview.mockId} initialReport={null} waiting />}>
              <PreparedReport mockId={interview.mockId} signature={signature} waitMs={waitMs} />
            </Suspense>
          ) : (
            <AiReport mockId={interview.mockId} initialReport={cachedReport} />
          )}
        </>
      )}

      <section aria-labelledby="questions-heading" className="space-y-3 pt-8">
        <h2 id="questions-heading" className="mb-2 text-2xl font-semibold tracking-[-0.03em]">
          Question by question
        </h2>
        {questions.map((question, index) => (
          <QuestionReport key={index} index={index} question={question} row={latest.get(index)} mockId={interview.mockId} />
        ))}
      </section>
    </div>
  );
}
