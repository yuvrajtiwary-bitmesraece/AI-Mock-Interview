/**
 * Delivery metrics for an answer: word count, speaking pace and filler words.
 * Computed on the server from the final text and the recording time, so the
 * numbers can't be edited in the browser. Pure module, covered by unit tests.
 *
 * Speech recognition often drops "um" and "uh", so filler counts are a lower
 * bound. Ambiguous words such as "like" and "so" aren't counted at all, since
 * telling filler from normal use needs more than word matching.
 */

const FILLER_PHRASES = ["you know", "i mean", "sort of", "kind of", "basically", "literally", "um", "uh", "uhm", "erm", "hmm"];

// Longest phrases first, so "you know" is matched before any single word.
const FILLER_PATTERN = new RegExp(
  `\\b(${[...FILLER_PHRASES].sort((a, b) => b.length - a.length).map((phrase) => phrase.replace(/ /g, "\\s+")).join("|")})\\b`,
  "gi"
);

/** Comfortable interview pace in words per minute. */
export const PACE_RANGE = { slow: 100, fast: 170 };

export function countWords(text) {
  return String(text ?? "").trim().split(/\s+/).filter(Boolean).length;
}

/** Filler phrases in `text`, most frequent first, e.g. [{ word: "basically", count: 3 }]. */
export function findFillers(text) {
  const counts = new Map();
  for (const match of String(text ?? "").matchAll(FILLER_PATTERN)) {
    const word = match[1].toLowerCase().replace(/\s+/g, " ");
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()].map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count);
}

export function paceLabel(wordsPerMinute) {
  if (!Number.isFinite(wordsPerMinute)) return null;
  if (wordsPerMinute < PACE_RANGE.slow) return "slow";
  if (wordsPerMinute > PACE_RANGE.fast) return "fast";
  return "good";
}

/**
 * Metrics for one answer. `mode` is "voice" or "text"; `durationSec` is how
 * long the person spoke (voice) or wrote (text). Pace is only reported for
 * voice answers of at least 10 seconds, where it means something.
 */
export function analyzeAnswer(text, { mode = "text", durationSec = 0 } = {}) {
  const words = countWords(text);
  const seconds = Number.isFinite(durationSec) ? Math.min(Math.max(Math.round(durationSec), 0), 1800) : 0;
  const fillers = findFillers(text);
  const wordsPerMinute = mode === "voice" && seconds >= 10 ? Math.round((words / seconds) * 60) : null;

  return {
    mode: mode === "voice" ? "voice" : "text",
    durationSec: seconds,
    wordCount: words,
    wordsPerMinute,
    pace: paceLabel(wordsPerMinute ?? NaN),
    fillerCount: fillers.reduce((sum, filler) => sum + filler.count, 0),
    fillers,
  };
}

/** Formats seconds as m:ss, e.g. 75 -> "1:15". */
export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(seconds || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
