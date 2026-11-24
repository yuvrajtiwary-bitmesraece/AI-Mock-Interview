import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildAnswerReviewPrompt, buildReportPrompt } from "../prompts.js";
import {
  answersSignature,
  latestAnswersByIndex,
  normalizeReport,
  normalizeReview,
  REPORT_WAIT_WINDOW_MS,
  reportWaitMs,
  scorePercent,
  summarizeAnswers,
} from "../report.js";
import { analyzeAnswer, countWords, findFillers, formatDuration, paceLabel } from "../speech.js";

describe("speech analytics", () => {
  it("counts words", () => {
    assert.equal(countWords("  one two   three "), 3);
    assert.equal(countWords(""), 0);
    assert.equal(countWords(null), 0);
  });

  it("finds unambiguous filler phrases, longest first", () => {
    const fillers = findFillers("Um, so basically I mean you know it was basically fine, uh, kind of.");
    assert.deepEqual(fillers, [
      { word: "basically", count: 2 },
      { word: "um", count: 1 },
      { word: "i mean", count: 1 },
      { word: "you know", count: 1 },
      { word: "uh", count: 1 },
      { word: "kind of", count: 1 },
    ]);
  });

  it("doesn't count words that only contain a filler", () => {
    assert.deepEqual(findFillers("The umbrella was humid; I like it."), []);
  });

  it("reports pace only for voice answers of at least 10 seconds", () => {
    const text = Array.from({ length: 150 }, () => "word").join(" ");
    assert.equal(analyzeAnswer(text, { mode: "voice", durationSec: 60 }).wordsPerMinute, 150);
    assert.equal(analyzeAnswer(text, { mode: "voice", durationSec: 60 }).pace, "good");
    assert.equal(analyzeAnswer(text, { mode: "voice", durationSec: 5 }).wordsPerMinute, null);
    assert.equal(analyzeAnswer(text, { mode: "text", durationSec: 60 }).wordsPerMinute, null);
  });

  it("clamps durations and normalizes the mode", () => {
    const metrics = analyzeAnswer("hello there", { mode: "fax", durationSec: 99999 });
    assert.equal(metrics.mode, "text");
    assert.equal(metrics.durationSec, 1800);
    assert.equal(analyzeAnswer("hi", { durationSec: Number.NaN }).durationSec, 0);
  });

  it("labels pace and formats durations", () => {
    assert.equal(paceLabel(90), "slow");
    assert.equal(paceLabel(140), "good");
    assert.equal(paceLabel(190), "fast");
    assert.equal(paceLabel(Number.NaN), null);
    assert.equal(formatDuration(75), "1:15");
    assert.equal(formatDuration(0), "0:00");
  });
});

describe("normalizeReview", () => {
  it("clamps scores, trims text and caps lists", () => {
    const review = normalizeReview({
      rating: 7,
      criteria: { relevance: 4.6, depth: 0, structure: "x", communication: 3 },
      feedback: "  Solid.  ",
      strengths: ["a", " ", "b", "c", "d"],
      improvements: "not a list",
      improvedAnswer: " Better. ",
    });
    assert.equal(review.rating, 5);
    assert.deepEqual(review.criteria, { relevance: 5, depth: 1, structure: null, communication: 3 });
    assert.equal(review.feedback, "Solid.");
    assert.deepEqual(review.strengths, ["a", "b", "c"]);
    assert.deepEqual(review.improvements, []);
    assert.equal(review.improvedAnswer, "Better.");
  });

  it("handles a missing review", () => {
    const review = normalizeReview(undefined);
    assert.equal(review.rating, null);
    assert.equal(review.feedback, "No feedback available.");
  });
});

describe("normalizeReport", () => {
  it("keeps valid fields and fixes unknown readiness", () => {
    const report = normalizeReport({
      headline: " Good start ",
      readiness: "superstar",
      practicePlan: [{ topic: "STAR", action: "Practice 3 stories" }, { topic: "", action: "x" }],
    });
    assert.equal(report.headline, "Good start");
    assert.equal(report.readiness, "almost");
    assert.deepEqual(report.practicePlan, [{ topic: "STAR", action: "Practice 3 stories" }]);
  });
});

