import { Accent, PageHeader } from "@/components/ui/page-header";
import { getViewer } from "@/utils/auth";
import { QUESTION_COUNT, isInterviewType } from "@/utils/interview-options";
import { getUsageToday } from "@/utils/usage";

import NewInterviewForm from "./_components/NewInterviewForm";

export const metadata = { title: "New interview" };

/** The form's default question count: INTERVIEW_QUESTION_COUNT if it's valid, otherwise 5. */
function defaultQuestionCount() {
  const value = Number(process.env.INTERVIEW_QUESTION_COUNT);
  return Number.isInteger(value) && value >= QUESTION_COUNT.min && value <= QUESTION_COUNT.max ? value : QUESTION_COUNT.default;
}

export default async function NewInterviewPage({ searchParams }) {
  const { type } = await searchParams;
  const viewer = await getViewer();

  // How many interviews are left today. Not critical, so a failure just hides it.
  let remaining = null;
  try {
    const usage = viewer ? await getUsageToday(viewer.id, "interview") : null;
    if (usage && Number.isFinite(usage.limit)) remaining = Math.max(0, usage.limit - usage.used);
  } catch (error) {
    console.error("[new interview] could not read usage:", error);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        className="mb-10"
        back={{ href: "/dashboard", label: "Dashboard" }}
        eyebrow="New interview"
        title={
          <>
            Set up your <Accent>mock interview</Accent>
          </>
        }
        description="Describe the role and pick a style. The AI interviewer writes questions to match, and can tailor them to your resume."
      />

      <NewInterviewForm
        defaultQuestionCount={defaultQuestionCount()}
        requestedType={isInterviewType(type) ? type : null}
        remainingToday={remaining}
      />
    </div>
  );
}
