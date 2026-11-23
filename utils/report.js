/**
 * Turns AI reviews and saved answers into the numbers shown in the interview
 * room and the report. Pure module, covered by unit tests.
 */

import { averageRating, parseRating } from "./rating.js";

/** The four rubric criteria every answer is scored on (1 to 5). */
export const CRITERIA = [
  { key: "relevance", label: "Relevance", description: "Answers the question that was asked" },
  { key: "depth", label: "Depth", description: "Accuracy, specifics and substance" },
  { key: "structure", label: "Structure", description: "A clear, logical flow (STAR for behavioral questions)" },
  { key: "communication", label: "Communication", description: "Clear, concise and confident" },
];

export const READINESS = {
  ready: { label: "Interview-ready", tone: "success" },
  almost: { label: "Almost there", tone: "warning" },
  "not-yet": { label: "Needs more practice", tone: "danger" },
};

function clampScore(value) {
  return Number.isFinite(value) ? Math.min(5, Math.max(1, Math.round(value))) : null;
}

function cleanText(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function cleanList(list, max) {
  return Array.isArray(list)
    ? list.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()).slice(0, max)
    : [];
}

/** Validates an AI answer review: scores clamped to 1-5, lists capped, text trimmed. */
export function normalizeReview(review) {
  const criteria = {};
  for (const { key } of CRITERIA) criteria[key] = clampScore(review?.criteria?.[key]);

  return {
    rating: clampScore(review?.rating),
    feedback: cleanText(review?.feedback, "No feedback available."),
    criteria,
    strengths: cleanList(review?.strengths, 3),
    improvements: cleanList(review?.improvements, 3),
    improvedAnswer: cleanText(review?.improvedAnswer),
  };
}

/** Validates an AI interview report. Unknown readiness values become "almost". */
export function normalizeReport(report) {
  return {
    headline: cleanText(report?.headline, "Here's how your interview went."),
    readiness: report?.readiness in READINESS ? report.readiness : "almost",
    summary: cleanText(report?.summary),
    strengths: cleanList(report?.strengths, 4),
    improvements: cleanList(report?.improvements, 4),
    practicePlan: Array.isArray(report?.practicePlan)
      ? report.practicePlan
          .filter((item) => cleanText(item?.topic) && cleanText(item?.action))
          .map((item) => ({ topic: item.topic.trim(), action: item.action.trim() }))
          .slice(0, 4)
      : [],
  };
}

/**
 * The latest saved answer for each question, as a Map from question index to
 * row. Rows arrive oldest first. Rows saved before 1.1 have no questionIndex
 * and are matched by question text.
 */
export function latestAnswersByIndex(rows, questions) {
  const indexByText = new Map(questions.map((question, index) => [question.ques, index]));
  const latest = new Map();
  for (const row of rows) {
    const index = Number.isInteger(row.questionIndex) ? row.questionIndex : indexByText.get(row.question);
    if (index !== undefined && index < questions.length) latest.set(index, row);
  }
  return latest;
}

/** Overall score, per-criterion averages and delivery stats for a set of answers. */
export function summarizeAnswers(rows) {
  const overall = averageRating(rows.map((row) => parseRating(row.rating)));

  const criteria = {};
  for (const { key } of CRITERIA) {
    criteria[key] = averageRating(rows.map((row) => clampScore(row.analysis?.criteria?.[key])));
  }

  const voice = rows.map((row) => row.metrics).filter((metrics) => metrics?.mode === "voice");
  const paced = voice.filter((metrics) => Number.isFinite(metrics.wordsPerMinute));
  const delivery = voice.length
    ? {
        answers: voice.length,
        speakingSec: voice.reduce((sum, metrics) => sum + (metrics.durationSec || 0), 0),
        avgWordsPerMinute: paced.length
          ? Math.round(paced.reduce((sum, metrics) => sum + metrics.wordsPerMinute, 0) / paced.length)
          : null,
        fillerCount: voice.reduce((sum, metrics) => sum + (metrics.fillerCount || 0), 0),
      }
    : null;

  return { answered: rows.length, overall, criteria, delivery };
}

/** Changes whenever an answer is added or replaced, so a cached report can be recognized as stale. */
export function answersSignature(rows) {
  return rows
    .map((row) => `${row.id}:${row.rating}`)
    .sort()
    .join("|");
}

/** How long after the last answer the report page may wait for the report being written in the background. */
export const REPORT_WAIT_WINDOW_MS = 15_000;

/**
 * How long the report page should wait, in ms, for the coaching report that
 * saveAnswer starts writing in the background once every question has an
 * answer (0: don't wait). It only waits when the last answer was saved
 * moments ago, so the report is probably still being written.
 */
export function reportWaitMs(rows, questionCount, now = Date.now()) {
  if (rows.length === 0 || rows.length < questionCount) return 0;
  const lastSavedAt = Math.max(...rows.map((row) => new Date(row.createdOn ?? 0).getTime() || 0));
  return Math.min(REPORT_WAIT_WINDOW_MS, Math.max(0, lastSavedAt + REPORT_WAIT_WINDOW_MS - now));
}

/** A 0-5 score as a whole percentage, or null. */
export function scorePercent(score) {
  return Number.isFinite(score) ? Math.round((score / 5) * 100) : null;
}
