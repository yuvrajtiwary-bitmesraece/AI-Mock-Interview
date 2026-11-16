import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { normalizeQuestions, parseInterviewQuestions } from "../questions.js";

describe("parseInterviewQuestions", () => {
  it("parses a plain JSON array (format used for new interviews)", () => {
    const raw = JSON.stringify([{ ques: "What is React?", ans: "A UI library." }]);
    assert.deepEqual(parseInterviewQuestions(raw), [{ ques: "What is React?", ans: "A UI library." }]);
  });

  it("strips a ```json markdown fence (older interviews)", () => {
    const raw = '```json\n[{"ques":"Q1","ans":"A1"}]\n```';
    assert.deepEqual(parseInterviewQuestions(raw), [{ ques: "Q1", ans: "A1" }]);
  });

  it("unwraps arrays nested under a known key", () => {
    for (const key of ["questions", "interview_questions", "interviewQuestions", "questionsList", "questions_list"]) {
      const raw = JSON.stringify({ [key]: [{ ques: "Q", ans: "A" }] });
      assert.deepEqual(parseInterviewQuestions(raw), [{ ques: "Q", ans: "A" }], key);
    }
  });

  it("returns an empty array for empty or invalid input instead of throwing", () => {
    assert.deepEqual(parseInterviewQuestions(""), []);
    assert.deepEqual(parseInterviewQuestions(null), []);
    assert.deepEqual(parseInterviewQuestions(undefined), []);
    assert.deepEqual(parseInterviewQuestions("not json"), []);
    assert.deepEqual(parseInterviewQuestions('{"unexpected": true}'), []);
  });
});

describe("normalizeQuestions", () => {
  it("drops entries without a question and trims text", () => {
    const input = [
      { ques: "  Keep me  ", ans: "  answer  " },
      { ques: "", ans: "empty question" },
      { ans: "no question" },
      null,
      "a string",
    ];
    assert.deepEqual(normalizeQuestions(input), [{ ques: "Keep me", ans: "answer" }]);
  });

  it("defaults a missing answer to an empty string", () => {
    assert.deepEqual(normalizeQuestions([{ ques: "Q" }]), [{ ques: "Q", ans: "" }]);
  });

  it("returns an empty array for non-array values", () => {
    assert.deepEqual(normalizeQuestions(null), []);
    assert.deepEqual(normalizeQuestions("text"), []);
    assert.deepEqual(normalizeQuestions({ questions: "not an array" }), []);
  });
});
