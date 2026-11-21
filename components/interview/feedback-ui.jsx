import { CircleCheck, Gauge, MessageSquareText, Timer, TrendingUp, Wand2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { CRITERIA } from "@/utils/report";
import { formatDuration } from "@/utils/speech";

/** Text and background colors for a 0-5 score. */
export function scoreTone(score) {
  if (!Number.isFinite(score)) return "border-white/10 bg-white/5 text-muted-foreground";
  if (score >= 4.5) return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (score >= 3.5) return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
  if (score >= 2.5) return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  return "border-red-400/30 bg-red-400/10 text-red-200";
}

function barColor(score) {
  if (score >= 4.5) return "bg-emerald-400";
  if (score >= 3.5) return "bg-cyan-400";
  if (score >= 2.5) return "bg-amber-400";
  return "bg-red-400";
}

const formatScore = (score) => (Number.isInteger(score) ? String(score) : score.toFixed(1));

/** A score such as "4/5" in a colored pill, or "Not rated". */
export function ScoreBadge({ score, className }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-sm font-semibold", scoreTone(score), className)}>
      {Number.isFinite(score) ? `${formatScore(score)}/5` : "Not rated"}
    </span>
  );
}

/** Horizontal bars for the four rubric criteria. Scores may be null (not rated). */
export function CriteriaBars({ criteria, compact = false }) {
  if (!criteria || CRITERIA.every(({ key }) => !Number.isFinite(criteria[key]))) return null;
  return (
    <dl className={cn("grid gap-x-6", compact ? "gap-y-2 sm:grid-cols-2" : "gap-y-3")}>
      {CRITERIA.map(({ key, label, description }) => {
        const score = criteria[key];
        return (
          <div key={key} title={description}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-mono font-medium">{Number.isFinite(score) ? `${formatScore(score)}/5` : "–"}</dd>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
              {Number.isFinite(score) && (
                <div className={cn("h-full rounded-full", barColor(score))} style={{ width: `${(score / 5) * 100}%` }} />
              )}
            </div>
          </div>
        );
      })}
    </dl>
  );
}

function BulletList({ items, tone }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-foreground/90">
          <span
            className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", tone === "good" ? "bg-emerald-300" : "bg-amber-300")}
            aria-hidden="true"
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Strengths, improvements and the improved answer from an AI review. */
export function ReviewDetails({ review }) {
  const strengths = review?.strengths ?? [];
  const improvements = review?.improvements ?? [];
  return (
    <div className="space-y-5">
      {(strengths.length > 0 || improvements.length > 0) && (
        <div className="grid gap-5 md:grid-cols-2">
          {strengths.length > 0 && (
            <div>
              <h4 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-emerald-200">
                <CircleCheck className="h-4 w-4" aria-hidden="true" /> What worked
              </h4>
              <BulletList items={strengths} tone="good" />
            </div>
          )}
          {improvements.length > 0 && (
            <div>
              <h4 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-amber-200">
                <TrendingUp className="h-4 w-4" aria-hidden="true" /> To improve
              </h4>
              <BulletList items={improvements} tone="improve" />
            </div>
          )}
        </div>
      )}
      {review?.improvedAnswer && (
        <details className="group rounded-xl border border-violet-400/20 bg-violet-400/[0.05] p-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-violet-200">
            <Wand2 className="h-4 w-4" aria-hidden="true" /> A stronger version of your answer
            <span className="ml-auto text-xs font-normal text-muted-foreground group-open:hidden">Show</span>
          </summary>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/90">{review.improvedAnswer}</p>
        </details>
      )}
    </div>
  );
}

/** Speaking time, pace and filler words for one voice answer. */
export function DeliveryStats({ metrics }) {
  if (!metrics) return null;
  const items = [
    metrics.mode === "voice" && { icon: Timer, label: "Spoke for", value: formatDuration(metrics.durationSec) },
    metrics.wordsPerMinute && {
      icon: Gauge,
      label: "Pace",
      value: `${metrics.wordsPerMinute} wpm${metrics.pace === "good" ? "" : metrics.pace === "fast" ? " · a bit fast" : " · a bit slow"}`,
    },
    { icon: MessageSquareText, label: "Words", value: String(metrics.wordCount) },
    metrics.mode === "voice" && {
      icon: MessageSquareText,
      label: "Filler words",
      value: metrics.fillerCount ? `${metrics.fillerCount} (${metrics.fillers.slice(0, 2).map((filler) => `"${filler.word}"`).join(", ")})` : "None",
    },
  ].filter(Boolean);

  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
