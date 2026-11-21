"use server";

/**
 * Server actions: the only database writes and AI requests the browser can
 * trigger. Client components call them like async functions; Next.js turns
 * each call into a POST request. So every action:
 *
 *   1. checks who is signed in and only touches interviews that user owns,
 *   2. validates its input (it can come from anywhere, not just our forms),
 *   3. counts AI requests against the user's daily limit (utils/limits.js).
 *
 * Reads live in utils/queries.js and are only used by server components.
 * Actions return `{ success: true, ... }` or `{ success: false, error }`.
 */

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getViewer } from "@/utils/auth";
import { toLegacyDateString } from "@/utils/dates";
import { getDb } from "@/utils/db";
import { aiErrorMessage, generateJson } from "@/utils/gemini";
import { limitReachedMessage } from "@/utils/limits";
import {
  FEEDBACK_SCHEMA,
  INTERVIEWER_SYSTEM_PROMPT,
  QUESTIONS_SCHEMA,
  buildAnswerReviewPrompt,
  buildQuestionsPrompt,
} from "@/utils/prompts";
import { getOwnedInterview } from "@/utils/queries";
import { normalizeQuestions, parseInterviewQuestions } from "@/utils/questions";
import { MockInterview, UserAnswer } from "@/utils/schema";
import { consumeDailyQuota, refundDailyQuota } from "@/utils/usage";

// ---------------------------------------------------------------------------
// Helpers (not exported, so the browser can't call them)
// ---------------------------------------------------------------------------

const DEFAULT_QUESTION_COUNT = 5;
const MAX_QUESTION_COUNT = 10;

/** Number of questions per interview: INTERVIEW_QUESTION_COUNT (1-10), default 5. */
function getQuestionCount() {
  const value = Number.parseInt(process.env.INTERVIEW_QUESTION_COUNT ?? "", 10);
  return Number.isInteger(value) && value >= 1 && value <= MAX_QUESTION_COUNT ? value : DEFAULT_QUESTION_COUNT;
}

/** Trims a form value and rejects anything that isn't a non-empty string. */
function cleanText(value, maxLength) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

/** Years of experience as a whole number from 0 to 50, or null. */
function cleanExperience(value) {
  const years = Number(typeof value === "string" ? value.trim() : value);
  return Number.isInteger(years) && years >= 0 && years <= 50 ? String(years) : null;
}

const fail = (error) => ({ success: false, error });

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/** Generates questions with Gemini and stores a new interview. */
export async function createInterview(form) {
  const viewer = await getViewer();
  if (!viewer) return fail("Please sign in again.");

  const jobPosition = cleanText(form?.jobPosition, 200);
  const jobDescription = cleanText(form?.jobDescription, 5000);
  const techStacks = cleanText(form?.techStacks, 500);
  const jobExperience = cleanExperience(form?.jobExperience);

  if (!jobPosition || !jobDescription || !techStacks || jobExperience === null) {
    return fail("Please fill in every field. Years of experience must be a whole number from 0 to 50.");
  }

  const quota = await consumeDailyQuota(viewer.id, "interview");
  if (!quota.allowed) return fail(limitReachedMessage("interview", quota.limit));

  const questionCount = getQuestionCount();
  let questions;
  try {
    const reply = await generateJson({
      system: INTERVIEWER_SYSTEM_PROMPT,
      prompt: buildQuestionsPrompt({ jobPosition, jobDescription, techStacks, jobExperience, questionCount }),
      schema: QUESTIONS_SCHEMA,
      maxOutputTokens: 8192,
      timeoutMs: 35_000,
    });
    questions = normalizeQuestions(reply).slice(0, questionCount);
  } catch (error) {
    console.error("[createInterview] Gemini request failed:", error);
    await refundDailyQuota(viewer.id, "interview");
    return fail(aiErrorMessage(error));
  }

  // Validate BEFORE saving, so a bad AI response never creates an empty interview.
  if (questions.length === 0) {
    await refundDailyQuota(viewer.id, "interview");
    return fail("The AI didn't return any questions. Please try again.");
  }

  const now = new Date();
  const mockId = randomUUID();
  try {
    await getDb()
      .insert(MockInterview)
      .values({
        mockId,
        jsonMockResp: JSON.stringify(questions),
        jobPosition,
        jobDescription,
        techStacks,
        jobExperience,
        userId: viewer.id,
        createdBy: viewer.email ?? viewer.id,
        createdAt: toLegacyDateString(now),
        createdOn: now,
      });
  } catch (error) {
    console.error("[createInterview] database insert failed:", error);
    return fail("Could not save the interview. Please try again.");
  }

  revalidatePath("/dashboard");
  return { success: true, mockId };
}

