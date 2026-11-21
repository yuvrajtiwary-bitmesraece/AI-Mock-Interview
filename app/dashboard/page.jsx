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

function Onboarding() {
  return (
    <section className="glass relative overflow-hidden p-8 sm:p-10">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="relative max-w-2xl">
        <h2 className="text-2xl font-bold sm:text-3xl">Start your first mock interview</h2>
        <p className="mt-3 text-muted-foreground">
          It takes about a minute to set up. You&apos;ll get realistic questions, instant feedback on every answer, and a report with a practice plan.
        </p>
      </div>
      <ol className="relative mt-8 grid gap-4 md:grid-cols-3">
        {FIRST_STEPS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
            <p className="mt-3 font-semibold">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </li>
        ))}
      </ol>
      <div className="relative mt-8 flex flex-wrap items-center gap-4">
        <Button asChild variant="gradient" size="lg">
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
    <section className="glass p-6 lg:col-span-2" aria-labelledby="next-title">
      <h2 id="next-title" className="flex items-center gap-2 font-semibold">
        <Compass className="h-5 w-5 text-primary" aria-hidden="true" /> What to do next
      </h2>
      <p className="mb-5 text-sm text-muted-foreground">Suggestions based on your answers so far</p>
      <ul className="space-y-3">
        {steps.map((step) => {
          const type = step.kind === "type" ? INTERVIEW_TYPES[step.type] : null;
          const title = type ? `Try a ${type.label.toLowerCase()} interview` : step.title;
          const text = type ? type.description : step.text;
          return (
            <li key={step.kind} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
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
    </section>
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
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">
            {viewer?.firstName ? (
              <>
                Welcome back, <span className="text-gradient">{viewer.firstName}</span>
              </>
            ) : (
              <span className="text-gradient">Your dashboard</span>
            )}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {interviews.length === 0 ? "Practice makes confident. Let's set up your first interview." : "Track your progress and keep your streak going."}
          </p>
        </div>
        <Button asChild variant="gradient" size="lg">
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
            <StatTile icon={ListChecks} label="Interviews" value={totals.interviews} detail={`${totals.answered} questions answered`} />
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

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="glass p-6 lg:col-span-2" aria-labelledby="trend-title">
              <h2 id="trend-title" className="font-semibold">
                Score trend
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">Average score per interview, oldest to newest</p>
              {progress.trend.length > 0 ? (
                <ScoreTrendChart points={progress.trend} />
              ) : (
                <p className="py-16 text-center text-sm text-muted-foreground">Answer a few questions and your trend appears here.</p>
              )}
            </section>

            <section className="glass p-6" aria-labelledby="skills-title">
              <h2 id="skills-title" className="font-semibold">
                Skills
              </h2>
              <p className="mb-5 text-sm text-muted-foreground">Average rubric scores across all answers</p>
              {hasSkills ? (
                <CriteriaBars criteria={progress.skills} />
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">Your skill scores appear after your first answer.</p>
              )}
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="glass p-6" aria-labelledby="activity-title">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="activity-title" className="font-semibold">
                  Practice activity
                </h2>
                <p className="text-sm text-muted-foreground">Last 12 weeks</p>
              </div>
              <ActivityHeatmap weeks={progress.activity} practiceDays={totals.practiceDays} />
            </section>
            {nextSteps.length > 0 && <NextSteps steps={nextSteps} />}
          </div>

          <section aria-labelledby="interviews-title">
            <h2 id="interviews-title" className="mb-4 text-xl font-semibold">
              Your interviews
            </h2>
            <InterviewList initialInterviews={progress.cards} />
          </section>
        </>
      )}
    </div>
  );
}
