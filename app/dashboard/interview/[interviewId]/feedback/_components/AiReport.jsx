"use client";

import { useEffect, useRef, useState } from "react";
import { CircleCheck, RefreshCw, Sparkles, Target, TrendingUp } from "lucide-react";

import { generateReport } from "@/actions/interview";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { READINESS } from "@/utils/report";

const TONES = {
  success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  warning: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  danger: "border-red-400/30 bg-red-400/10 text-red-200",
};

function ReportSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Writing your report">
      <div className="skeleton h-7 w-3/4" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-5/6" />
      <div className="grid gap-4 pt-2 md:grid-cols-2">
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
      </div>
    </div>
  );
}

/** Stores the result of a generateReport call in component state. */
function applyResult(result, { setReport, setStatus, setError }) {
  if (result?.success) {
    setReport(result.report);
    setStatus("ready");
  } else {
    setError(result?.error ?? "Could not write your report.");
    setStatus("error");
  }
}

/**
 * The AI coaching report. Shows the cached report when the answers haven't
 * changed since it was written; otherwise asks the server to write one.
 */
export default function AiReport({ mockId, initialReport }) {
  const [report, setReport] = useState(initialReport);
  const [status, setStatus] = useState(initialReport ? "ready" : "loading");
  const [error, setError] = useState("");
  const requestedRef = useRef(false);


  // Write the report on first visit (the ref stops a second request in development).
  useEffect(() => {
    if (initialReport || requestedRef.current) return;
    requestedRef.current = true;
    const setters = { setReport, setStatus, setError };
    generateReport(mockId)
      .then((result) => applyResult(result, setters))
      .catch(() => applyResult(null, setters));
  }, [initialReport, mockId]);

  const regenerate = async () => {
    setStatus("loading");
    setError("");
    const setters = { setReport, setStatus, setError };
    try {
      applyResult(await generateReport(mockId, { force: true }), setters);
    } catch {
      applyResult(null, setters);
    }
  };

  const readiness = report ? (READINESS[report.readiness] ?? READINESS.almost) : null;

  return (
    <section className="glass relative overflow-hidden p-6 sm:p-8" aria-labelledby="ai-report-title">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl"
      />
      <div className="relative mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 id="ai-report-title" className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5 text-violet-300" aria-hidden="true" /> AI coach summary
        </h2>
        <div className="flex items-center gap-3">
          {readiness && status === "ready" && (
            <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", TONES[readiness.tone])}>{readiness.label}</span>
          )}
          {status !== "loading" && (
            <Button type="button" variant="ghost" size="sm" onClick={regenerate} className="print:hidden">
              <RefreshCw /> {status === "error" ? "Try again" : "Regenerate"}
            </Button>
          )}
        </div>
      </div>

      <div className="relative">
        {status === "loading" && <ReportSkeleton />}

        {status === "error" && (
          <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">
            {error}
          </p>
        )}

        {status === "ready" && report && (
          <div className="space-y-7">
            <div>
              <p className="text-xl font-semibold leading-snug sm:text-2xl">{report.headline}</p>
              {report.summary && <p className="mt-3 leading-relaxed text-foreground/85">{report.summary}</p>}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {report.strengths?.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-200">
                    <CircleCheck className="h-4 w-4" aria-hidden="true" /> Strengths
                  </h3>
                  <ul className="space-y-2">
                    {report.strengths.map((item) => (
                      <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {report.improvements?.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-200">
                    <TrendingUp className="h-4 w-4" aria-hidden="true" /> Focus on
                  </h3>
                  <ul className="space-y-2">
                    {report.improvements.map((item) => (
                      <li key={item} className="flex gap-2.5 text-sm leading-relaxed">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {report.practicePlan?.length > 0 && (
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-cyan-200">
                  <Target className="h-4 w-4" aria-hidden="true" /> Your practice plan
                </h3>
                <ol className="grid gap-3 md:grid-cols-3">
                  {report.practicePlan.map((step, index) => (
                    <li key={step.topic} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <span className="font-mono text-xs text-muted-foreground">Step {index + 1}</span>
                      <p className="mt-1 font-semibold">{step.topic}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.action}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
