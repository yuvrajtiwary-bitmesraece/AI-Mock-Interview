"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";

import { deleteInterview } from "@/actions/interview";
import { toastActionError } from "@/lib/action-error";
import { cn } from "@/lib/utils";
import { INTERVIEW_TYPES, interviewTypeLabel } from "@/utils/interview-options";

import InterviewItemCard from "./InterviewItemCard";

/** The user's interviews with a type filter and search. Deleting one removes it at once. */
export default function InterviewList({ initialInterviews }) {
  // Interviews deleted from this page: hidden straight away, shown again if the delete fails.
  const [removed, setRemoved] = useState(() => new Set());
  const [type, setType] = useState("all");
  const [query, setQuery] = useState("");
  // Typing stays instant on slow devices: the list catches up a moment later.
  const deferredQuery = useDeferredValue(query);

  const interviews = useMemo(() => initialInterviews.filter((item) => !removed.has(item.mockId)), [initialInterviews, removed]);

  // Only offer filters for types the user actually has (older interviews count as technical).
  const types = useMemo(
    () => Object.keys(INTERVIEW_TYPES).filter((id) => interviews.some((item) => (item.interviewType ?? "technical") === id)),
    [interviews]
  );

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    return interviews.filter((item) => {
      if (type !== "all" && (item.interviewType ?? "technical") !== type) return false;
      return `${item.jobPosition} ${item.company ?? ""}`.toLowerCase().includes(needle);
    });
  }, [interviews, type, deferredQuery]);

  const remove = async (interview) => {
    const restore = () =>
      setRemoved((current) => {
        const next = new Set(current);
        next.delete(interview.mockId);
        return next;
      });

    setRemoved((current) => new Set(current).add(interview.mockId));
    try {
      const result = await deleteInterview(interview.mockId);
      if (result?.success) {
        toast.success(`Deleted "${interview.jobPosition}".`);
        return;
      }
      toast.error(result?.error ?? "Could not delete the interview.");
    } catch (error) {
      toastActionError(error, "Could not delete the interview. Please try again.");
    }
    restore();
  };

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Filter by interview type" className="flex flex-wrap gap-2">
          {["all", ...types].map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setType(id)}
              aria-pressed={type === id}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[13px] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
                type === id
                  ? "border-white/20 bg-white/[0.08] text-foreground"
                  : "border-white/[0.08] text-muted-foreground hover:border-white/15 hover:text-foreground"
              )}
            >
              {id === "all" ? `All (${interviews.length})` : interviewTypeLabel(id)}
            </button>
          ))}
        </div>
        <label className="relative block sm:w-64">
          <span className="sr-only">Search interviews</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          {/* 16px on phones, so iOS doesn't zoom in when the field is tapped. */}
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by role or company"
            className="h-9 w-full rounded-full border border-white/10 bg-white/[0.03] pl-9 pr-4 text-base transition-[border-color,box-shadow] duration-300 placeholder:text-muted-foreground/70 hover:border-white/15 focus:outline-none focus-visible:border-primary/60 focus-visible:ring-4 focus-visible:ring-primary/15 sm:text-sm"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="surface px-6 py-12 text-center text-muted-foreground">
          {interviews.length === 0 ? "No interviews left. Create one to keep practicing." : "No interviews match your filters."}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((interview) => (
            <InterviewItemCard key={interview.mockId} interview={interview} onDelete={remove} />
          ))}
        </div>
      )}
    </div>
  );
}