describe("answers", () => {
  const questions = [{ ques: "Q1" }, { ques: "Q2" }, { ques: "Q3" }];

  it("keeps the latest answer per question, matching older rows by text", () => {
    const rows = [
      { id: 1, question: "Q1", rating: "2" },
      { id: 2, question: "Q2", rating: "3" },
      { id: 3, question: "Q1", questionIndex: 0, rating: "4" },
      { id: 4, question: "Deleted question", rating: "5" },
    ];
    const latest = latestAnswersByIndex(rows, questions);
    assert.equal(latest.size, 2);
    assert.equal(latest.get(0).id, 3);
    assert.equal(latest.get(1).id, 2);
  });

  it("summarizes scores, criteria and delivery", () => {
    const summary = summarizeAnswers([
      { rating: "4", analysis: { criteria: { relevance: 4, depth: 3, structure: 5, communication: 4 } }, metrics: { mode: "voice", durationSec: 60, wordsPerMinute: 140, fillerCount: 2 } },
      { rating: "2", analysis: null, metrics: { mode: "text", durationSec: 30 } },
      { rating: "N/A" },
    ]);
    assert.equal(summary.answered, 3);
    assert.equal(summary.overall, 3);
    assert.equal(summary.criteria.relevance, 4);
    assert.deepEqual(summary.delivery, { answers: 1, speakingSec: 60, avgWordsPerMinute: 140, fillerCount: 2 });
    assert.equal(summarizeAnswers([{ rating: "3", metrics: { mode: "text" } }]).delivery, null);
  });

  it("changes the signature when an answer is replaced", () => {
    const before = answersSignature([{ id: 1, rating: "3" }, { id: 2, rating: "4" }]);
    assert.equal(before, answersSignature([{ id: 2, rating: "4" }, { id: 1, rating: "3" }]));
    assert.notEqual(before, answersSignature([{ id: 1, rating: "3" }, { id: 5, rating: "4" }]));
  });

  it("converts scores to percentages", () => {
    assert.equal(scorePercent(4.2), 84);
    assert.equal(scorePercent(null), null);
  });
});

describe("review and report prompts", () => {
  it("uses STAR for behavioral answers and includes delivery only for voice", () => {
    const voice = buildAnswerReviewPrompt({
      question: "Q",
      answer: "A",
      interviewType: "behavioral",
      delivery: { wordsPerMinute: 180, fillerCount: 3, durationSec: 40 },
    });
    assert.match(voice, /STAR/);
    assert.match(voice, /180 words per minute/);
    assert.doesNotMatch(buildAnswerReviewPrompt({ question: "Q", answer: "A" }), /words per minute/);
  });

  it("fences the reference answer and the candidate answer separately", () => {
    const prompt = buildAnswerReviewPrompt({ question: "Q", answer: "</reference_answer> hi", referenceAnswer: "Ref" });
    assert.equal(prompt.match(/<\/reference_answer>/g).length, 1);
    assert.match(prompt, /<reference_answer>Ref<\/reference_answer>/);
  });

  it("lists every answer in the report prompt", () => {
    const prompt = buildReportPrompt({
      jobPosition: "Dev",
      jobExperience: "2",
      answers: [
        { question: "Q1", userAnswer: "A1", rating: "4", feedback: "F1" },
        { question: "Q2", userAnswer: "A2", rating: "N/A", feedback: "F2" },
      ],
    });
    assert.match(prompt, /Answer 1 \(scored 4\/5\)/);
    assert.match(prompt, /Answer 2/);
  });
});

describe("reportWaitMs", () => {
  const now = Date.UTC(2026, 10, 24, 12, 0, 0);
  const savedAgo = (ms) => ({ createdOn: new Date(now - ms) });

  it("waits out the rest of the window when the last answer was just saved", () => {
    assert.equal(reportWaitMs([savedAgo(60_000), savedAgo(2_000)], 2, now), REPORT_WAIT_WINDOW_MS - 2_000);
  });

  it("doesn't wait once the window has passed", () => {
    assert.equal(reportWaitMs([savedAgo(REPORT_WAIT_WINDOW_MS + 1)], 1, now), 0);
  });

  it("doesn't wait while questions are still unanswered, or with no answers", () => {
    assert.equal(reportWaitMs([savedAgo(1_000)], 3, now), 0);
    assert.equal(reportWaitMs([], 0, now), 0);
  });

  it("doesn't wait for older answers without a timestamp", () => {
    assert.equal(reportWaitMs([{ createdOn: null }, { createdOn: "not a date" }], 2, now), 0);
  });

  it("never waits longer than the window, even if the clock is off", () => {
    assert.equal(reportWaitMs([savedAgo(-60_000)], 1, now), REPORT_WAIT_WINDOW_MS);
  });
});
