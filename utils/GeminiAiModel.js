import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = "gemini-2.5-flash";

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
};

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

let model;

function getModel() {
  if (!model) {
    model = new GoogleGenerativeAI(resolveApiKey()).getGenerativeModel({ model: MODEL_NAME });
  }
  return model;
}

/**
 * Sends one prompt to Gemini and returns its reply as a parsed JSON value.
 *
 * Gemini's JSON mode (`responseMimeType: "application/json"` + `responseSchema`)
 * makes the model return JSON that matches `responseSchema`, so we no longer
 * have to strip markdown fences or hunt for `{...}` with regular expressions.
 *
 * Every call is independent: no chat history is shared between requests or users.
 */
export async function generateJson(prompt, responseSchema) {
  const result = await getModel().generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      ...generationConfig,
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  return JSON.parse(result.response.text());
}