/** Deletes an interview and its answers, if the current user owns it. */
export async function deleteInterview(mockId) {
  const viewer = await getViewer();
  const interview = await getOwnedInterview(viewer, mockId);
  if (!interview) return fail("Interview not found.");

  try {
    const db = getDb();
    // batch() runs both statements in one transaction, so a failure can't
    // leave answers behind without their interview (or the other way round).
    await db.batch([
      db.delete(UserAnswer).where(eq(UserAnswer.mockIdRef, interview.mockId)),
      db.delete(MockInterview).where(eq(MockInterview.mockId, interview.mockId)),
    ]);
  } catch (error) {
    console.error("[deleteInterview] failed:", error);
    return fail("Could not delete the interview.");
  }

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Rates an answer with Gemini and stores it.
 *
 * The question is looked up on the server from `questionIndex`, rather than
 * trusted from the browser. Re-recording an answer replaces the previous one
 * for that question instead of adding a duplicate row.
 */
export async function saveAnswer({ mockId, questionIndex, userAnswer } = {}) {
  const viewer = await getViewer();
  const interview = await getOwnedInterview(viewer, mockId);
  if (!interview) return fail("Interview not found.");

  const question = Number.isInteger(questionIndex)
    ? parseInterviewQuestions(interview.jsonMockResp)[questionIndex]
    : undefined;
  if (!question) return fail("Question not found.");

  const answer = cleanText(userAnswer, 10000);
  if (!answer || answer.length < 5) {
    return fail("Your answer is too short. Please say or type a little more.");
  }

  const quota = await consumeDailyQuota(viewer.id, "answer");
  if (!quota.allowed) return fail(limitReachedMessage("answer", quota.limit));

  let review;
  try {
    review = await generateJson({
      system: INTERVIEWER_SYSTEM_PROMPT,
      prompt: buildAnswerReviewPrompt({ question: question.ques, answer }),
      schema: FEEDBACK_SCHEMA,
      temperature: 0.4,
      maxOutputTokens: 2048,
    });
  } catch (error) {
    console.error("[saveAnswer] Gemini request failed:", error);
    await refundDailyQuota(viewer.id, "answer");
    return fail(aiErrorMessage(error));
  }

  const rating = Number.isFinite(review?.rating) ? Math.min(5, Math.max(1, Math.round(review.rating))) : null;
  const feedback = review?.feedback?.trim() || "No feedback available.";
  const now = new Date();

  try {
    const db = getDb();
    await db.batch([
      db
        .delete(UserAnswer)
        .where(and(eq(UserAnswer.mockIdRef, interview.mockId), eq(UserAnswer.question, question.ques))),
      db.insert(UserAnswer).values({
        mockIdRef: interview.mockId,
        question: question.ques,
        correctAns: question.ans,
        userAnswer: answer,
        feedback,
        rating: rating === null ? "N/A" : String(rating),
        userEmail: viewer.email,
        createdAt: toLegacyDateString(now),
        createdOn: now,
      }),
    ]);
  } catch (error) {
    console.error("[saveAnswer] database write failed:", error);
    return fail("Could not save your answer. Please try again.");
  }

  return { success: true, rating, feedback };
}
