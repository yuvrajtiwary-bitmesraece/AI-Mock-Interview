/**
 * Turns the raw JSON text stored in `mock_interview.jsonMockResp` into an
 * array of `{ ques, ans }` objects.
 *
 * New interviews store a plain JSON array. Interviews created before Gemini's
 * JSON mode was used may have the JSON wrapped in a ```json fence, or nested
 * under a key such as `questions`, so those shapes are still accepted.
 *
 * Returns an empty array instead of throwing if the text can't be parsed, and
 * drops any entry without a question.
 *
 * Pure function: safe to use on both the server and the client.
 */
export function parseInterviewQuestions(rawJson) {
  if (!rawJson) return [];

  try {
    const fenceMatch = rawJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const parsed = JSON.parse(fenceMatch?.[1]?.trim() ?? rawJson.trim());
    return normalizeQuestions(parsed);
  } catch {
    return [];
  }
}

/**
 * Accepts either an array of questions or an object wrapping one, and keeps
 * only entries that have a non-empty `ques` string.
 */
export function normalizeQuestions(value) {
  const list = Array.isArray(value)
    ? value
    : value?.interview_questions ??
      value?.interviewQuestions ??
      value?.questions ??
      value?.questionsList ??
      value?.questions_list ??
      [];

  if (!Array.isArray(list)) return [];

  return list
    .filter((item) => typeof item?.ques === "string" && item.ques.trim().length > 0)
    .map((item) => ({
      ques: item.ques.trim(),
      ans: typeof item.ans === "string" ? item.ans.trim() : "",
    }));
}
