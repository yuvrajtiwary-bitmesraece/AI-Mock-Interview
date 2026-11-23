import Link from "next/link";
import { CircleCheck } from "lucide-react";

import { Logo } from "@/components/brand/Logo";

const SELLING_POINTS = [
  "Questions tailored to your role, level and resume",
  "Answer out loud or by typing",
  "A score and specific tips for every answer",
  "Progress tracking across all your interviews",
];

/** The two-column layout of the sign-in and sign-up pages. */
export function AuthShell({ children }) {
  return (
    <main id="main" className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-clip border-r border-white/[0.06] bg-[#0c0c0f] p-12 lg:flex xl:p-16">
        <div
          aria-hidden="true"
          className="bg-dots absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-48 -left-32 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,hsl(var(--ember-2)/0.2),transparent_65%)]"
        />
        <Logo className="relative" />

        <div className="relative max-w-md">
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.035em] xl:text-5xl">
            Walk into your next interview{" "}
            <em className="font-serif font-normal italic tracking-normal text-ember">prepared.</em>
          </h1>
          <ul className="mt-10 space-y-4">
            {SELLING_POINTS.map((point) => (
              <li key={point} className="flex gap-3 text-[15px] text-muted-foreground">
                <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-ember-2" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-muted-foreground">
          Free and open source.{" "}
          <Link href="/" className="text-foreground underline-offset-4 hover:underline">
            Learn more
          </Link>
        </p>
      </section>

      <section className="flex flex-col items-center justify-center px-4 py-12">
        <Logo className="mb-10 lg:hidden" />
        <div className="animate-fade-up">{children}</div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          By continuing you agree to the{" "}
          <Link href="/terms" className="text-foreground/80 underline underline-offset-4 hover:text-foreground">
            Terms
          </Link>{" "}
          and the{" "}
          <Link href="/privacy" className="text-foreground/80 underline underline-offset-4 hover:text-foreground">
            Privacy policy
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
