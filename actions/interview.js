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
import { and, desc, eq } from "drizzle-orm";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";

import { getDb } from "@/utils/db";
import { generateText } from "@/utils/GeminiAiModel";
import { parseInterviewQuestions } from "@/utils/questions";
import { MockInterview, UserAnswer } from "@/utils/schema";

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

function extractJson(text) {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch?.[1]) return fenceMatch[1].trim();
  const jsonMatch = text.match(/({[\s\S]*}|\[[\s\S]*\])/);
  return jsonMatch ? jsonMatch[0].trim() : text.trim();
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

  const inputPrompt = `
      Job Title: ${jobPosition}, Job Description: ${jobDescription}, Tech Stacks: ${techStacks}, Years of Experience: ${jobExperience}.
      Based on this job, generate ${process.env.NEXT_PUBLIC_INTERVIEW_QUES_COUNT} interview questions along with answers in **valid JSON format**.

      Strictly follow these JSON rules:
      1. **Do not include any markdown formatting** (like \`\`\`json or \`\`\`).
      2. Ensure that all answers are **single-line or properly escaped**.
      3. Do **not** use line breaks (\\n) or extra spaces inside the JSON values.
      4. Provide output as a **valid JSON object**, where each question has "ques" and "ans" fields.
      `;

  try {
    const rawResponse = await generateText(inputPrompt);
    const mockJsonResponse = extractJson(rawResponse);

    if (!mockJsonResponse) {
      return { success: false, error: "The AI response did not contain any questions." };
    }

    const [created] = await getDb()
      .insert(MockInterview)
      .values({
        mockId: uuidv4(),
        jsonMockResp: mockJsonResponse,
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
    console.error("[createInterview] failed:", error);
    return { success: false, error: "Could not generate the interview. Please try again." };
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
 * `questionIndex`, rather than trusted from the browser.
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

  const feedbackPrompt =
    "Question: " + question.ques +
    ", User Answer: " + answer +
    ", Depending on question and user answer for given interview question" +
    " Please give us rating for answer and feedback as area of improvement if any. The rating should be upon 5." +
    "In Just 3 to 5 lines to improve it in JSON format with rating field and feedback field." +
    "Strictly follow these JSON rules:1. **Do not include any markdown formatting** (like ```json or ```)." +
    "2. Ensure that all answers are **single-line or properly escaped**." +
    "3. Do **not** use line breaks (\\n) or extra spaces inside the JSON values.";

  try {
    const rawResponse = await generateText(feedbackPrompt);

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(rawResponse.trim());
    } catch {
      const jsonMatch = rawResponse.match(/```json([\s\S]*?)```/);
      try {
        parsedResponse = jsonMatch ? JSON.parse(jsonMatch[1].trim()) : null;
      } catch {
        parsedResponse = null;
      }
    }

    await getDb()
      .insert(UserAnswer)
      .values({
        mockIdRef: interview.mockId,
        question: question.ques,
        correctAns: question.ans,
        userAnswer: answer,
        feedback: parsedResponse?.feedback || "Could not parse feedback. The answer was recorded.",
        rating: parsedResponse?.rating != null ? String(parsedResponse.rating) : "N/A",
        userEmail: email,
        createdAt: moment().format("DD-MM-YYYY"),
      });

    return { success: true };
  } catch (error) {
    console.error("[saveAnswer] failed:", error);
    return { success: false, error: "Something went wrong. Try again!" };
  }
}
