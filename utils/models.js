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

/**
 * Moves the models that failed recently to the end of the list, keeping the
 * configured order otherwise, so a request doesn't wait on the same failure
 * again. `coolingUntil` maps a model name to the time (in ms) until which it
 * goes last. Pure function, covered by unit tests.
 */
export function orderByCooldown(models, coolingUntil, now = Date.now()) {
  const isCooling = (model) => (coolingUntil.get(model) ?? 0) > now;
  return [...models.filter((model) => !isCooling(model)), ...models.filter(isCooling)];
}
