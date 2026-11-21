"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, FileText, LoaderCircle, Play, Trash2, TriangleAlert } from "lucide-react";

import { deleteInterview } from "@/actions/interview";
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

/** One interview on the dashboard: settings, progress, score and next step. */
export default function InterviewItemCard({ interview, onDeleted }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { mockId, answeredCount, questionCount } = interview;
  const base = `/dashboard/interview/${mockId}`;
  const finished = questionCount > 0 && answeredCount >= questionCount;

  const remove = async () => {
    setDeleting(true);
    try {
      const result = await deleteInterview(mockId);
      if (result?.success) {
        toast.success("Interview deleted.");
        setOpen(false);
        onDeleted(mockId);
        return;
      }
      toast.error(result?.error ?? "Could not delete the interview.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setDeleting(false);
  };

  return (
    <article className="glass flex flex-col p-5 transition-colors hover:border-white/20">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="primary">{interviewTypeLabel(interview.interviewType)}</Badge>
          <Badge variant="violet">{difficultyLabel(interview.difficulty)}</Badge>
          {interview.resumeUsed && <Badge variant="success">Resume</Badge>}
        </div>
        {answeredCount > 0 && <ScoreBadge score={interview.score} />}
      </div>

      <h3 className="mt-4 text-lg font-semibold leading-snug">{interview.jobPosition}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {interview.company ? `${interview.company} · ` : ""}
        {interview.jobExperience} {interview.jobExperience === "1" ? "year" : "years"} · {formatDisplayDate(interview.createdOn ? new Date(interview.createdOn) : null)}
      </p>

      <div className="mt-5">
        <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
          <span>
            {answeredCount} of {questionCount} answered
          </span>
          {finished && <span className="text-emerald-300">Complete</span>}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
            style={{ width: `${questionCount ? (answeredCount / questionCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 pt-1">
        {finished ? (
          <Button asChild variant="gradient" size="sm" className="flex-1">
            <Link href={`${base}/feedback`}>
              <FileText /> View report
            </Link>
          </Button>
        ) : (
          <Button asChild variant="gradient" size="sm" className="flex-1">
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
            <Button variant="destructive-soft" size="icon" className="h-8 w-8" aria-label={`Delete the ${interview.jobPosition} interview`}>
              <Trash2 />
            </Button>
          </DialogTrigger>
          <DialogContent className="border-white/10 bg-[#0b1020]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TriangleAlert className="h-5 w-5 text-amber-300" aria-hidden="true" /> Delete this interview?
              </DialogTitle>
              <DialogDescription>
                &ldquo;{interview.jobPosition}&rdquo; and all of its answers and feedback will be permanently deleted. This can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="glass" onClick={() => setOpen(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={remove} disabled={deleting}>
                {deleting ? <LoaderCircle className="animate-spin" /> : <Trash2 />} Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </article>
  );
}
