import { notFound } from "next/navigation";

import { getViewer } from "@/utils/auth";
import { getOwnedInterview } from "@/utils/queries";
import { parseInterviewQuestions } from "@/utils/questions";

import InterviewLobby from "./_components/InterviewLobby";

export const metadata = { title: "Get ready" };

export default async function InterviewLobbyPage({ params }) {
  const { interviewId } = await params;

  // 404 for interviews that don't exist or belong to someone else.
  const interview = await getOwnedInterview(await getViewer(), interviewId);
  if (!interview) notFound();

  return (
    <InterviewLobby
      interview={{
        mockId: interview.mockId,
        jobPosition: interview.jobPosition,
        techStacks: interview.techStacks,
        jobExperience: interview.jobExperience,
        company: interview.company,
        interviewType: interview.interviewType,
        difficulty: interview.difficulty,
        resumeUsed: interview.resumeUsed,
      }}
      questionCount={parseInterviewQuestions(interview.jsonMockResp).length}
    />
  );
}
