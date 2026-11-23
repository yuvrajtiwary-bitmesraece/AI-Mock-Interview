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
import { and, eq, inArray, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { getViewer } from "@/utils/auth";
import { toLegacyDateString } from "@/utils/dates";
import { getDb } from "@/utils/db";
import { readAudio } from "@/utils/audio";
import { aiErrorMessage, generateJson, transcribeAudio } from "@/utils/gemini";
import { parseInterviewSettings } from "@/utils/interview-options";
import { limitReachedMessage } from "@/utils/limits";
import {
  FEEDBACK_SCHEMA,
  INTERVIEWER_SYSTEM_PROMPT,
  REPORT_SCHEMA,
  buildAnswerReviewPrompt,
  buildQuestionsPrompt,
  buildReportPrompt,
  buildTranscriptionPrompt,
  cleanTranscript,
  questionsSchema,
} from "@/utils/prompts";
import { getAllUserData, getAnswersForInterview, getOwnedInterview, getOwnedInterviewWithAnswers, ownedBy } from "@/utils/queries";
import { normalizeQuestions, parseInterviewQuestions } from "@/utils/questions";
import { answersSignature, latestAnswersByIndex, normalizeReport, normalizeReview } from "@/utils/report";
import { readResume } from "@/utils/resume";
import { isTransientNetworkError } from "@/utils/retry";
import { MockInterview, UsageCounter, UserAnswer } from "@/utils/schema";
import { analyzeAnswer } from "@/utils/speech";
import { consumeDailyQuota, refundDailyQuota } from "@/utils/usage";

// ---------------------------------------------------------------------------
// Helpers (not exported, so the browser can't call them)
// ---------------------------------------------------------------------------

/** Trims a form value and rejects anything that isn't a non-empty string. */
function cleanText(value, maxLength) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

const fail = (error) => ({ success: false, error });

/**
 * Runs an action body and turns any unexpected error (database or Clerk
 * unreachable, a bug...) into a failure result, so the browser always gets a
 * message it can show instead of a rejected promise.
 */
async function guard(label, body) {
  try {
    return await body();
  } catch (error) {
    console.error(`[${label}] unexpected error:`, error);
    return fail(
      isTransientNetworkError(error)
        ? "We couldn't reach the server. Check your connection and try again."
        : "Something went wrong on our side. Please try again."
    );
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Generates questions with Gemini and stores a new interview.
 *
 * Takes the new-interview form as FormData (see utils/interview-options.js for
 * the fields). An optional "resume" PDF is sent to Gemini to tailor the
 * questions and is never stored.
 */
export async function createInterview(formData) {
  return guard("createInterview", () => createInterviewUnguarded(formData));
}

async function createInterviewUnguarded(formData) {
  const viewer = await getViewer();
  if (!viewer) return fail("Please sign in again.");

  const settings = parseInterviewSettings(formData);
  if (!settings.ok) return fail(settings.error);
  const { jobPosition, company, techStacks, jobDescription, jobExperience, interviewType, difficulty, questionCount } = settings.values;

  const resume = await readResume(typeof formData?.get === "function" ? formData.get("resume") : null);
  if (!resume.ok) return fail(resume.error);

  const quota = await consumeDailyQuota(viewer.id, "interview");
  if (!quota.allowed) return fail(limitReachedMessage("interview", quota.limit));

  let questions;
  try {
    const reply = await generateJson({
      system: INTERVIEWER_SYSTEM_PROMPT,
      prompt: buildQuestionsPrompt({
        jobPosition,
        company,
        jobDescription,
        techStacks,
        jobExperience,
        questionCount,
        interviewType,
        difficulty,
        hasResume: Boolean(resume.file),
      }),
      files: resume.file ? [resume.file] : [],
      schema: questionsSchema(questionCount),
      maxOutputTokens: 8192,
      timeoutMs: 40_000,
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
        interviewType,
        difficulty,
        company: company || null,
        resumeUsed: Boolean(resume.file),
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
  return guard("deleteInterview", () => deleteInterviewUnguarded(mockId));
}

async function deleteInterviewUnguarded(mockId) {
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
 * Transcribes a recorded answer with Gemini and returns the text, which the
 * candidate can still edit before submitting. The recording is never stored.
 * Takes FormData with "mockId", "questionIndex" and "audio" (the recording).
 */
export async function transcribeAnswer(formData) {
  return guard("transcribeAnswer", () => transcribeAnswerUnguarded(formData));
}

async function transcribeAnswerUnguarded(formData) {
  const get = (name) => (typeof formData?.get === "function" ? formData.get(name) : null);

  const viewer = await getViewer();
  const mockId = get("mockId");
  const interview = await getOwnedInterview(viewer, typeof mockId === "string" ? mockId : null);
  if (!interview) return fail("Interview not found.");

  const questionIndex = Number(get("questionIndex"));
  const question = Number.isInteger(questionIndex) ? parseInterviewQuestions(interview.jsonMockResp)[questionIndex] : undefined;
  if (!question) return fail("Question not found.");

  const audio = await readAudio(get("audio"));
  if (!audio.ok) return fail(audio.error);

  const quota = await consumeDailyQuota(viewer.id, "transcription");
  if (!quota.allowed) return fail(limitReachedMessage("transcription", quota.limit));

  let transcript;
  try {
    transcript = cleanTranscript(
      await transcribeAudio({
        audio: audio.file,
        prompt: buildTranscriptionPrompt({
          question: question.ques,
          jobPosition: interview.jobPosition,
          techStacks: interview.techStacks,
        }),
      })
    );
  } catch (error) {
    console.error("[transcribeAnswer] Gemini request failed:", error);
    await refundDailyQuota(viewer.id, "transcription");
    return fail(aiErrorMessage(error));
  }

  if (!transcript) {
    return fail("We couldn't hear any speech in that recording. Check your microphone and try again.");
  }
  return { success: true, transcript };
}

/**
 * Reviews an answer with Gemini and stores it with its rubric scores and
 * delivery metrics. Returns the review so the interview room can show it
 * straight away.
 *
 * The question is looked up on the server from `questionIndex` instead of
 * being trusted from the browser, and delivery metrics are computed here from
 * the final text. Answering a question again replaces the earlier answer.
 */
export async function saveAnswer(input) {
  return guard("saveAnswer", () => saveAnswerUnguarded(input ?? {}));
}

async function saveAnswerUnguarded({ mockId, questionIndex, userAnswer, mode, durationSec }) {
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

  const metrics = analyzeAnswer(answer, {
    mode: mode === "voice" ? "voice" : "text",
    durationSec: Number(durationSec),
  });

  const quota = await consumeDailyQuota(viewer.id, "answer");
  if (!quota.allowed) return fail(limitReachedMessage("answer", quota.limit));

  let review;
  try {
    const reply = await generateJson({
      system: INTERVIEWER_SYSTEM_PROMPT,
      prompt: buildAnswerReviewPrompt({
        question: question.ques,
        answer,
        interviewType: interview.interviewType,
        referenceAnswer: question.ans,
        delivery: metrics.mode === "voice" ? metrics : null,
      }),
      schema: FEEDBACK_SCHEMA,
      temperature: 0.4,
      maxOutputTokens: 3072,
    });
    review = normalizeReview(reply);
  } catch (error) {
    console.error("[saveAnswer] Gemini request failed:", error);
    await refundDailyQuota(viewer.id, "answer");
    return fail(aiErrorMessage(error));
  }

  const now = new Date();
  const { rating, feedback, ...analysis } = review;

  try {
    const db = getDb();
    await db.batch([
      // Replace any earlier answer to this question (older rows only have the question text).
      db
        .delete(UserAnswer)
        .where(
          and(
            eq(UserAnswer.mockIdRef, interview.mockId),
            or(eq(UserAnswer.questionIndex, questionIndex), eq(UserAnswer.question, question.ques))
          )
        ),
      db.insert(UserAnswer).values({
        mockIdRef: interview.mockId,
        questionIndex,
        question: question.ques,
        correctAns: question.ans,
        userAnswer: answer,
        feedback,
        rating: rating === null ? "N/A" : String(rating),
        analysis,
        metrics,
        userEmail: viewer.email,
        createdAt: toLegacyDateString(now),
        createdOn: now,
      }),
    ]);
  } catch (error) {
    console.error("[saveAnswer] database write failed:", error);
    return fail("Could not save your answer. Please try again.");
  }

  // If that was the last unanswered question, write the coaching report now,
  // after this response is sent, so it's ready when the candidate opens it.
  after(() => prepareReport(viewer, interview));

  revalidatePath(`/dashboard/interview/${interview.mockId}/feedback`);
  return { success: true, review, metrics };
}

/**
 * Returns the AI coaching report for an interview, generating it when there is
 * none yet or the answers changed since it was written (or when `force` is set).
 */
export async function generateReport(mockId, { force = false } = {}) {
  return guard("generateReport", () => generateReportUnguarded(mockId, force === true));
}

async function generateReportUnguarded(mockId, force) {
  const viewer = await getViewer();
  const { interview, answers: rows } = await getOwnedInterviewWithAnswers(viewer, mockId);
  if (!interview) return fail("Interview not found.");

  const questions = parseInterviewQuestions(interview.jsonMockResp);
  const answers = [...latestAnswersByIndex(rows, questions).values()];
  if (answers.length === 0) return fail("Answer at least one question to get a report.");

  const signature = answersSignature(answers);
  if (!force && interview.report?.signature === signature) {
    return { success: true, report: interview.report };
  }

  const result = await writeReport({ viewer, interview, answers, signature });
  return result.error ? fail(result.error) : { success: true, report: result.report };
}

/**
 * Asks Gemini for the coaching report on `answers` and saves it on the
 * interview. Returns `{ report }` or `{ error }`. Used by generateReport and
 * by the background preparation after the last answer.
 */
async function writeReport({ viewer, interview, answers, signature }) {
  const quota = await consumeDailyQuota(viewer.id, "report");
  if (!quota.allowed) return { error: limitReachedMessage("report", quota.limit) };

  let report;
  try {
    const reply = await generateJson({
      system: INTERVIEWER_SYSTEM_PROMPT,
      prompt: buildReportPrompt({
        jobPosition: interview.jobPosition,
        interviewType: interview.interviewType,
        difficulty: interview.difficulty,
        jobExperience: interview.jobExperience,
        answers,
      }),
      schema: REPORT_SCHEMA,
      temperature: 0.5,
      maxOutputTokens: 4096,
    });
    report = { ...normalizeReport(reply), signature, generatedAt: new Date().toISOString() };
  } catch (error) {
    console.error("[report] Gemini request failed:", error);
    await refundDailyQuota(viewer.id, "report");
    return { error: aiErrorMessage(error) };
  }

  try {
    await getDb().update(MockInterview).set({ report }).where(eq(MockInterview.mockId, interview.mockId));
  } catch (error) {
    // The report is still returned; it will just be generated again next time.
    console.error("[report] saving the report failed:", error);
  }

  return { report };
}

/**
 * Runs after saveAnswer has responded. Once every question has an answer, it
 * writes the coaching report ahead of time, so the report page opens with it
 * already there. Failures are only logged: the report page can still write
 * the report itself.
 */
async function prepareReport(viewer, interview) {
  try {
    const questions = parseInterviewQuestions(interview.jsonMockResp);
    const answers = [...latestAnswersByIndex(await getAnswersForInterview(interview.mockId), questions).values()];
    if (answers.length === 0 || answers.length < questions.length) return;

    const signature = answersSignature(answers);
    if (interview.report?.signature === signature) return;
    await writeReport({ viewer, interview, answers, signature });
  } catch (error) {
    console.error("[report] preparing the report failed:", error);
  }
}

/** Starts a new attempt with the same questions and settings. No AI request is needed. */
export async function retakeInterview(mockId) {
  return guard("retakeInterview", () => retakeInterviewUnguarded(mockId));
}

async function retakeInterviewUnguarded(mockId) {
  const viewer = await getViewer();
  const interview = await getOwnedInterview(viewer, mockId);
  if (!interview) return fail("Interview not found.");

  const now = new Date();
  const newMockId = randomUUID();
  await getDb()
    .insert(MockInterview)
    .values({
      mockId: newMockId,
      jsonMockResp: interview.jsonMockResp,
      jobPosition: interview.jobPosition,
      jobDescription: interview.jobDescription,
      techStacks: interview.techStacks,
      jobExperience: interview.jobExperience,
      interviewType: interview.interviewType,
      difficulty: interview.difficulty,
      company: interview.company,
      resumeUsed: interview.resumeUsed,
      userId: viewer.id,
      createdBy: viewer.email ?? viewer.id,
      createdAt: toLegacyDateString(now),
      createdOn: now,
    });

  revalidatePath("/dashboard");
  return { success: true, mockId: newMockId };
}

/**
 * Everything stored for the signed-in user, as plain JSON: interviews,
 * questions, answers and feedback. The page turns it into a downloaded file.
 */
export async function exportMyData() {
  return guard("exportMyData", async () => {
    const viewer = await getViewer();
    if (!viewer) return fail("Please sign in again.");

    const interviews = (await getAllUserData(viewer)).map((interview) => ({
      id: interview.mockId,
      createdOn: interview.createdOn ?? interview.createdAt,
      jobPosition: interview.jobPosition,
      company: interview.company,
      jobDescription: interview.jobDescription,
      techStacks: interview.techStacks,
      yearsOfExperience: interview.jobExperience,
      interviewType: interview.interviewType,
      difficulty: interview.difficulty,
      resumeUsed: interview.resumeUsed,
      questions: parseInterviewQuestions(interview.jsonMockResp),
      report: interview.report,
      answers: interview.answers.map((answer) => ({
        question: answer.question,
        answer: answer.userAnswer,
        rating: answer.rating,
        feedback: answer.feedback,
        analysis: answer.analysis,
        metrics: answer.metrics,
        modelAnswer: answer.correctAns,
        createdOn: answer.createdOn ?? answer.createdAt,
      })),
    }));

    return { success: true, data: { exportedAt: new Date().toISOString(), app: "AI Mock Interview", interviews } };
  });
}

/**
 * Permanently deletes every interview, answer and usage record of the
 * signed-in user. `confirmation` must be the word DELETE, so a stray
 * request can't wipe an account. The Clerk account itself is managed by Clerk.
 */
export async function deleteMyData(confirmation) {
  return guard("deleteMyData", async () => {
    const viewer = await getViewer();
    if (!viewer) return fail("Please sign in again.");
    if (confirmation !== "DELETE") return fail('Type DELETE to confirm.');

    const db = getDb();
    const owned = await db.select({ mockId: MockInterview.mockId }).from(MockInterview).where(ownedBy(viewer));
    const mockIds = owned.map((row) => row.mockId);

    const statements = [db.delete(UsageCounter).where(eq(UsageCounter.userId, viewer.id))];
    if (mockIds.length > 0) {
      statements.unshift(
        db.delete(UserAnswer).where(inArray(UserAnswer.mockIdRef, mockIds)),
        db.delete(MockInterview).where(inArray(MockInterview.mockId, mockIds))
      );
    }
    // One transaction: everything is deleted, or nothing is.
    await db.batch(statements);

    revalidatePath("/dashboard");
    return { success: true, deletedInterviews: mockIds.length };
  });
}
