import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { activityGrid, buildProgress, currentStreak, longestStreak, shiftDay, suggestNextSteps } from "../progress.js";

const questions = (count) => JSON.stringify(Array.from({ length: count }, (_, i) => ({ ques: `Q${i + 1}`, ans: "A" })));

describe("days and streaks", () => {
  it("shifts days across month and year boundaries", () => {
    assert.equal(shiftDay("2026-03-01", -1), "2026-02-28");
    assert.equal(shiftDay("2026-12-31", 1), "2027-01-01");
  });

  it("counts the current streak through today, or through yesterday if today has no practice yet", () => {
    const days = new Set(["2026-11-19", "2026-11-20", "2026-11-21"]);
    assert.equal(currentStreak(days, "2026-11-21"), 3);
    assert.equal(currentStreak(days, "2026-11-22"), 3);
    assert.equal(currentStreak(days, "2026-11-23"), 0);
    assert.equal(currentStreak(new Set(), "2026-11-23"), 0);
  });

  it("finds the longest run", () => {
    const days = new Set(["2026-01-01", "2026-01-02", "2026-01-05", "2026-01-06", "2026-01-07"]);
    assert.equal(longestStreak(days), 3);
    assert.equal(longestStreak(new Set()), 0);
  });
});

describe("activityGrid", () => {
  it("returns weeks of seven days, Monday first, with future days empty", () => {
    // 2026-11-21 is a Saturday.
    const grid = activityGrid(new Map([["2026-11-21", 2]]), { weeks: 2, today: "2026-11-21" });
    assert.equal(grid.length, 2);
    assert.equal(grid[0].length, 7);
    assert.equal(grid[0][0].day, "2026-11-09"); // a Monday
    assert.deepEqual(grid[1][5], { day: "2026-11-21", count: 2 });
    assert.deepEqual(grid[1][6], { day: "2026-11-22", count: null });
    assert.equal(grid[1][0].count, 0);
  });
});

describe("buildProgress", () => {
  const interviews = [
    { mockId: "b", jobPosition: "Backend", jobExperience: "3", jsonMockResp: questions(3), createdOn: "2026-11-20T10:00:00Z", interviewType: "technical" },
    { mockId: "a", jobPosition: "Analyst", jobExperience: "1", jsonMockResp: questions(2), createdAt: "10-11-2026" },
  ];
  const answers = [
    { mockIdRef: "a", question: "Q1", rating: "2", createdAt: "10-11-2026" },
    { mockIdRef: "b", questionIndex: 0, question: "Q1", rating: "3", createdOn: "2026-11-20T10:05:00Z", analysis: { criteria: { relevance: 3, depth: 2, structure: 4, communication: 3 } } },
    // A later answer to the same question replaces the earlier one.
    { mockIdRef: "b", questionIndex: 0, question: "Q1", rating: "5", createdOn: "2026-11-21T09:00:00Z", analysis: { criteria: { relevance: 5, depth: 4, structure: 5, communication: 5 } } },
    { mockIdRef: "b", questionIndex: 1, question: "Q2", rating: "4", createdOn: "2026-11-21T09:10:00Z" },
  ];

  const progress = buildProgress(interviews, answers, { today: "2026-11-21" });

  it("counts interviews and the latest answer per question", () => {
    assert.equal(progress.totals.interviews, 2);
    assert.equal(progress.totals.answered, 3);
    assert.equal(progress.totals.averageScore, (2 + 5 + 4) / 3);
  });

  it("builds per-interview cards with progress and score", () => {
    const backend = progress.cards.find((card) => card.mockId === "b");
    assert.equal(backend.questionCount, 3);
    assert.equal(backend.answeredCount, 2);
    assert.equal(backend.score, 4.5);
    assert.equal(progress.cards.find((card) => card.mockId === "a").createdOn, "2026-11-10T00:00:00.000Z");
  });

  it("orders the trend oldest first", () => {
    assert.deepEqual(progress.trend.map((point) => [point.label, point.score]), [["Analyst", 2], ["Backend", 4.5]]);
  });

  it("averages skills from answers that have rubric scores", () => {
    assert.deepEqual(progress.skills, { relevance: 5, depth: 4, structure: 5, communication: 5 });
  });

  it("tracks practice days and streaks", () => {
    assert.equal(progress.totals.practiceDays, 2); // 10 Nov and 21 Nov (the 20 Nov answer was replaced)
    assert.equal(progress.totals.currentStreak, 1);
    assert.equal(progress.totals.longestStreak, 1);
  });

  it("handles a brand-new user", () => {
    const empty = buildProgress([], [], { today: "2026-11-21" });
    assert.equal(empty.totals.interviews, 0);
    assert.equal(empty.totals.averageScore, null);
    assert.deepEqual(empty.trend, []);
    assert.equal(empty.activity.length, 12);
  });
});

describe("suggestNextSteps", () => {
  const types = ["technical", "behavioral", "system-design"];
  const base = { skills: { relevance: null, depth: null, structure: null, communication: null } };

  it("suggests finishing an interview, the weakest skill and an untried type", () => {
    const steps = suggestNextSteps(
      {
        cards: [
          { mockId: "x", jobPosition: "Dev", answeredCount: 1, questionCount: 3, interviewType: "technical" },
        ],
        skills: { relevance: 4.5, depth: 2.5, structure: 3, communication: 4 },
      },
      types
    );
    assert.deepEqual(steps.map((step) => step.kind), ["finish", "skill", "type"]);
    assert.match(steps[0].text, /2 questions left/);
    assert.match(steps[1].title, /depth/);
    assert.equal(steps[2].type, "behavioral");
    assert.equal(steps[2].href, "/dashboard/new?type=behavioral");
  });

  it("skips skills that are already strong and types already tried", () => {
    const steps = suggestNextSteps(
      {
        ...base,
        cards: types.map((type) => ({ mockId: type, jobPosition: type, answeredCount: 2, questionCount: 2, interviewType: type })),
        skills: { relevance: 4.5, depth: 4.2, structure: 4.8, communication: 4.1 },
      },
      types
    );
    assert.deepEqual(steps, []);
  });

  it("treats interviews without a type as technical", () => {
    const steps = suggestNextSteps({ ...base, cards: [{ mockId: "a", jobPosition: "Old", answeredCount: 0, questionCount: 5 }] }, types);
    assert.equal(steps[0].type, "behavioral");
  });
});
