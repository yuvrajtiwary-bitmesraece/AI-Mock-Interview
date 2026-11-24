import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CircleCheck,
  Cpu,
  EyeOff,
  FileText,
  Github,
  KeyRound,
  Lock,
  Mic,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Wand2,
} from "lucide-react";

import {
  JudgeRun,
  PlanCard,
  PrivacyVisual,
  ProductWindow,
  ProgressVisual,
  ReportVisual,
  ResumeVisual,
  RewriteVisual,
  SkillsVisual,
  VoiceVisual,
} from "@/components/landing/visuals";
import { AppLink } from "@/components/site/AppLink";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PauseWhenHidden } from "@/components/ui/pause-when-hidden";
import { RevealObserver } from "@/components/ui/reveal-observer";
import { cn } from "@/lib/utils";
import { SITE } from "@/utils/site";

const VERDICT_CODE_URL = `${SITE.repoUrl}/tree/main/verdict`;
const VERDICT_DESIGN_URL = `${SITE.repoUrl}/blob/main/verdict/docs/DESIGN.md`;
const PLANS_DOC_URL = `${SITE.repoUrl}/blob/main/docs/PLANS.md`;
const EXTERNAL = { target: "_blank", rel: "noopener noreferrer" };

/** Interview kinds and example roles, for the scrolling strip under the hero. */
const ROUNDS = [
  "Technical",
  "Behavioral",
  "System design",
  "HR and culture fit",
  "Mixed rounds",
  "Frontend engineer",
  "Backend engineer",
  "Data analyst",
  "Product manager",
  "DevOps engineer",
  "UI/UX designer",
  "Business analyst",
];

/** The bento grid. `span` is the number of columns out of six on large screens. */
const FEATURES = [
  {
    icon: BarChart3,
    title: "Scored on four skills",
    text: "Relevance, depth, structure and communication, each from 1 to 5, with specific strengths and fixes for every answer.",
    visual: SkillsVisual,
    span: "lg:col-span-4",
  },
  {
    icon: Mic,
    title: "Speak or type",
    text: "Answer out loud and Gemini transcribes it, technical terms included. Or just type.",
    visual: VoiceVisual,
    span: "lg:col-span-2",
  },
  {
    icon: FileText,
    title: "Tailored to your resume",
    text: "Upload a PDF and the interviewer asks about your real projects and claims, the way a hiring manager would.",
    visual: ResumeVisual,
    span: "lg:col-span-2",
  },
  {
    icon: Wand2,
    title: "A stronger version of your answer",
    text: "See your own answer rewritten, next to a model answer, so you know what good sounds like.",
    visual: RewriteVisual,
    span: "lg:col-span-2",
  },
  {
    icon: Sparkles,
    title: "An AI coaching report",
    text: "A readiness verdict, patterns across your answers and a three-step practice plan. Save it as a PDF.",
    visual: ReportVisual,
    span: "lg:col-span-2",
  },
  {
    icon: TrendingUp,
    title: "Progress you can see",
    text: "Your dashboard tracks scores, skills and your practice streak, and suggests what to practice next.",
    visual: ProgressVisual,
    span: "lg:col-span-3",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    text: "Your camera never leaves your device and no audio is stored. Download or delete your data any time.",
    visual: PrivacyVisual,
    span: "lg:col-span-3",
  },
];

const STEPS = [
  {
    icon: Target,
    title: "Set up in a minute",
    text: "Pick the role, interview style and difficulty. Add the job posting or your resume, and the AI writes questions to match.",
  },
  {
    icon: Mic,
    title: "Answer like it's real",
    text: "Hear each question, then answer out loud with live transcription, or type. A timer and an optional camera keep it honest.",
  },
  {
    icon: TrendingUp,
    title: "Improve every round",
    text: "Get scored after every answer, a coaching report at the end, and a dashboard that tracks your progress.",
  },
];

/** How Verdict, the code judge behind the coming coding round, keeps judging fair. */
const CODING_ROUND_POINTS = [
  {
    icon: Lock,
    title: "A sealed sandbox",
    text: "Each submission runs in its own container, with no network, no root access and hard limits on CPU time, memory and output.",
  },
  {
    icon: EyeOff,
    title: "Hidden tests stay hidden",
    text: "Expected answers never enter the sandbox, and a program only sees the input of the test it's running.",
  },
  {
    icon: KeyRound,
    title: "Results can't be faked",
    text: "Every result is signed with a one-time key, so a program can't print its own verdict.",
  },
  {
    icon: Cpu,
    title: "C++17 first",
    text: "Python and Java come next, then the in-browser editor.",
  },
];

/**
 * Subscription plans. Only Free exists: the others are plans, with no price
 * and no checkout (docs/PLANS.md).
 */
