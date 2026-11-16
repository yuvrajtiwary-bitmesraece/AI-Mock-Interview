/**
 * Turns the raw JSON text stored in `mock_interview.jsonMockResp` into an
 * array of `{ ques, ans }` objects.
 *
 * Gemini does not always use the same shape: sometimes it wraps the JSON in a
 * ```json fence, and sometimes it nests the array under a key such as
 * `questions`. This handles all the shapes seen so far and returns an empty
 * array instead of throwing if the text cannot be parsed.
 *
 * Pure function: safe to use on both the server and the client.
 */
export function parseInterviewQuestions(rawJson) {
  if (!rawJson) return [];

  try {
    const fenceMatch = rawJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const parsed = JSON.parse(fenceMatch?.[1]?.trim() ?? rawJson.trim());

    const questions = Array.isArray(parsed)
      ? parsed
      : parsed?.interview_questions ??
        parsed?.interviewQuestions ??
        parsed?.questions ??
        parsed?.questionsList ??
        parsed?.questions_list ??
        [];

    return Array.isArray(questions) ? questions : [];
  } catch {
    return [];
  }
}
