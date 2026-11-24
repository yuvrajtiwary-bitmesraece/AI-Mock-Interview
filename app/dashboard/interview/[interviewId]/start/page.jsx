import { notFound } from "next/navigation";

import { getViewer } from "@/utils/auth";
import { getOwnedInterviewWithAnswers } from "@/utils/queries";
import { parseInterviewQuestions } from "@/utils/questions";
import { parseRating } from "@/utils/rating";
import { latestAnswersByIndex, normalizeReview } from "@/utils/report";

import InterviewRoom from "./_components/InterviewRoom";

export const metadata = { title: "Interview in progress" };

export default async function InterviewRoomPage({ params, searchParams }) {
  const { interviewId } = await params;
  const { q } = await searchParams;

  // 404 for interviews that don't exist or belong to someone else.
  const { interview, answers } = await getOwnedInterviewWithAnswers(await getViewer(), interviewId);
  if (!interview) notFound();

  const questions = parseInterviewQuestions(interview.jsonMockResp);
  if (questions.length === 0) notFound();

  // Answers from earlier visits, so the room shows what's already done.
  const saved = {};
  for (const [index, row] of latestAnswersByIndex(answers, questions)) {
    saved[index] = {
      answer: row.userAnswer ?? "",
      score: parseRating(row.rating),
      review: normalizeReview({ ...row.analysis, rating: parseRating(row.rating), feedback: row.feedback }),
      metrics: row.metrics ?? null,
    };
  }

  // Open the question from ?q=, else the first unanswered one.
  const requested = Number(q);
  const firstUnanswered = questions.findIndex((_, index) => !saved[index]);
  const initialIndex =
    Number.isInteger(requested) && requested >= 0 && requested < questions.length
      ? requested
      : firstUnanswered === -1
        ? 0
        : firstUnanswered;

  return (
    <InterviewRoom
      interview={{ mockId: interview.mockId, jobPosition: interview.jobPosition, interviewType: interview.interviewType }}
      // Model answers stay on the server until the report, so they can't be read mid-interview.
      questions={questions.map(({ ques, topic, tip }) => ({ ques, topic, tip }))}
      saved={saved}
      initialIndex={initialIndex}
    />
  );
}
