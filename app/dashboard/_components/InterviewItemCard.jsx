"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText, Play, Trash2, TriangleAlert } from "lucide-react";

import { ScoreBadge } from "@/components/interview/feedback-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDisplayDate } from "@/utils/dates";
import { difficultyLabel, interviewTypeLabel } from "@/utils/interview-options";

/**
 * One interview on the dashboard: its settings, progress, score and next step.
 * Deleting closes the dialog at once; the list (InterviewList) removes the
 * card and restores it if the delete fails.
 */
export default function InterviewItemCard({ interview, onDelete }) {
  const [open, setOpen] = useState(false);

  const { mockId, answeredCount, questionCount } = interview;
  const base = `/dashboard/interview/${mockId}`;
  const finished = questionCount > 0 && answeredCount >= questionCount;
  const progress = questionCount ? (answeredCount / questionCount) * 100 : 0;
  const created = formatDisplayDate(interview.createdOn ? new Date(interview.createdOn) : null);
  const years = `${interview.jobExperience} ${interview.jobExperience === "1" ? "year" : "years"}`;

  const remove = () => {
    setOpen(false);
    onDelete(interview);
  };

  return (
    <article className="surface surface-hover flex flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="primary">{interviewTypeLabel(interview.interviewType)}</Badge>
          <Badge>{difficultyLabel(interview.difficulty)}</Badge>
          {interview.resumeUsed && <Badge variant="success">Resume</Badge>}
        </div>
        {answeredCount > 0 && <ScoreBadge score={interview.score} />}
      </div>

      <h3 className="mt-5 text-lg font-semibold leading-snug tracking-tight">{interview.jobPosition}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {interview.company ? `${interview.company} · ` : ""}
        {years} · {created}
      </p>

      <div className="mt-6">
        <div className="mb-2 flex justify-between text-xs text-muted-foreground">
          <span>
            {answeredCount} of {questionCount} answered
          </span>
          {finished && <span className="text-emerald-300">Complete</span>}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]" aria-hidden="true">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,hsl(var(--ember-1)),hsl(var(--ember-2))_60%,hsl(var(--ember-3)))]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2">
        {finished ? (
          <Button asChild size="sm" className="flex-1">
            <Link href={`${base}/feedback`}>
              <FileText /> View report
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm" className="flex-1">
            <Link href={answeredCount > 0 ? `${base}/start` : base}>
              <Play /> {answeredCount > 0 ? "Continue" : "Start"}
            </Link>
          </Button>
        )}
        {!finished && answeredCount > 0 && (
          <Button asChild variant="glass" size="sm" className="flex-1">
            <Link href={`${base}/feedback`}>
              Report <ArrowRight />
            </Link>
          </Button>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-500/10 hover:text-red-300" aria-label={`Delete the ${interview.jobPosition} interview`}>
              <Trash2 />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-amber-300/25 bg-amber-300/10">
                <TriangleAlert className="h-5 w-5 text-amber-200" aria-hidden="true" />
              </span>
              <DialogTitle className="mt-2">Delete this interview?</DialogTitle>
              <DialogDescription>
                &ldquo;{interview.jobPosition}&rdquo; and all of its answers and feedback will be permanently deleted. This can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="glass" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={remove}>
                <Trash2 /> Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </article>
  );
}
