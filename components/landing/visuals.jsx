import Link from "next/link";
import { ArrowRight, CircleCheck, CircleDashed, FileText, Lock, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/*
 * Illustrations for the landing page. Everything is HTML and CSS rather than
 * images, so it stays sharp at any size and costs almost nothing to load.
 * They are decorative: the text next to each one says the same thing.
 */

// Bar heights (0 to 1) for the waveforms: fixed, so the server render is stable.
const WAVE = [0.35, 0.6, 0.9, 0.5, 0.75, 1, 0.65, 0.4, 0.8, 0.55, 0.95, 0.45, 0.7, 0.85, 0.5, 0.3, 0.6, 0.9, 0.4, 0.7, 0.55, 0.8, 0.35, 0.65];

const SKILLS = [
  ["Relevance", 5],
  ["Depth", 4],
  ["Structure", 4],
  ["Communication", 3],
];

/** Fill colour of a 1-to-5 score bar. */
const scoreFill = (score) =>
  score >= 5 ? "bg-emerald-400" : score >= 4 ? "bg-[linear-gradient(90deg,hsl(var(--ember-1)),hsl(var(--ember-2)))]" : "bg-amber-300";

/** Animated level bars, like a voice being recorded. */
function Waveform({ bars = WAVE, className }) {
  return (
    // overflow-hidden gives the moving bars known bounds, so the browser doesn't
    // move everything painted after them onto separate layers.
    <div className={cn("flex items-center gap-[3px] overflow-hidden", className)}>
      {bars.map((height, index) => (
        <span
          key={index}
          className="w-[3px] origin-center animate-wave rounded-full bg-gradient-to-t from-ember-2 to-ember-1"
          style={{ height: `${Math.round(height * 100)}%`, animationDelay: `${index * 70}ms` }}
        />
      ))}
    </div>
  );
}

/** A ring that fills to `value` out of 5. */
function ScoreRing({ value, size = "h-14 w-14" }) {
  const percent = (value / 5) * 100;
  return (
    <div
      className={cn("relative grid shrink-0 place-items-center rounded-full", size)}
      style={{ background: `conic-gradient(hsl(var(--ember-2)) ${percent}%, rgb(255 255 255 / 0.08) 0)` }}
    >
      <div className="absolute inset-[4px] rounded-full bg-[#0c0c0f]" />
      <span className="relative font-mono text-sm font-semibold">{value.toFixed(1)}</span>
    </div>
  );
}

/** The hero picture: the interview room, mid-answer, with feedback beside it. */
export function ProductWindow() {
  return (
    <div className="settle relative mx-auto max-w-5xl text-left" aria-hidden="true">
      <div className="absolute -inset-x-16 -top-16 bottom-10 -z-10 bg-[radial-gradient(50%_55%_at_50%_30%,hsl(var(--ember-2)/0.22),transparent_75%)]" />
      <div className="surface-raised rounded-[1.4rem] p-1.5">
        <div className="overflow-hidden rounded-[1.05rem] border border-white/[0.06] bg-[#0c0c0f]">
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            </div>
            <div className="mx-auto flex items-center gap-1.5 rounded-md bg-white/[0.04] px-3 py-1 font-mono text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3" /> interview room
            </div>
            <span className="w-[42px]" />
          </div>

          <div className="grid gap-px bg-white/[0.05] md:grid-cols-[1.35fr_1fr]">
            <div className="bg-[#0c0c0f] p-5 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Question 2 of 5</span>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] text-ember-1">System design</span>
              </div>
              <p className="mt-4 text-lg font-semibold leading-snug tracking-tight sm:text-2xl">
                How would you design a URL shortener that handles 10,000 requests per second?
              </p>

              <div className="mt-6 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute -inset-1 animate-pulse rounded-full bg-red-500/30" />
                    <span className="relative h-2.5 w-2.5 rounded-full bg-red-500" />
                  </span>
                  <Waveform className="h-8 flex-1 justify-between" bars={[...WAVE, ...WAVE.slice(0, 4)]} />
                  <span className="font-mono text-xs text-muted-foreground">0:42</span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-foreground/75">
                  First I&apos;d clarify the read-to-write ratio. Reads dominate, so I&apos;d put a cache in front of a key-value store and generate
                  IDs with a base-62 counter<span className="ml-0.5 inline-block h-4 w-[2px] translate-y-[3px] animate-glow bg-ember-2" />
                </p>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background">Stop and submit</span>
                <span className="rounded-full border border-white/10 px-4 py-2 text-xs text-muted-foreground">Type instead</span>
              </div>
            </div>

            <div className="hidden bg-[#0c0c0f] p-5 sm:p-7 md:block">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Feedback</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Answer 1 · Behavioral</p>
                </div>
                <ScoreRing value={4} />
              </div>
              <dl className="mt-6 space-y-3.5">
                {SKILLS.map(([label, score]) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-mono">{score}/5</dd>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.07]">
                      <div className={cn("h-full rounded-full", scoreFill(score))} style={{ width: `${score * 20}%` }} />
                    </div>
                  </div>
                ))}
              </dl>
              <ul className="mt-6 space-y-2 text-xs">
                <li className="flex gap-2 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-2 text-emerald-200">
                  <CircleCheck className="h-3.5 w-3.5 shrink-0 translate-y-px" /> Set the context in one sentence
                </li>
                <li className="flex gap-2 rounded-lg border border-amber-300/15 bg-amber-300/[0.06] px-3 py-2 text-amber-100">
                  <TriangleAlert className="h-3.5 w-3.5 shrink-0 translate-y-px" /> Say what you changed, in numbers
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------- */
/* Feature cards                                                                 */
/* ---------------------------------------------------------------------------- */

/** Four skill bars and an overall score. */
export function SkillsVisual() {
  return (
    <div className="flex items-center gap-6 rounded-xl border border-white/[0.06] bg-black/30 p-5">
      <ScoreRing value={4} size="h-20 w-20" />
      <dl className="flex-1 space-y-3">
        {SKILLS.map(([label, score]) => (
          <div key={label} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3 text-xs">
            <dt className="text-muted-foreground">{label}</dt>
            <div className="h-1.5 rounded-full bg-white/[0.07]">
              <div className={cn("h-full rounded-full", scoreFill(score))} style={{ width: `${score * 20}%` }} />
            </div>
            <dd className="text-right font-mono">{score}/5</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** A live waveform with the transcript appearing under it. */
export function VoiceVisual() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/30 p-5">
      <Waveform className="h-12" bars={[...WAVE.slice(0, 18)]} />
      <p className="mt-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
        <span className="text-foreground/80">&ldquo;The cleanup in </span>
        <span className="text-ember-1">useEffect</span>
        <span className="text-foreground/80"> runs before the next effect…&rdquo;</span>
      </p>
    </div>
  );
}

/** A resume line turning into an interview question. */
export function ResumeVisual() {
  return (
    <div className="space-y-3 rounded-xl border border-white/[0.06] bg-black/30 p-5">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <FileText className="h-3.5 w-3.5" /> resume.pdf
      </div>
      <div className="space-y-1.5">
        <div className="h-1.5 w-4/5 rounded-full bg-white/[0.08]" />
        <div className="rounded-md bg-primary/10 px-2 py-1 text-[11px] text-ember-1">Cut checkout latency by 40% with Redis</div>
        <div className="h-1.5 w-3/5 rounded-full bg-white/[0.08]" />
      </div>
      <p className="rounded-lg rounded-tl-sm border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs leading-relaxed">
        How did you measure that 40%, and what did you try first?
      </p>
    </div>
  );
}

/** A weak answer and the stronger rewrite. */
export function RewriteVisual() {
  return (
    <div className="space-y-2.5 rounded-xl border border-white/[0.06] bg-black/30 p-5 text-xs leading-relaxed">
      <p className="text-muted-foreground line-through decoration-white/25">I worked on the team that fixed some performance issues.</p>
      <p className="rounded-lg border border-primary/20 bg-primary/[0.07] px-3 py-2 text-foreground/90">
        <Sparkles className="mr-1.5 inline h-3.5 w-3.5 -translate-y-px text-ember-1" />I led the profiling that found our N+1 queries and cut page
        load from 3.1 s to 0.9 s.
      </p>
    </div>
  );
}

/** The coaching report: a readiness label and a short plan. */
export function ReportVisual() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/30 p-5">
      <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-200">
        Almost there
      </span>
      <ol className="mt-4 space-y-2 text-xs text-foreground/80">
        {["Put a number on every result", "Name the trade-offs out loud", "End with a one-line summary"].map((step, index) => (
          <li key={step} className="flex items-center gap-2.5">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/[0.06] font-mono text-[10px]">{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** A rising score line. */
export function ProgressVisual() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-black/30 p-5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">Average score</span>
        <span className="font-mono text-ember-1">3.1 → 4.2</span>
      </div>
      <svg viewBox="0 0 240 64" className="mt-3 h-16 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="progress-line" x1="0" x2="1">
            <stop stopColor="#ffcd94" />
            <stop offset="1" stopColor="#f45273" />
          </linearGradient>
          <linearGradient id="progress-fill" x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="#ff813d" stopOpacity="0.28" />
            <stop offset="1" stopColor="#ff813d" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0 52 L30 46 L60 49 L90 38 L120 34 L150 36 L180 24 L210 18 L240 10 L240 64 L0 64 Z" fill="url(#progress-fill)" />
        <path
          d="M0 52 L30 46 L60 49 L90 38 L120 34 L150 36 L180 24 L210 18 L240 10"
          fill="none"
          stroke="url(#progress-line)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

/** What stays private. */
export function PrivacyVisual() {
  return (
    <ul className="space-y-2 rounded-xl border border-white/[0.06] bg-black/30 p-5 text-xs">
      {["The camera stays on your device", "Recordings are never stored", "Export or delete everything"].map((item) => (
        <li key={item} className="flex items-center gap-2.5 text-foreground/80">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" />
          {item}
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------------------- */
/* Coding round                                                                  */
/* ---------------------------------------------------------------------------- */

/** Pads `value` to `width` characters, so the terminal columns line up. */
const pad = (value, width) => value.padEnd(width);

/**
 * Tests 17 to 20 of a real `verdictctl` run (see verdict/README.md): a
 * solution that counts in an int passes every sample, then overflows on
 * hidden test 18.
 */
const JUDGE_RUN = [
  ["17", "AC", "40 ms", "63 ms", "4.0 MB"],
  ["18", "WA", "104 ms", "126 ms", "4.0 MB"],
  ["19", "AC", "328 ms", "382 ms", "12.3 MB"],
  ["20", "AC", "73 ms", "92 ms", "4.0 MB"],
];

/** A real run of Verdict, the code judge, shown as a terminal window. */
export function JudgeRun() {
  const header = pad(" #", 4) + pad("KIND", 8) + pad("VERDICT", 9) + pad("CPU", 8) + pad("WALL", 8) + "MEMORY";
  return (
    <figure className="min-w-0">
      <div className="surface-raised overflow-hidden bg-[#0c0c0f]">
        <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-3" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="ml-2 font-mono text-[11px] text-muted-foreground">verdictctl · local run</span>
        </div>
        <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-foreground/90 sm:p-5 sm:text-[13px]">
          <code>
            <span className="text-muted-foreground">{"$ "}</span>
            {"verdictctl submit -problem budget-windows \\\n    -mode submit overflow.cpp\n"}
            {"Budget Windows | C++17 | submit\n\n"}
            <span className="text-muted-foreground">{`${header}\n...\n`}</span>
            {JUDGE_RUN.map(([test, verdict, cpu, wall, memory]) => (
              <span key={test}>
                {pad(test.padStart(2), 4) + pad("hidden", 8)}
                <span className={verdict === "AC" ? "text-emerald-300" : "font-semibold text-red-300"}>{pad(verdict, 9)}</span>
                {`${pad(cpu, 8)}${pad(wall, 8)}${memory}\n`}
              </span>
            ))}
            {"\nVerdict: "}
            <span className="font-semibold text-red-300">WA (Wrong Answer)</span>
            {", 19/20 tests passed"}
          </code>
        </pre>
      </div>
      <figcaption className="mt-3 text-sm leading-relaxed text-muted-foreground">
        A real run on a laptop. This solution keeps its count in an <code className="font-mono text-foreground/80">int</code>: it passes every
        sample, and hidden test 18, whose answer needs more than 32 bits, catches it.
      </figcaption>
    </figure>
  );
}

/* ---------------------------------------------------------------------------- */
/* Plans                                                                         */
/* ---------------------------------------------------------------------------- */

const EXTERNAL = { target: "_blank", rel: "noopener noreferrer" };

/** One subscription plan. Only the plan marked `available` exists today. */
export function PlanCard({ plan }) {
  const { name, available, featured, badge, price, priceNote, description, features, cta } = plan;
  const Icon = available ? CircleCheck : CircleDashed;
  return (
    <div className={cn("surface relative flex w-full flex-col p-7 sm:p-8", featured && "ember-ring bg-white/[0.035]")}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">{name}</h3>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>
      <p className={cn("mt-6 text-4xl font-semibold tracking-tight", !available && "font-serif text-[2.6rem] font-normal italic text-ember")}>
        {price}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{priceNote}</p>
      <p className="mt-5 text-sm leading-relaxed text-foreground/85">{description}</p>
      <div className="hairline my-6" />
      <ul className="space-y-3 text-sm">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2.5">
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", available ? "text-ember-2" : "text-muted-foreground/70")} aria-hidden="true" />
            <span className={available ? "text-foreground/90" : "text-muted-foreground"}>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-9">
        <Button asChild variant={cta.variant ?? "glass"} size="lg" className="w-full">
          <Link href={cta.href} {...(cta.external ? EXTERNAL : {})}>
            {cta.label} <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
