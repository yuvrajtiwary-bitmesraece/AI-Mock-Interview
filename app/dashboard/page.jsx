import Link from "next/link";
import { ArrowRight, CalendarDays, Compass, Flame, ListChecks, Mic, Plus, Sparkles, Target, Trophy } from "lucide-react";

import { CriteriaBars } from "@/components/interview/feedback-ui";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/utils/auth";
import { INTERVIEW_TYPES, TEMPLATES } from "@/utils/interview-options";
import { buildProgress, suggestNextSteps } from "@/utils/progress";
import { getDashboardRows } from "@/utils/queries";

import ActivityHeatmap from "./_components/ActivityHeatmap";
import InterviewList from "./_components/InterviewList";
import ScoreTrendChart from "./_components/ScoreTrendChart";
import StatTile from "./_components/StatTile";

const FIRST_STEPS = [
  { icon: Target, title: "Pick a role and style", text: "Technical, behavioral, system design, HR or mixed, from warm-up to challenging." },
  { icon: Mic, title: "Answer out loud or type", text: "Questions can be tailored to your resume. Each answer is scored straight away." },
  { icon: Trophy, title: "Review and improve", text: "Get a coaching report, then practice again and watch your score climb." },
];

/** A dashboard panel with a title and a short description. */
function Panel({ id, title, description, aside, className, children }) {
  return (
    <section className={`surface p-6 sm:p-7 ${className ?? ""}`} aria-labelledby={id}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id={id} className="font-semibold tracking-tight">
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Onboarding() {
  return (
    <section className="surface relative overflow-clip p-8 sm:p-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-[radial-gradient(circle,hsl(var(--ember-2)/0.16),transparent_65%)]"
      />
      <div className="relative max-w-2xl">
        <h2 className="text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
          Start your first <em className="font-serif font-normal italic tracking-normal text-ember">mock interview</em>
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          It takes about a minute to set up. You&apos;ll get realistic questions, instant feedback on every answer, and a report with a practice plan.
        </p>
      </div>
      <ol className="relative mt-10 grid gap-4 md:grid-cols-3">
        {FIRST_STEPS.map(({ icon: Icon, title, text }, index) => (
          <li key={title} className="rounded-xl border border-white/[0.07] bg-black/20 p-5">
            <div className="flex items-center justify-between">
              <Icon className="h-5 w-5 text-ember-2" aria-hidden="true" />
              <span className="font-serif text-2xl italic text-white/15">0{index + 1}</span>
            </div>
            <p className="mt-4 font-medium">{title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </li>
        ))}
      </ol>
      <div className="relative mt-10 flex flex-wrap items-center gap-4">
        <Button asChild size="lg">
          <Link href="/dashboard/new">
            <Sparkles /> Create an interview
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          Popular: {TEMPLATES.slice(0, 3).map((template) => template.name).join(", ")}
        </p>
      </div>
    </section>
  );
}

/** Coach card: what to practice next, based on progress so far. */
function NextSteps({ steps }) {
  return (
    <Panel
      id="next-title"
      className="lg:col-span-2"
      title={
        <span className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-ember-2" aria-hidden="true" /> What to do next
        </span>
      }
      description="Suggestions based on your answers so far"
    >
      <ul className="space-y-3">
        {steps.map((step) => {
          const type = step.kind === "type" ? INTERVIEW_TYPES[step.type] : null;
          const title = type ? `Try a ${type.label.toLowerCase()} interview` : step.title;
          const text = type ? type.description : step.text;
          return (
            <li
              key={step.kind}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-black/20 p-4 transition-colors duration-300 hover:border-white/[0.12]"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
              </div>
              <Button asChild variant="glass" size="sm">
                <Link href={step.href}>
                  {step.cta} <ArrowRight />
                </Link>
              </Button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export default async function Dashboard() {
  const viewer = await getViewer();
  const { interviews, answers } = await getDashboardRows(viewer);
  const progress = buildProgress(interviews, answers);
  const { totals } = progress;
  const hasSkills = Object.values(progress.skills).some(Number.isFinite);
  const nextSteps = suggestNextSteps(progress, Object.keys(INTERVIEW_TYPES));

  return (
    <div className="space-y-8">
      <header className="flex animate-fade-up flex-wrap items-end justify-between gap-6 pb-2">
        <div>
          <p className="eyebrow">
            <span className="h-px w-6 bg-gradient-to-r from-transparent to-ember-2" aria-hidden="true" />
            Dashboard
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            {viewer?.firstName ? (
              <>
                Welcome back, <em className="font-serif font-normal italic tracking-normal text-ember">{viewer.firstName}</em>
              </>
            ) : (
              <>
                Your <em className="font-serif font-normal italic tracking-normal text-ember">dashboard</em>
              </>
            )}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {interviews.length === 0 ? "Practice makes confident. Let's set up your first interview." : "Track your progress and keep your streak going."}
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/dashboard/new">
            <Plus /> New interview
          </Link>
        </Button>
      </header>

      {interviews.length === 0 ? (
        <Onboarding />
      ) : (
        <>
          <section aria-label="Your stats" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              icon={ListChecks}
              label="Interviews"
              value={totals.interviews}
              detail={`${totals.answered} ${totals.answered === 1 ? "question" : "questions"} answered`}
            />
            <StatTile
              icon={Target}
              label="Average score"
              value={totals.averageScore === null ? "–" : `${totals.averageScore.toFixed(1)}/5`}
              detail={totals.averageScore === null ? "Answer a question to get scored" : "Across all your answers"}
            />
            <StatTile
              icon={Flame}
              label="Practice streak"
              value={`${totals.currentStreak} ${totals.currentStreak === 1 ? "day" : "days"}`}
              detail={`Longest: ${totals.longestStreak} ${totals.longestStreak === 1 ? "day" : "days"}`}
            />
            <StatTile icon={CalendarDays} label="Practice days" value={totals.practiceDays} detail="Days with at least one answer" />
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel id="trend-title" title="Score trend" description="Average score per interview, oldest to newest" className="lg:col-span-2">
              {progress.trend.length > 0 ? (
                <ScoreTrendChart points={progress.trend} />
              ) : (
                <p className="py-16 text-center text-sm text-muted-foreground">Answer a few questions and your trend appears here.</p>
              )}
            </Panel>

            <Panel id="skills-title" title="Skills" description="Average rubric scores across all answers">
              {hasSkills ? (
                <CriteriaBars criteria={progress.skills} />
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">Your skill scores appear after your first answer.</p>
              )}
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel id="activity-title" title="Practice activity" aside={<p className="text-sm text-muted-foreground">Last 12 weeks</p>}>
              <ActivityHeatmap weeks={progress.activity} practiceDays={totals.practiceDays} />
            </Panel>
            {nextSteps.length > 0 && <NextSteps steps={nextSteps} />}
          </div>

          <section aria-labelledby="interviews-title" className="pt-4">
            <h2 id="interviews-title" className="mb-5 text-2xl font-semibold tracking-[-0.03em]">
              Your interviews
            </h2>
            <InterviewList initialInterviews={progress.cards} />
          </section>
        </>
      )}
    </div>
  );
}
