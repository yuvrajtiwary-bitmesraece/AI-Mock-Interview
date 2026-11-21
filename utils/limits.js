/**
 * Daily fair-use limits per user, counted per UTC day.
 *
 * Every user shares the app's single Gemini API key, so these limits stop one
 * account from using up its quota. Self-hosters can change them with
 * environment variables; set one to 0 to turn that limit off.
 *
 * Pure module: safe to import anywhere and covered by unit tests.
 */

export const DEFAULT_DAILY_LIMITS = {
  interview: 10, // new interviews generated
  answer: 100, // answers reviewed by AI
  report: 30, // interview reports generated
  transcription: 300, // recorded answers transcribed
};

const ENV_VARS = {
  interview: "AI_DAILY_LIMIT_INTERVIEWS",
  answer: "AI_DAILY_LIMIT_ANSWERS",
  report: "AI_DAILY_LIMIT_REPORTS",
  transcription: "AI_DAILY_LIMIT_TRANSCRIPTIONS",
};

/** The daily limit for `action`, or Infinity when the limit is turned off. */
export function getDailyLimit(action, env = process.env) {
  if (!(action in DEFAULT_DAILY_LIMITS)) {
    throw new Error(`Unknown usage action: ${action}`);
  }

  const raw = env[ENV_VARS[action]];
  if (raw === undefined || raw.trim() === "") return DEFAULT_DAILY_LIMITS[action];

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) return DEFAULT_DAILY_LIMITS[action];
  return value === 0 ? Infinity : value;
}

/** The current UTC day as "YYYY-MM-DD". */
export function utcDay(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

const LIMIT_NOUNS = {
  interview: "new interviews",
  answer: "AI answer reviews",
  report: "interview reports",
  transcription: "voice transcriptions",
};

/** The message shown when a user hits a daily limit. */
export function limitReachedMessage(action, limit) {
  return `You've reached today's limit of ${limit} ${LIMIT_NOUNS[action]}. It resets at midnight UTC.`;
}
