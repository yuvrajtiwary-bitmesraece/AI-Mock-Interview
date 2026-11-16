import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_NAME = "gemini-2.5-flash";

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
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
    model = new GoogleGenerativeAI(resolveApiKey()).getGenerativeModel({
      model: MODEL_NAME,
      generationConfig,
    });
  }
  return model;
}

/**
 * Sends one prompt to Gemini and returns the text reply.
 *
 * Every call is independent. Previously the whole app shared a single chat
 * session, so each prompt carried the full history of earlier prompts. On the
 * server that history would have mixed different users' answers together.
 */
export async function generateText(prompt) {
  const result = await getModel().generateContent(prompt);
  return result.response.text();
}