const PLANS = [
  {
    name: "Free",
    available: true,
    badge: { label: "Available now", variant: "success" },
    price: "₹0",
    priceNote: "No card needed",
    description: "Everything on the site today.",
    features: [
      "10 new interviews and 100 answer reviews a day",
      "Technical, behavioral, system design, HR and mixed rounds",
      "Questions based on your resume or the job posting",
      "Answer by voice or by typing",
      "Scores on four skills, model answers and a coaching report",
      "A progress dashboard with score trends and streaks",
    ],
    cta: { label: "Start practicing free", href: "/dashboard/new", variant: "default" },
  },
  {
    name: "Pro",
    featured: true,
    badge: { label: "Coming soon", variant: "primary" },
    price: "Coming soon",
    priceNote: "Not for sale yet",
    description: "Everything in Free, plus coding rounds.",
    features: [
      "Coding rounds judged by Verdict: C++ first, then Python and Java",
      "AI review of your code: complexity, missed edge cases and a cleaner approach",
      "Core CS packs: DBMS, operating systems, networks and OOP",
      "Longer interviews, up to 20 questions",
      "Higher daily limits",
    ],
    cta: { label: "Follow progress on GitHub", href: SITE.repoUrl, external: true },
  },
  {
    name: "Campus",
    badge: { label: "Planned", variant: "violet" },
    price: "Planned",
    priceNote: "For colleges and bootcamps",
    description: "For placement cells that prepare a whole batch.",
    features: [
      "One invite link for the whole batch",
      "A placement-cell dashboard: who practiced, average scores, weakest skills",
      "Your own question sets and coding problems for each drive",
      "Batch reports to download",
    ],
    cta: { label: "Suggest a feature", href: `${SITE.repoUrl}/issues/new/choose`, external: true },
  },
];

const TECH = ["Next.js 16", "React 19", "Google Gemini", "Clerk", "Neon Postgres", "Drizzle ORM", "Tailwind CSS", "Vercel", "Go", "Docker"];

const FAQS = [
  {
    q: "Is it free?",
    a: "Yes, everything on the site is free. To keep the shared AI service available for everyone, each account gets a generous daily allowance: 10 new interviews and 100 answer reviews a day. Pro and Campus plans are planned, but nothing is for sale yet and there's no checkout.",
  },
  {
    q: "When is the coding round coming?",
    a: "Its code judge, Verdict, is already built and tested. It runs every submission in a locked-down Docker container, and this site's free hosting can't run Docker, so the judge needs a server of its own first. Until then it runs locally, and its code is on GitHub.",
  },
  {
    q: "Which browsers work?",
    a: "Any modern browser, including Chrome, Edge, Safari and Firefox. Voice answers are transcribed by Gemini when you stop recording, and Chrome, Edge and Safari also show a live preview while you speak. You can always type instead.",
  },
  {
    q: "Is my camera or voice recorded?",
    a: "No. The camera preview stays on your device. To turn a voice answer into text, the recording is sent once to Google Gemini and then discarded. Only the text is saved, together with the AI feedback. See the privacy policy for details.",
  },
  {
    q: "What happens to my resume?",
    a: "It's sent to Google Gemini once, to write questions about your experience, and is never stored. The interview only remembers that a resume was used.",
  },
  {
    q: "How good is the feedback?",
    a: "Each answer is reviewed against a rubric and a model answer, and the feedback quotes what you actually said. It's AI, so treat it as a sparring partner, not a final verdict.",
  },
  {
    q: "Can I delete my data?",
    a: "Yes. Delete any interview from your dashboard, or download and delete everything from Settings.",
  },
];

