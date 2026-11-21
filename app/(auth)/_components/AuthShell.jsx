import Link from "next/link";
import { CircleCheck } from "lucide-react";

import { Logo } from "@/components/brand/Logo";

const SELLING_POINTS = [
  "Questions tailored to your role, level and resume",
  "Answer out loud or by typing",
  "A score and concrete tips for every answer",
  "Progress tracking across all your interviews",
];

/** Two-column layout for the sign-in and sign-up pages. */
export function AuthShell({ children }) {
  return (
    <main id="main" className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-white/10 p-12 lg:flex">
        <div
          aria-hidden="true"
          className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]"
        />
        <Logo className="relative" />

        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-tight">
            Walk into your next interview <span className="text-gradient">prepared</span>.
          </h1>
          <ul className="mt-8 space-y-4">
            {SELLING_POINTS.map((point) => (
              <li key={point} className="flex gap-3 text-muted-foreground">
                <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-muted-foreground">
          Free and open source.{" "}
          <Link href="/" className="underline underline-offset-4 hover:text-foreground">
            Learn more
          </Link>
        </p>
      </section>

      <section className="flex flex-col items-center justify-center px-4 py-12">
        <Logo className="mb-8 lg:hidden" />
        {children}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to the{" "}
          <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
            Privacy policy
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
