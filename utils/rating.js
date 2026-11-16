/**
 * Converts a stored rating to a number between 0 and 5, or `null` if the
 * answer was never rated.
 *
 * New answers store a whole number from 1 to 5 ("4"). Older answers may hold
 * free-form values from before Gemini's JSON mode was used, such as "4/5",
 * "8/10", "7" (assumed out of 10) or "N/A".
 */
export function parseRating(rating) {
  if (rating === null || rating === undefined) return null;

  const [value, outOf] = String(rating)
    .split("/")
    .map((part) => Number.parseFloat(part));

  if (!Number.isFinite(value)) return null;

  const scale = Number.isFinite(outOf) && outOf > 0 ? outOf : value > 5 ? 10 : 5;
  return Math.min(5, Math.max(0, (value / scale) * 5));
}

/**
 * Average of the ratings that exist. Unrated answers are skipped rather than
 * counted as zero. Returns `null` if nothing is rated.
 */
export function averageRating(ratings) {
  const rated = ratings.filter((rating) => rating !== null);
  if (rated.length === 0) return null;
  return rated.reduce((sum, rating) => sum + rating, 0) / rated.length;
}
