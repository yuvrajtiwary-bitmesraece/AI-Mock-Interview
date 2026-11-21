/**
 * Uploaded answer recordings. Audio is sent to Gemini once to transcribe it
 * and is never stored. The format is detected from the file's first bytes,
 * because the type the browser reports can't be trusted.
 */

// A 5-minute answer at 32 kbps is about 1.2 MB; this leaves room for higher bitrates
// while staying under Vercel's 4.5 MB request limit.
export const AUDIO_MAX_BYTES = 4 * 1024 * 1024;

/** The longest recording the interview room allows, in seconds. */
export const MAX_RECORDING_SECONDS = 300;

const ascii = (bytes, start, end) => String.fromCharCode(...bytes.slice(start, end));

const SIGNATURES = [
  // WebM (Chrome, Edge, Firefox): EBML header.
  { mimeType: "audio/webm", matches: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
  // MP4 / M4A (Safari, Chrome): "ftyp" box at byte 4.
  { mimeType: "audio/mp4", matches: (b) => ascii(b, 4, 8) === "ftyp" },
  { mimeType: "audio/ogg", matches: (b) => ascii(b, 0, 4) === "OggS" },
  { mimeType: "audio/wav", matches: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WAVE" },
];

/** The audio MIME type for these bytes, or null when the format isn't recognized. */
export function detectAudioType(bytes) {
  if (!bytes || bytes.length < 12) return null;
  return SIGNATURES.find((signature) => signature.matches(bytes))?.mimeType ?? null;
}

/**
 * Validates an uploaded recording (a File or Blob). Returns
 * `{ ok: true, file: { mimeType, data } }` with base64 data for Gemini, or
 * `{ ok: false, error }`.
 */
export async function readAudio(upload) {
  if (!upload || typeof upload === "string" || upload.size === 0) {
    return { ok: false, error: "No recording was received. Please record your answer again." };
  }
  if (upload.size > AUDIO_MAX_BYTES) {
    return { ok: false, error: "That recording is too long. Keep answers under five minutes." };
  }

  const bytes = new Uint8Array(await upload.arrayBuffer());
  const mimeType = detectAudioType(bytes);
  if (!mimeType) {
    return { ok: false, error: "Your browser recorded audio in a format we can't read. Please type your answer instead." };
  }

  return { ok: true, file: { mimeType, data: Buffer.from(bytes).toString("base64") } };
}
