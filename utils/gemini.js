import "server-only";

import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";

import { parseModelList } from "./models.js";

/**
 * Models are tried in this order. If one is overloaded (503), rate-limited
 * (429), retired (404), rejects the request (400), times out or returns broken
 * JSON, the next one is used.
 * Override with GEMINI_MODELS, e.g. GEMINI_MODELS=gemini-2.5-flash,gemini-3.5-flash-lite
 */
export const DEFAULT_MODELS = ["gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-3.1-flash-lite"];

/**
 * Models for transcribing recorded answers, tried in order. The first is
 * Google's dedicated speech-to-text model; the others are general fallbacks.
 * Override with GEMINI_TRANSCRIBE_MODELS.
 */
export const DEFAULT_TRANSCRIBE_MODELS = ["gemini-3.5-transcribe", "gemini-3.5-flash-lite", "gemini-2.5-flash"];

// Stop trying further models after this long, so a request always finishes
// before the 60-second function limit (see maxDuration in app/dashboard/layout.jsx).
const TOTAL_BUDGET_MS = 50_000;

// 400 is included because feature support differs between models (one model
// may reject a setting another accepts); 404 means the model was retired.
const RETRYABLE_STATUS = new Set([400, 404, 408, 429, 500, 502, 503, 504]);

function resolveApiKey() {
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }

  // Deprecated: kept so existing deployments keep working after upgrading.
  if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    console.warn(
      "[gemini] NEXT_PUBLIC_GEMINI_API_KEY is deprecated and will be removed in v2. Rename it to GEMINI_API_KEY."
    );
    return process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  }

  throw new Error("GEMINI_API_KEY is not set. Add it to .env.local (see .env.example).");
}

let client;

function getClient() {
  // v1beta: the stable "v1" API rejects system instructions for some models.
  client ??= new GoogleGenAI({ apiKey: resolveApiKey(), apiVersion: "v1beta" });
  return client;
}

/**
 * Keep "thinking" short: these are structured-output tasks, and long
 * reasoning adds seconds of latency and uses output tokens.
 * Gemini 2.5 Flash takes a token budget; Gemini 3 and later take a level.
 */
function thinkingConfigFor(model) {
  // Speech models (transcription, text-to-speech) don't think at all.
  if (/transcribe|tts/.test(model)) return undefined;
  if (/^gemini-2\.5-flash/.test(model)) return { thinkingBudget: 0 };
  if (/^gemini-([3-9]|\d{2})/.test(model)) return { thinkingLevel: ThinkingLevel.LOW };
  return undefined;
}

/** True if the next model in the chain might succeed where this one failed. */
function shouldTryNextModel(error) {
  if (error instanceof ApiError) return RETRYABLE_STATUS.has(error.status);
  // Timeouts, network failures, and truncated or invalid JSON.
  return error?.name === "AbortError" || error?.name === "TimeoutError" || error instanceof SyntaxError || error?.name === "TypeError" || error?.name === "EmptyResponseError";
}

/**
 * The reply text. Reads the text parts directly: `response.text` logs a warning
 * when a model (such as the transcription model) also returns non-text parts.
 */
function textOf(response) {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((part) => typeof part.text === "string" && !part.thought)
    .map((part) => part.text)
    .join("");
}

/**
 * Sends one prompt through the model chain and returns the reply text.
 * With a `schema`, Gemini's JSON mode guarantees the reply has that shape.
 */
async function generate({ prompt, schema, system, files = [], models, temperature, maxOutputTokens, timeoutMs }) {
  const parts = [
    ...files.map((file) => ({ inlineData: { mimeType: file.mimeType, data: file.data } })),
    { text: prompt },
  ];

  const startedAt = Date.now();
  let lastError;

  for (const model of models) {
    const remainingMs = TOTAL_BUDGET_MS - (Date.now() - startedAt);
    if (remainingMs < 3_000) break;

    try {
      const response = await getClient().models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: system,
          temperature,
          maxOutputTokens,
          ...(schema ? { responseMimeType: "application/json", responseSchema: schema } : {}),
          thinkingConfig: thinkingConfigFor(model),
          abortSignal: AbortSignal.timeout(Math.min(timeoutMs, remainingMs)),
        },
      });

      const text = textOf(response);
      if (!text) {
        const reason = response.candidates?.[0]?.finishReason ?? response.promptFeedback?.blockReason ?? "unknown";
        throw Object.assign(new Error(`Gemini returned no text (reason: ${reason})`), { name: "EmptyResponseError" });
      }
      // Parse here so invalid JSON also moves on to the next model.
      return schema ? JSON.parse(text) : text;
    } catch (error) {
      lastError = error;
      const status = error instanceof ApiError ? error.status : error?.name;
      if (!shouldTryNextModel(error)) break;
      console.warn(`[gemini] ${model} failed (${status}); trying the next model.`);
    }
  }

  throw lastError ?? new Error("No Gemini model could be tried.");
}

/**
 * Sends one prompt to Gemini and returns the reply parsed as JSON.
 *
 * `schema` uses Gemini's response-schema format, so the reply always has the
 * expected shape. `files` are sent inline (e.g. { mimeType: "application/pdf", data: base64 }).
 * Every call is independent: no history is shared between requests or users.
 */
export function generateJson({ prompt, schema, system, files = [], temperature = 0.7, maxOutputTokens = 4096, timeoutMs = 25_000 }) {
  return generate({
    prompt,
    schema,
    system,
    files,
    models: parseModelList(process.env.GEMINI_MODELS, DEFAULT_MODELS),
    temperature,
    maxOutputTokens,
    timeoutMs,
  });
}

/**
 * Transcribes a recorded answer (`audio` is { mimeType, data } with base64 data)
 * and returns the transcript as plain text.
 */
export function transcribeAudio({ prompt, audio, timeoutMs = 30_000 }) {
  return generate({
    prompt,
    files: [audio],
    models: parseModelList(process.env.GEMINI_TRANSCRIBE_MODELS, DEFAULT_TRANSCRIBE_MODELS),
    temperature: 0,
    maxOutputTokens: 4096,
    timeoutMs,
  });
}

/** A message for the UI explaining why an AI request failed. */
export function aiErrorMessage(error) {
  if (error instanceof ApiError && error.status === 429) {
    return "The AI service is at its usage limit right now. Please try again in a minute.";
  }
  if (error instanceof ApiError && (error.status === 503 || error.status === 500)) {
    return "The AI service is busy right now. Please try again in a moment.";
  }
  if (error?.name === "AbortError" || error?.name === "TimeoutError") {
    return "The AI took too long to respond. Please try again.";
  }
  return "The AI request failed. Please try again.";
}
