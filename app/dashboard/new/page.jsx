import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getViewer } from "@/utils/auth";
import { QUESTION_COUNT } from "@/utils/interview-options";
import { getUsageToday } from "@/utils/usage";

import NewInterviewForm from "./_components/NewInterviewForm";

export const metadata = { title: "New interview" };

/** Default question count for the form: INTERVIEW_QUESTION_COUNT if valid, else 5. */
function defaultQuestionCount() {
  const value = Number(process.env.INTERVIEW_QUESTION_COUNT);
  return Number.isInteger(value) && value >= QUESTION_COUNT.min && value <= QUESTION_COUNT.max ? value : QUESTION_COUNT.default;
}

export default async function NewInterviewPage() {
  const viewer = await getViewer();

  // Show how many interviews are left today. Not critical, so a failure just hides it.
  let remaining = null;
  try {
    const usage = viewer ? await getUsageToday(viewer.id, "interview") : null;
    if (usage && Number.isFinite(usage.limit)) remaining = Math.max(0, usage.limit - usage.used);
  } catch (error) {
    console.error("[new interview] could not read usage:", error);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard
      </Link>

      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-bold sm:text-4xl">
          Set up your <span className="text-gradient">mock interview</span>
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Describe the role and pick a style. The AI interviewer writes questions to match, and can tailor them to your resume.
        </p>
      </header>

      <NewInterviewForm defaultQuestionCount={defaultQuestionCount()} remainingToday={remaining} />
    </div>
  );
}
