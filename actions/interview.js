"use server";

/**
 * Server actions for mock interviews.
 *
 * These functions run only on the server. Client components import and call
 * them like ordinary async functions; Next.js turns each call into a POST
 * request behind the scenes. Because of that:
 *
 *   1. Database and Gemini credentials stay on the server.
 *   2. Every action checks who is signed in (via Clerk) and only reads or
 *      changes interviews that belong to that user.
 *
 * Read actions return `null` / `[]` when the user is signed out or doesn't own
 * the interview. Write actions return `{ success: true, ... }` or
 * `{ success: false, error }` so the UI can show a friendly message.
 */

import { currentUser } from "@clerk/nextjs/server";
import { SchemaType } from "@google/generative-ai";
import { and, desc, eq } from "drizzle-orm";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";

import { getDb } from "@/utils/db";
import { generateJson } from "@/utils/GeminiAiModel";
import { normalizeQuestions, parseInterviewQuestions } from "@/utils/questions";
import { MockInterview, UserAnswer } from "@/utils/schema";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_QUESTION_COUNT = 5;
const MAX_QUESTION_COUNT = 10;

/** Number of questions per interview: INTERVIEW_QUESTION_COUNT (1-10), default 5. */
function getQuestionCount() {
  const value = Number.parseInt(process.env.INTERVIEW_QUESTION_COUNT ?? "", 10);
  return Number.isInteger(value) && value >= 1 && value <= MAX_QUESTION_COUNT
    ? value
    : DEFAULT_QUESTION_COUNT;
}

// JSON schemas passed to Gemini so its replies always have this exact shape.
const QUESTIONS_SCHEMA = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      ques: { type: SchemaType.STRING, description: "The interview question." },
      ans: { type: SchemaType.STRING, description: "A strong model answer to the question." },
    },
    required: ["ques", "ans"],
  },
};

const FEEDBACK_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    rating: {
      type: SchemaType.INTEGER,
      description: "Score for the answer from 1 (poor) to 5 (excellent).",
    },
    feedback: {
      type: SchemaType.STRING,
      description: "3 to 5 sentences on what was good and how to improve the answer.",
    },
  },
  required: ["rating", "feedback"],
};

// ---------------------------------------------------------------------------
// Helpers (not exported, so they can't be called from the browser)
// ---------------------------------------------------------------------------

async function getCurrentUserEmail() {
  const user = await currentUser();
  return user?.primaryEmailAddress?.emailAddress ?? null;
}

/** Returns the interview only if it exists AND belongs to `email`. */
async function findOwnedInterview(mockId, email) {
  if (!email || typeof mockId !== "string") return null;

  const [interview] = await getDb()
    .select()
    .from(MockInterview)
    .where(and(eq(MockInterview.mockId, mockId), eq(MockInterview.createdBy, email)))
    .limit(1);

  return interview ?? null;
}

/** Trims a form value and rejects anything that isn't a non-empty string. */
function cleanText(value, maxLength) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** One interview owned by the current user, or `null`. */
export async function getInterview(mockId) {
  const email = await getCurrentUserEmail();
  return findOwnedInterview(mockId, email);
}

/** All interviews created by the current user, newest first. */
export async function listInterviews() {
  const email = await getCurrentUserEmail();
  if (!email) return [];

  return getDb()
    .select()
    .from(MockInterview)
    .where(eq(MockInterview.createdBy, email))
    .orderBy(desc(MockInterview.id));
}