/** The heading block that opens a section. `title` may contain an <em> for the serif accent. */
function SectionHeading({ eyebrow, title, children, align = "center", className }) {
  return (
    <div className={cn("reveal", align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-xl", className)}>
      <p className="eyebrow">
        <span className="h-px w-6 bg-gradient-to-r from-transparent to-ember-2" aria-hidden="true" />
        {eyebrow}
      </p>
      <h2 className="mt-4 text-[2.1rem] font-semibold leading-[1.08] tracking-[-0.035em] sm:text-5xl">{title}</h2>
      {children && <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground sm:text-base">{children}</p>}
    </div>
  );
}

/** The serif italic accent used inside headings. */
function Accent({ children, ember = false }) {
  return <em className={cn("font-serif font-normal italic tracking-normal", ember && "text-ember")}>{children}</em>;
}

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <RevealObserver />
      <main id="main">
        {/* Hero */}
        <section className="relative overflow-clip">
          <div aria-hidden="true" className="bg-dots absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
          <div className="container relative pb-10 pt-16 text-center sm:pt-24">
            <Link
              href="#coding-round"
              className="group inline-flex animate-fade-up items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1 pr-3 text-xs text-muted-foreground transition-colors duration-300 hover:border-white/20 hover:text-foreground"
            >
              <Badge variant="primary" className="px-2 py-0">
                New
              </Badge>
              A coding round with a real judge is on the way
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 ease-out-expo group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>

            <h1
              className="mx-auto mt-8 max-w-4xl animate-fade-up text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl lg:text-[5.25rem]"
              style={{ animationDelay: "80ms" }}
            >
              Practice the interview <Accent ember>before</Accent> the interview.
            </h1>

            <p
              className="mx-auto mt-7 max-w-xl animate-fade-up text-base leading-relaxed text-muted-foreground sm:text-lg"
              style={{ animationDelay: "160ms" }}
            >
              Realistic questions for your role and resume. Answer out loud or by typing, get scored on four skills after every answer, and
              finish with a coaching plan.
            </p>

            <div className="mt-10 flex animate-fade-up flex-wrap items-center justify-center gap-3" style={{ animationDelay: "240ms" }}>
              <Button asChild size="xl">
                <AppLink href="/dashboard/new">
                  Start practicing free <ArrowRight />
                </AppLink>
              </Button>
              <Button asChild variant="glass" size="xl">
                <Link href="#how-it-works">See how it works</Link>
              </Button>
            </div>

            <ul
              className="mt-8 flex animate-fade-up flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-muted-foreground"
              style={{ animationDelay: "320ms" }}
            >
              {["No credit card", "Camera stays on your device", "Open source, MIT licensed"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CircleCheck className="h-4 w-4 text-ember-2" aria-hidden="true" /> {item}
                </li>
              ))}
            </ul>

            <PauseWhenHidden className="mt-16 sm:mt-20">
              <ProductWindow />
            </PauseWhenHidden>
          </div>
        </section>

        {/* Kinds of interview */}
        <section aria-label="Interview kinds and example roles" className="py-12">
          <p className="text-center text-[13px] text-muted-foreground">Rehearse any round, for any role</p>
          <PauseWhenHidden className="marquee mt-6 overflow-clip">
            <ul className="marquee-track gap-3 pr-3">
              {[...ROUNDS, ...ROUNDS].map((round, index) => (
                <li
                  key={`${round}-${index}`}
                  aria-hidden={index >= ROUNDS.length}
                  className="whitespace-nowrap rounded-full border border-white/[0.07] bg-white/[0.02] px-4 py-2 text-sm text-foreground/80"
                >
                  {round}
                </li>
              ))}
            </ul>
          </PauseWhenHidden>
        </section>

        {/* Features */}
        <section id="features" className="container scroll-mt-28 py-24 sm:py-32">
          <SectionHeading
            eyebrow="Features"
            title={
              <>
                Feedback you can <Accent ember>act on</Accent>
              </>
            }
          >
            Not just a score. Every answer comes back with what worked, what to fix and what a stronger answer sounds like.
          </SectionHeading>

          <PauseWhenHidden className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {FEATURES.map(({ icon: Icon, title, text, visual: Visual, span }) => (
              // The reveal sits on a wrapper, so it doesn't override the card's own hover transition.
              <div key={title} className={cn("reveal", span)}>
                <article className="surface surface-hover flex h-full flex-col gap-6 p-6 sm:p-7">
                  <Visual />
                  <div className="mt-auto">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <Icon className="h-4 w-4 text-ember-2" aria-hidden="true" /> {title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                  </div>
                </article>
              </div>
            ))}
          </PauseWhenHidden>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="container scroll-mt-28 pb-24 sm:pb-32">
          <SectionHeading
            eyebrow="How it works"
            title={
              <>
                From nervous to <Accent ember>prepared</Accent> in three steps
              </>
            }
          />
          <ol className="mt-16 grid gap-4 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <li key={title} className="reveal surface relative p-7 sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-[#0c0c0f] text-ember-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="font-serif text-5xl italic text-white/10">0{index + 1}</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold">{title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Coding round: built and tested locally, not on the live site yet */}
        <section id="coding-round" className="container scroll-mt-28 pb-24 sm:pb-32">
          <div className="reveal surface relative overflow-clip p-7 sm:p-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[radial-gradient(circle,hsl(var(--ember-2)/0.14),transparent_65%)]"
            />
            <div className="relative grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="success">Built and tested</Badge>
                  <Badge variant="warning">Not on the live site yet</Badge>
                </div>
                <h2 className="mt-5 text-3xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-4xl">
                  Coming next: a coding round with a <Accent ember>real judge</Accent>
                </h2>
                <p className="mt-5 leading-relaxed text-muted-foreground">
                  Write a solution, then have it compiled and run against hidden tests, the way competitive programming judges work. The judge,
                  Verdict, is written in Go. It already works locally and is tested automatically on every change. It isn&apos;t on this site yet
                  because it needs a server that can run Docker, and this site&apos;s free hosting can&apos;t.
                </p>
                <ul className="mt-9 grid gap-6 sm:grid-cols-2">
                  {CODING_ROUND_POINTS.map(({ icon: Icon, title, text }) => (
                    <li key={title}>
                      <Icon className="h-5 w-5 text-ember-2" aria-hidden="true" />
                      <h3 className="mt-2.5 font-semibold">{title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-9 flex flex-wrap gap-3">
                  <Button asChild variant="glass" size="lg">
                    <Link href={VERDICT_CODE_URL} {...EXTERNAL}>
                      <Github /> Read the code
                    </Link>
                  </Button>
                  <Button asChild variant="link" size="lg">
                    <Link href={VERDICT_DESIGN_URL} {...EXTERNAL}>
                      How it works <ArrowUpRight />
                    </Link>
                  </Button>
                </div>
              </div>
              <JudgeRun />
            </div>
          </div>
        </section>

        {/* Plans: only Free exists; the others are plans, with no checkout */}
        <section id="plans" className="container scroll-mt-28 pb-24 sm:pb-32">
          <SectionHeading
            eyebrow="Plans"
            title={
              <>
                Free today. <Accent ember>More</Accent> on the way.
              </>
            }
          >
            Everything on the site is free. Pro and Campus are plans for what comes next: nothing is for sale yet, and there&apos;s no checkout or
            payment anywhere on this site.
          </SectionHeading>
          <div className="mt-16 grid gap-4 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div key={plan.name} className="reveal flex">
                <PlanCard plan={plan} />
              </div>
            ))}
          </div>
          <p className="mt-10 text-center text-sm text-muted-foreground">
            <Link
              href={PLANS_DOC_URL}
              {...EXTERNAL}
              className="inline-flex items-center gap-1 underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Read the full plan on GitHub <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </p>
        </section>

        {/* Open source */}
        <section className="container pb-24 sm:pb-32">
          <div className="reveal surface relative overflow-clip p-8 sm:p-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,hsl(var(--ember-3)/0.12),transparent_65%)]"
            />
            <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-3xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-4xl">
                  Free, open source and <Accent>built in public</Accent>
                </h2>
                <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
                  The whole app is MIT licensed. Read the code, run your own copy or contribute a feature. Issues and pull requests are welcome.
                </p>
                <Button asChild variant="glass" size="lg" className="mt-8">
                  <Link href={SITE.repoUrl} {...EXTERNAL}>
                    <Github /> View on GitHub
                  </Link>
                </Button>
              </div>
              <ul className="flex flex-wrap gap-2 lg:justify-end">
                {TECH.map((tech) => (
                  <li key={tech} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-sm text-foreground/85">
                    {tech}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="container scroll-mt-28 pb-24 sm:pb-32">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <SectionHeading
              align="start"
              eyebrow="FAQ"
              title={
                <>
                  Questions, <Accent ember>answered</Accent>
                </>
              }
              className="lg:sticky lg:top-32 lg:self-start"
            >
              Something else on your mind?{" "}
              <Link href={`${SITE.repoUrl}/issues/new/choose`} {...EXTERNAL} className="text-foreground underline-offset-4 hover:underline">
                Ask on GitHub
              </Link>
              .
            </SectionHeading>
            <div className="reveal divide-y divide-white/[0.07] border-y border-white/[0.07]">
              {FAQS.map(({ q, a }) => (
                <details key={q} className="accordion group">
                  <summary className="flex cursor-pointer items-center justify-between gap-6 py-5 text-left font-medium transition-colors duration-300 hover:text-ember-1">
                    {q}
                    <Plus
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-500 ease-out-expo group-open:rotate-45"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="pb-6 pr-10 leading-relaxed text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final call to action */}
        <section className="container pb-28">
          <PauseWhenHidden className="reveal relative overflow-clip rounded-[2rem] border border-white/[0.08] bg-[#0c0c0f] px-6 py-20 text-center sm:px-12 sm:py-24">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 -bottom-1/2 mx-auto h-[28rem] max-w-3xl animate-glow rounded-full bg-[radial-gradient(closest-side,hsl(var(--ember-2)/0.32),hsl(var(--ember-3)/0.12)_60%,transparent)]"
            />
            <div aria-hidden="true" className="bg-dots absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-6xl">
                Your next interview is coming. <Accent ember>Be ready.</Accent>
              </h2>
              <p className="mx-auto mt-6 max-w-md text-muted-foreground">
                Set up a mock interview in a minute and get feedback on your very first answer.
              </p>
              <Button asChild size="xl" className="mt-10">
                <AppLink href="/dashboard/new">
                  Start practicing free <ArrowRight />
                </AppLink>
              </Button>
            </div>
          </PauseWhenHidden>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
