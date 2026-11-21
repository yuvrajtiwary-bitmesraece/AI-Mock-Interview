import "server-only";

import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";

import { getDb } from "./db.js";
import { withRetry } from "./retry.js";
import { MockInterview, UserAnswer } from "./schema.js";

/**
 * Read queries for server components. Every function takes the viewer from
 * `getViewer()` and only returns that user's data.
 *
 * These are plain server functions, not server actions, so the browser can't
 * call them directly. Reads are retried on transient network errors.
 */

/** SQL condition matching interviews owned by `viewer`. */
export function ownedBy(viewer) {
  const byUserId = eq(MockInterview.userId, viewer.id);
  if (!viewer.email) return byUserId;
  // Interviews created before 1.1 have no userId yet: match them by verified email.
  return or(byUserId, and(isNull(MockInterview.userId), eq(MockInterview.createdBy, viewer.email)));
}

/** The interview with `mockId` if `viewer` owns it, otherwise null. */
export async function getOwnedInterview(viewer, mockId) {
  if (!viewer || typeof mockId !== "string" || mockId.length > 64) return null;

  const [interview] = await withRetry(() =>
    getDb()
      .select()
      .from(MockInterview)
      .where(and(eq(MockInterview.mockId, mockId), ownedBy(viewer)))
      .limit(1)
  );
  return interview ?? null;
}

/**
 * All of `viewer`'s interviews, newest first, plus every saved answer to them
 * (oldest first): the raw material for the dashboard (see utils/progress.js).
 *
 * Also gives older interviews (matched by email) the viewer's user ID, so
 * they stay theirs even if the account's email address changes later.
 */
export async function getDashboardRows(viewer) {
  if (!viewer) return { interviews: [], answers: [] };

  const rows = await withRetry(() =>
    getDb()
      .select({
        mockId: MockInterview.mockId,
        jobPosition: MockInterview.jobPosition,
        jobExperience: MockInterview.jobExperience,
        jsonMockResp: MockInterview.jsonMockResp,
        createdAt: MockInterview.createdAt,
        createdOn: MockInterview.createdOn,
        interviewType: MockInterview.interviewType,
        difficulty: MockInterview.difficulty,
        company: MockInterview.company,
        resumeUsed: MockInterview.resumeUsed,
        userId: MockInterview.userId,
      })
      .from(MockInterview)
      .where(ownedBy(viewer))
      .orderBy(desc(MockInterview.id))
  );

  if (viewer.email && rows.some((row) => !row.userId)) {
    try {
      await getDb()
        .update(MockInterview)
        .set({ userId: viewer.id })
        .where(and(isNull(MockInterview.userId), eq(MockInterview.createdBy, viewer.email)));
    } catch (error) {
      // Not fatal: the rows still match by email and get another try next time.
      console.error("[queries] claiming older interviews failed:", error);
    }
  }

  const interviews = rows.map(({ userId, ...interview }) => interview);
  if (interviews.length === 0) return { interviews, answers: [] };

  const answers = await withRetry(() =>
    getDb()
      .select({
        mockIdRef: UserAnswer.mockIdRef,
        questionIndex: UserAnswer.questionIndex,
        question: UserAnswer.question,
        rating: UserAnswer.rating,
        analysis: UserAnswer.analysis,
        createdAt: UserAnswer.createdAt,
        createdOn: UserAnswer.createdOn,
      })
      .from(UserAnswer)
      .where(inArray(UserAnswer.mockIdRef, interviews.map((interview) => interview.mockId)))
      .orderBy(asc(UserAnswer.id))
  );

  return { interviews, answers };
}

/** Everything stored for `viewer`: interviews with their answers. Used for data export. */
export async function getAllUserData(viewer) {
  const interviews = await withRetry(() =>
    getDb().select().from(MockInterview).where(ownedBy(viewer)).orderBy(asc(MockInterview.id))
  );
  if (interviews.length === 0) return [];

  const answers = await withRetry(() =>
    getDb()
      .select()
      .from(UserAnswer)
      .where(inArray(UserAnswer.mockIdRef, interviews.map((interview) => interview.mockId)))
      .orderBy(asc(UserAnswer.id))
  );

  return interviews.map((interview) => ({
    ...interview,
    answers: answers.filter((answer) => answer.mockIdRef === interview.mockId),
  }));
}

/** Saved answers for an interview, oldest first. Check ownership before calling. */
export async function getAnswersForInterview(mockId) {
  return withRetry(() =>
    getDb()
      .select()
      .from(UserAnswer)
      .where(eq(UserAnswer.mockIdRef, mockId))
      .orderBy(asc(UserAnswer.id))
  );
}