/** Saved answers + feedback for an interview the current user owns. */
export async function getInterviewAnswers(mockId) {
  const email = await getCurrentUserEmail();
  const interview = await findOwnedInterview(mockId, email);
  if (!interview) return [];

  return getDb()
    .select()
    .from(UserAnswer)
    .where(eq(UserAnswer.mockIdRef, interview.mockId))
    .orderBy(UserAnswer.id);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** Generates questions with Gemini and stores a new interview. */
export async function createInterview(form) {
  const email = await getCurrentUserEmail();
  if (!email) return { success: false, error: "Please sign in again." };

  const jobPosition = cleanText(form?.jobPosition, 200);
  const jobDescription = cleanText(form?.jobDescription, 5000);
  const techStacks = cleanText(form?.techStacks, 500);
  const jobExperience = cleanText(String(form?.jobExperience ?? ""), 3);

  if (!jobPosition || !jobDescription || !techStacks || !jobExperience) {
    return { success: false, error: "Please fill in every field." };
  }

  const questionCount = getQuestionCount();

  const prompt = `Write ${questionCount} interview questions for the job below, each with a strong model answer.
Match the difficulty to the candidate's years of experience.

Job title: ${jobPosition}
Job description: ${jobDescription}
Tech stack: ${techStacks}
Years of experience: ${jobExperience}`;

  let questions;
  try {
    questions = normalizeQuestions(await generateJson(prompt, QUESTIONS_SCHEMA)).slice(0, questionCount);
  } catch (error) {
    console.error("[createInterview] Gemini request failed:", error);
    return { success: false, error: "Could not generate the interview. Please try again." };
  }

  // Validate BEFORE saving, so a bad AI response never creates an empty interview.
  if (questions.length === 0) {
    return { success: false, error: "The AI didn't return any questions. Please try again." };
  }

  try {
    const [created] = await getDb()
      .insert(MockInterview)
      .values({
        mockId: uuidv4(),
        jsonMockResp: JSON.stringify(questions),
        jobPosition,
        jobDescription,
        techStacks,
        jobExperience,
        createdBy: email,
        createdAt: moment().format("DD-MM-YYYY"),
      })
      .returning({ mockId: MockInterview.mockId });

    return { success: true, mockId: created.mockId };
  } catch (error) {
    console.error("[createInterview] database insert failed:", error);
    return { success: false, error: "Could not save the interview. Please try again." };
  }
}

/** Deletes an interview and its answers, if the current user owns it. */
export async function deleteInterview(mockId) {
  const email = await getCurrentUserEmail();
  const interview = await findOwnedInterview(mockId, email);
  if (!interview) return { success: false, error: "Interview not found." };

  try {
    const db = getDb();
    // batch() runs both statements in one transaction, so a failure can't
    // leave answers behind without their interview (or the other way round).
    await db.batch([
      db.delete(UserAnswer).where(eq(UserAnswer.mockIdRef, interview.mockId)),
      db.delete(MockInterview).where(eq(MockInterview.mockId, interview.mockId)),
    ]);
    return { success: true };
  } catch (error) {
    console.error("[deleteInterview] failed:", error);
    return { success: false, error: "Could not delete the interview." };
  }
}

/**
 * Rates an answer with Gemini and stores it.
 *
 * The question and model answer are looked up on the server from
 * `questionIndex`, rather than trusted from the browser. Re-recording an
 * answer replaces the previous one for that question instead of adding a
 * duplicate row.
 */
export async function saveAnswer({ mockId, questionIndex, userAnswer }) {
  const email = await getCurrentUserEmail();
  const interview = await findOwnedInterview(mockId, email);
  if (!interview) return { success: false, error: "Interview not found." };

  const question = parseInterviewQuestions(interview.jsonMockResp)[questionIndex];
  if (!question) return { success: false, error: "Question not found." };

  const answer = cleanText(userAnswer, 10000);
  if (!answer || answer.length < 5) {
    return { success: false, error: "Answer text too short or empty!" };
  }

  const prompt = `You are an interviewer reviewing a candidate's answer.

Question: ${question.ques}
Candidate's answer: ${answer}

Rate the answer from 1 to 5 and give 3 to 5 sentences of feedback on how to improve it.`;

  let review;
  try {
    review = await generateJson(prompt, FEEDBACK_SCHEMA);
  } catch (error) {
    console.error("[saveAnswer] Gemini request failed:", error);
    return { success: false, error: "Could not get AI feedback. Please try again." };
  }

  const rating = Number.isFinite(review?.rating) ? Math.min(5, Math.max(1, Math.round(review.rating))) : null;

  try {
    const db = getDb();
    await db.batch([
      db.delete(UserAnswer).where(
        and(eq(UserAnswer.mockIdRef, interview.mockId), eq(UserAnswer.question, question.ques))
      ),
      db.insert(UserAnswer).values({
        mockIdRef: interview.mockId,
        question: question.ques,
        correctAns: question.ans,
        userAnswer: answer,
        feedback: review?.feedback?.trim() || "No feedback available.",
        rating: rating === null ? "N/A" : String(rating),
        userEmail: email,
        createdAt: moment().format("DD-MM-YYYY"),
      }),
    ]);
    return { success: true };
  } catch (error) {
    console.error("[saveAnswer] database write failed:", error);
    return { success: false, error: "Could not save your answer. Please try again." };
  }
}
