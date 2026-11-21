/**
 * Progress statistics for the dashboard: totals, score trend, skills,
 * practice activity and streaks. Days are UTC days ("YYYY-MM-DD").
 * Pure module, covered by unit tests.
 */

import { getCreatedDate } from "./dates.js";
import { utcDay } from "./limits.js";
import { parseInterviewQuestions } from "./questions.js";
import { averageRating, parseRating } from "./rating.js";
import { CRITERIA } from "./report.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" for `days` days before `day`. */
export function shiftDay(day, days) {
  return utcDay(new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS));
}

/**
 * Consecutive days with practice, ending today, or yesterday if there was
 * no practice yet today (so a streak isn't lost before the day is over).
 */
export function currentStreak(activeDays, today = utcDay()) {
  let day = activeDays.has(today) ? today : shiftDay(today, -1);
  let streak = 0;
  while (activeDays.has(day)) {
    streak += 1;
    day = shiftDay(day, -1);
  }
  return streak;
}

/** Longest run of consecutive practice days. */
export function longestStreak(activeDays) {
  let longest = 0;
  for (const day of activeDays) {
    if (activeDays.has(shiftDay(day, -1))) continue; // not the start of a run
    let length = 1;
    while (activeDays.has(shiftDay(day, length))) length += 1;
    longest = Math.max(longest, length);
  }
  return longest;
}

/**
 * Answers per day for the last `weeks` weeks, as columns of 7 days
 * (Monday first), ending with the week that contains `today`.
 */
export function activityGrid(countsByDay, { weeks = 12, today = utcDay() } = {}) {
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  const start = shiftDay(today, -(weeks - 1) * 7 - weekday);
  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, dayOfWeek) => {
      const day = shiftDay(start, week * 7 + dayOfWeek);
      return { day, count: day > today ? null : (countsByDay.get(day) ?? 0) };
    })
  );
}

/**
 * Everything the dashboard shows, from the user's interviews and answers.
 * `interviews` need mockId, jsonMockResp and creation fields; `answers` need
 * mockIdRef, rating, analysis and creation fields. Answers are expected
 * oldest first; only the latest answer per question counts.
 */
export function buildProgress(interviews, answers, { today = utcDay() } = {}) {
  // Latest answer per interview question (re-answering replaces the old one).
  const latest = new Map();
  for (const answer of answers) {
    const key = `${answer.mockIdRef}#${Number.isInteger(answer.questionIndex) ? answer.questionIndex : answer.question}`;
    latest.set(key, answer);
  }
  const current = [...latest.values()];

  const byInterview = new Map();
  for (const answer of current) {
    if (!byInterview.has(answer.mockIdRef)) byInterview.set(answer.mockIdRef, []);
    byInterview.get(answer.mockIdRef).push(answer);
  }

  const cards = interviews.map((interview) => {
    const rows = byInterview.get(interview.mockId) ?? [];
    const created = getCreatedDate(interview);
    return {
      mockId: interview.mockId,
      jobPosition: interview.jobPosition,
      company: interview.company ?? null,
      interviewType: interview.interviewType ?? null,
      difficulty: interview.difficulty ?? null,
      jobExperience: interview.jobExperience,
      resumeUsed: Boolean(interview.resumeUsed),
      createdOn: created ? created.toISOString() : null,
      questionCount: parseInterviewQuestions(interview.jsonMockResp).length,
      answeredCount: rows.length,
      score: averageRating(rows.map((row) => parseRating(row.rating))),
    };
  });

  // Score trend: one point per interview with a score, oldest first.
  const trend = cards
    .filter((card) => card.score !== null)
    .sort((a, b) => (a.createdOn ?? "").localeCompare(b.createdOn ?? ""))
    .slice(-12)
    .map((card) => ({ id: card.mockId, label: card.jobPosition, date: card.createdOn, score: Math.round(card.score * 10) / 10 }));

  const skills = {};
  for (const { key } of CRITERIA) {
    const scores = current.map((row) => row.analysis?.criteria?.[key]).filter(Number.isFinite);
    skills[key] = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
  }

  const countsByDay = new Map();
  for (const answer of current) {
    const created = getCreatedDate(answer);
    if (!created) continue;
    const day = utcDay(created);
    countsByDay.set(day, (countsByDay.get(day) ?? 0) + 1);
  }
  const activeDays = new Set(countsByDay.keys());

  return {
    totals: {
      interviews: interviews.length,
      answered: current.length,
      averageScore: averageRating(current.map((row) => parseRating(row.rating))),
      currentStreak: currentStreak(activeDays, today),
      longestStreak: longestStreak(activeDays),
      practiceDays: activeDays.size,
    },
    cards,
    trend,
    skills,
    activity: activityGrid(countsByDay, { today }),
  };
}

/**
 * Up to three suggestions for what to practice next: finish an unfinished
 * interview, work on the weakest rubric skill, or try a new interview type.
 * `types` is the list of interview type ids in display order.
 */
export function suggestNextSteps(progress, types) {
  const steps = [];

  const unfinished = progress.cards.find((card) => card.answeredCount > 0 && card.answeredCount < card.questionCount);
  if (unfinished) {
    const left = unfinished.questionCount - unfinished.answeredCount;
    steps.push({
      kind: "finish",
      title: `Finish your ${unfinished.jobPosition} interview`,
      text: `${left} ${left === 1 ? "question" : "questions"} left. Finishing gives you a complete coaching report.`,
      href: `/dashboard/interview/${unfinished.mockId}/start`,
      cta: "Continue",
    });
  }

  const scored = CRITERIA.filter(({ key }) => Number.isFinite(progress.skills[key]));
  if (scored.length > 0) {
    const weakest = scored.reduce((low, criterion) => (progress.skills[criterion.key] < progress.skills[low.key] ? criterion : low));
    if (progress.skills[weakest.key] < 4) {
      steps.push({
        kind: "skill",
        title: `Work on ${weakest.label.toLowerCase()}`,
        text: `Your lowest skill (${progress.skills[weakest.key].toFixed(1)}/5): ${weakest.description.toLowerCase()}.`,
        href: "/dashboard/new",
        cta: "Practice",
      });
    }
  }

  const tried = new Set(progress.cards.map((card) => card.interviewType ?? "technical"));
  const untried = types.find((type) => !tried.has(type));
  if (untried) {
    steps.push({ kind: "type", type: untried, href: `/dashboard/new?type=${untried}`, cta: "Try it" });
  }

  return steps.slice(0, 3);
}
