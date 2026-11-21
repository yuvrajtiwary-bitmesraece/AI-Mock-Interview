/**
 * Resume uploads. The PDF is sent to Gemini to tailor the questions and is
 * never stored: only `resumeUsed: true` is saved with the interview.
 */

// Vercel rejects request bodies over 4.5 MB, so stay safely below that.
export const RESUME_MAX_BYTES = 4 * 1024 * 1024;

/** True if `bytes` start with the PDF signature "%PDF-". The browser-supplied MIME type can't be trusted. */
export function looksLikePdf(bytes) {
  const signature = [0x25, 0x50, 0x44, 0x46, 0x2d];
  return bytes?.length >= signature.length && signature.every((byte, index) => bytes[index] === byte);
}

/**
 * Validates an uploaded resume (a File or Blob, or nothing).
 * Returns `{ ok: true, file: null }` when no resume was uploaded,
 * `{ ok: true, file: { mimeType, data } }` with base64 data for Gemini,
 * or `{ ok: false, error }`.
 */
export async function readResume(upload) {
  if (!upload || typeof upload === "string" || upload.size === 0) return { ok: true, file: null };

  if (upload.size > RESUME_MAX_BYTES) {
    return { ok: false, error: "Your resume must be a PDF under 4 MB." };
  }

  const bytes = new Uint8Array(await upload.arrayBuffer());
  if (!looksLikePdf(bytes)) {
    return { ok: false, error: "Upload your resume as a PDF file." };
  }

  return { ok: true, file: { mimeType: "application/pdf", data: Buffer.from(bytes).toString("base64") } };
}
