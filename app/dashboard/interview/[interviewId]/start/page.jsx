import { notFound } from "next/navigation";

import { getViewer } from "@/utils/auth";
import { getOwnedInterview } from "@/utils/queries";
import { parseInterviewQuestions } from "@/utils/questions";

import InterviewRoom from "./_components/InterviewRoom";

export const metadata = { title: "Interview in progress" };

export default async function InterviewRoomPage({ params }) {
  const { interviewId } = await params;

  // 404 for interviews that don't exist or belong to someone else.
  const interview = await getOwnedInterview(await getViewer(), interviewId);
  if (!interview) notFound();

  // Only the questions are sent to the browser. Model answers stay on the
  // server until the feedback page, so they can't be read mid-interview.
  const questions = parseInterviewQuestions(interview.jsonMockResp).map(({ ques }) => ({ ques }));

  return <InterviewRoom mockId={interview.mockId} questions={questions} />;
}
