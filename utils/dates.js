/**
 * Date helpers. Before 1.1 the app stored creation dates as DD-MM-YYYY text
 * (createdAt); newer rows also have a real timestamp (createdOn).
 * Pure functions, covered by unit tests.
 */

const pad = (value) => String(value).padStart(2, "0");

/** Formats `date` as DD-MM-YYYY in UTC, the format of the createdAt column. */
export function toLegacyDateString(date) {
  return `${pad(date.getUTCDate())}-${pad(date.getUTCMonth() + 1)}-${date.getUTCFullYear()}`;
}

/** Parses DD-MM-YYYY text into a Date at midnight UTC, or null if it isn't a valid date. */
export function parseLegacyDate(text) {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(String(text ?? "").trim());
  if (!match) return null;

  const [, day, month, year] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  // Reject impossible dates such as 31-02-2026, which Date would roll over.
  return date.getUTCDate() === day && date.getUTCMonth() === month - 1 ? date : null;
}

/** When a row was created: its createdOn timestamp, else its createdAt text, else null. */
export function getCreatedDate(row) {
  if (row?.createdOn) {
    const date = new Date(row.createdOn);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return parseLegacyDate(row?.createdAt);
}

const DISPLAY_FORMAT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** A short display date such as "21 Nov 2026", or "Unknown date". */
export function formatDisplayDate(date) {
  return date ? DISPLAY_FORMAT.format(date) : "Unknown date";
}
