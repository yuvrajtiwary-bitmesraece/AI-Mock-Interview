import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CircleCheck,
  CircleDashed,
  CodeXml,
  Cpu,
  EyeOff,
  FileText,
  Github,
  HeartHandshake,
  KeyRound,
  Keyboard,
  Lock,
  Mic,
  Network,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wand2,
} from "lucide-react";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SITE } from "@/utils/site";

const VERDICT_CODE_URL = `${SITE.repoUrl}/tree/main/verdict`;
const VERDICT_DESIGN_URL = `${SITE.repoUrl}/blob/main/verdict/docs/DESIGN.md`;
const PLANS_DOC_URL = `${SITE.repoUrl}/blob/main/docs/PLANS.md`;
const EXTERNAL = { target: "_blank", rel: "noopener noreferrer" };

const INTERVIEW_STYLES = [
  { icon: CodeXml, label: "Technical" },
  { icon: Users, label: "Behavioral" },
  { icon: Network, label: "System design" },
  { icon: HeartHandshake, label: "HR & culture fit" },
  { icon: Shuffle, label: "Mixed rounds" },
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
    title: "Improve with every round",
    text: "Get scored after every answer, a coaching report at the end, and a dashboard that tracks your progress.",
  },
];

const FEATURES = [
  {
    icon: FileText,
    title: "Tailored to your resume",
    text: "Upload a PDF and the interviewer asks about your real projects and claims, the way a hiring manager would.",
  },
  {
    icon: Keyboard,
    title: "Speak or type",
    text: "Answer out loud and Gemini transcribes it accurately, technical terms included, or type. Works in every modern browser.",
  },
  {
    icon: BarChart3,
    title: "Scored on four skills",
    text: "Relevance, depth, structure and communication, each 1 to 5, with specific strengths and fixes for every answer.",
  },
  {
    icon: Wand2,
    title: "A better version of your answer",
    text: "See your own answer rewritten stronger, next to a model answer, so you know exactly what good sounds like.",
  },
  {
    icon: Sparkles,
    title: "AI coaching report",
    text: "A readiness verdict, patterns across your answers, and a three-step practice plan. Save it as a PDF.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    text: "Your camera never leaves your device and no audio is stored. Export or delete your data any time.",
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
    cta: { label: "Start practicing free", href: "/dashboard/new", variant: "gradient" },
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

/** A miniature interview room: the hero visual, built in HTML so it stays sharp at any size. */
function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl lg:mx-0" aria-hidden="true">
      <div className="absolute -inset-8 rounded-[2rem] bg-gradient-to-tr from-cyan-500/20 via-blue-500/10 to-violet-500/20 blur-3xl" />

      <div className="glass relative overflow-hidden rounded-3xl p-5 shadow-2xl shadow-black/50 sm:p-6">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Question 2 of 5</span>
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 text-xs text-cyan-200">System design</span>
        </div>
        <p className="mt-4 text-lg font-semibold leading-snug sm:text-xl">
          How would you design a URL shortener that handles 10,000 requests per second?
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white">
              <span className="absolute inset-0 animate-ping rounded-full bg-red-500/40" />
              <Mic className="relative h-5 w-5" />
            </span>
            <div className="flex h-8 flex-1 items-center gap-1">
              {[0, 90, 180, 270, 360, 450, 540, 630, 720, 810, 900, 990].map((delay) => (
                <span key={delay} className="h-full w-1.5 origin-center animate-wave rounded-full bg-cyan-400/80" style={{ animationDelay: `${delay}ms` }} />
              ))}
            </div>
            <span className="font-mono text-sm text-muted-foreground">0:42</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-foreground/80">
            First I&apos;d clarify the read-to-write ratio. Reads dominate, so I&apos;d put a cache in front of a key-value store and generate IDs with
            a base-62 counter…
          </p>
        </div>
      </div>

      <div className="glass absolute -bottom-10 -right-2 w-64 animate-float rounded-2xl p-4 shadow-2xl shadow-black/50 sm:-right-10">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Feedback</span>
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 font-mono text-sm font-semibold text-cyan-200">4/5</span>
        </div>
        <dl className="mt-3 space-y-2">
          {[
            ["Relevance", 5],
            ["Depth", 4],
            ["Structure", 4],
            ["Communication", 3],
          ].map(([label, score]) => (
            <div key={label}>
              <div className="flex justify-between text-xs">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-mono">{score}/5</dd>
              </div>
              <div className="mt-1 h-1 rounded-full bg-white/10">
                <div className={`h-full rounded-full ${score >= 5 ? "bg-emerald-400" : score >= 4 ? "bg-cyan-400" : "bg-amber-400"}`} style={{ width: `${score * 20}%` }} />
              </div>
            </div>
          ))}
        </dl>
        <p className="mt-3 flex gap-1.5 text-xs text-emerald-200">
          <CircleCheck className="h-3.5 w-3.5 shrink-0" /> Clarified requirements first
        </p>
      </div>

      <div className="glass absolute -left-3 -top-5 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs shadow-xl sm:-left-8">
        <FileText className="h-3.5 w-3.5 text-emerald-300" /> Tailored to your resume
      </div>
    </div>
  );
}

