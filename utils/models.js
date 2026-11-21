/**
 * Parses a comma-separated list of Gemini model names, e.g. the GEMINI_MODELS
 * environment variable. Returns `fallback` when the value is empty.
 * Pure function, covered by unit tests.
 */
export function parseModelList(value, fallback) {
  const models = String(value ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  return models.length > 0 ? [...new Set(models)] : fallback;
}