/** Pads `value` to `width` characters, so the terminal columns line up. */
const pad = (value, width) => value.padEnd(width);

/** A real run of the judge, shown as a terminal window. */
function JudgeRun() {
  const header = pad(" #", 4) + pad("KIND", 8) + pad("VERDICT", 9) + pad("CPU", 8) + pad("WALL", 8) + "MEMORY";
  return (
    <figure className="min-w-0">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-2xl shadow-black/40">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-2 font-mono text-xs text-muted-foreground">verdictctl · local run</span>
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

/** One subscription plan. Only the plan marked `available` exists today. */
function PlanCard({ plan }) {
  const { name, available, featured, badge, price, priceNote, description, features, cta } = plan;
  const Icon = available ? CircleCheck : CircleDashed;
  return (
    <div className={`glass relative flex flex-col p-7 ${featured ? "border-primary/40 shadow-2xl shadow-cyan-500/10" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{name}</h3>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>
      <p className={`mt-5 text-3xl font-bold ${available ? "" : "text-gradient"}`}>{price}</p>
      <p className="mt-1 text-sm text-muted-foreground">{priceNote}</p>
      <p className="mt-4 text-sm leading-relaxed text-foreground/90">{description}</p>
      <ul className="mt-6 space-y-3 text-sm">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2.5">
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${available ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
            <span className={available ? "text-foreground/90" : "text-muted-foreground"}>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-8">
        <Button asChild variant={cta.variant ?? "glass"} size="lg" className="w-full">
          <Link href={cta.href} {...(cta.external ? EXTERNAL : {})}>
            {cta.label}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
          <div className="container relative grid items-center gap-16 pb-28 pt-16 sm:pt-24 lg:grid-cols-2 lg:pb-32">
            <div className="animate-fade-up">
              <Link
                href={SITE.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Github className="h-3.5 w-3.5" aria-hidden="true" /> Free and open source · Powered by Google Gemini
              </Link>
              <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
                Practice the interview <span className="text-gradient">before the interview.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Realistic questions for your role and resume. Answer out loud or by typing, get scored on four skills after every answer, and finish
                with a coaching plan.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="gradient" size="xl">
                  <Link href="/dashboard/new">
                    Start practicing free <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="glass" size="xl">
                  <Link href="#how-it-works">See how it works</Link>
                </Button>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {["No credit card", "Camera stays on your device", "MIT licensed"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CircleCheck className="h-4 w-4 text-primary" aria-hidden="true" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <ProductPreview />
          </div>
        </section>

        {/* Interview styles */}
        <section aria-label="Interview styles" className="border-y border-white/[0.06] bg-white/[0.015]">
          <div className="container flex flex-wrap items-center justify-center gap-x-10 gap-y-4 py-8">
            <span className="text-sm text-muted-foreground">Rehearse any round:</span>
            {INTERVIEW_STYLES.map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-2 text-sm font-medium text-foreground/90">
                <Icon className="h-4 w-4 text-primary" aria-hidden="true" /> {label}
              </span>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="container scroll-mt-20 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-primary">How it works</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">From nervous to prepared in three steps</h2>
          </div>
          <ol className="mt-14 grid gap-6 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <li key={title} className="glass relative p-7">
                <span className="absolute right-6 top-6 font-mono text-5xl font-bold text-white/[0.06]">{index + 1}</span>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Features */}
        <section id="features" className="container scroll-mt-20 pb-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-primary">Features</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Feedback you can actually act on</h2>
            <p className="mt-4 text-muted-foreground">Not just a score. Every answer comes back with what worked, what to fix, and what a stronger answer sounds like.</p>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="glass group p-6 transition-colors hover:border-primary/30">
                <Icon className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" aria-hidden="true" />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Coding round: built and tested locally, not on the live site yet */}
        <section id="coding-round" className="container scroll-mt-20 pb-24">
          <div className="glass relative overflow-hidden p-8 sm:p-12">
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="success">Built and tested</Badge>
                  <Badge variant="warning">Not on the live site yet</Badge>
                </div>
                <h2 className="mt-4 text-2xl font-bold sm:text-3xl">Coming next: a coding round with a real judge</h2>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  Write a solution, then have it compiled and run against hidden tests, the way competitive programming judges work. The judge,
                  Verdict, is written in Go. It already works locally and is tested automatically on every change. It isn&apos;t on this site yet
                  because it needs a server that can run Docker, and this site&apos;s free hosting can&apos;t.
                </p>
                <ul className="mt-8 grid gap-5 sm:grid-cols-2">
                  {CODING_ROUND_POINTS.map(({ icon: Icon, title, text }) => (
                    <li key={title}>
                      <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                      <h3 className="mt-2 font-semibold">{title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button asChild variant="glass" size="lg">
                    <Link href={VERDICT_CODE_URL} {...EXTERNAL}>
                      <Github /> Read the code
                    </Link>
                  </Button>
                  <Button asChild variant="link" size="lg">
                    <Link href={VERDICT_DESIGN_URL} {...EXTERNAL}>
                      How it works <ArrowRight />
                    </Link>
                  </Button>
                </div>
              </div>
              <JudgeRun />
            </div>
          </div>
        </section>

        {/* Plans: only Free exists; the others are plans, with no checkout */}
        <section id="plans" className="container scroll-mt-20 pb-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-primary">Plans</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Free today. More on the way.</h2>
            <p className="mt-4 text-muted-foreground">
              Everything on the site is free. Pro and Campus are plans for what comes next: nothing is for sale yet, and there&apos;s no checkout or
              payment anywhere on this site.
            </p>
          </div>
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <PlanCard key={plan.name} plan={plan} />
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            <Link href={PLANS_DOC_URL} {...EXTERNAL} className="underline-offset-4 transition-colors hover:text-foreground hover:underline">
              Read the full plan on GitHub
            </Link>
          </p>
        </section>

        {/* Open source */}
        <section className="container pb-24">
          <div className="glass relative overflow-hidden p-8 sm:p-12">
            <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-2xl font-bold sm:text-3xl">Free, open source, and built in public</h2>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  The whole app is MIT licensed. Read the code, run your own copy, or contribute a feature. Issues and pull requests are welcome.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild variant="glass" size="lg">
                    <Link href={SITE.repoUrl} target="_blank" rel="noopener noreferrer">
                      <Github /> View on GitHub
                    </Link>
                  </Button>
                </div>
              </div>
              <ul className="flex flex-wrap gap-2 lg:justify-end">
                {["Next.js 16", "React 19", "Google Gemini", "Clerk", "Neon Postgres", "Drizzle ORM", "Tailwind CSS", "Vercel", "Go", "Docker"].map((tech) => (
                  <li key={tech} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-foreground/90">
                    {tech}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="container scroll-mt-20 pb-24">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-3xl font-bold sm:text-4xl">Questions, answered</h2>
            <div className="mt-10 space-y-3">
              {FAQS.map(({ q, a }) => (
                <details key={q} className="glass group p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                    {q}
                    <span className="text-xl text-muted-foreground transition-transform group-open:rotate-45" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final call to action */}
        <section className="container pb-28">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/15 via-blue-600/10 to-violet-600/15 px-6 py-16 text-center sm:px-12">
            <h2 className="text-3xl font-bold sm:text-4xl">Your next interview is coming. Be ready.</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">Set up a mock interview in a minute and get feedback on your very first answer.</p>
            <Button asChild variant="gradient" size="xl" className="mt-8">
              <Link href="/dashboard/new">
                Start practicing free <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
