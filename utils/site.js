/**
 * Site-wide constants and the public URL of the current deployment.
 * Safe to import from server and client code (no secrets here).
 */

export const SITE = {
  name: "AI Mock Interview",
  tagline: "Practice interviews with instant AI feedback",
  description:
    "Practice job interviews with an AI interviewer. Get questions tailored to your role and resume, answer out loud or by typing, and get scored feedback on every answer.",
  repoUrl: "https://github.com/yuvrajtiwary-bitmesraece/AI-Mock-Interview",
  keywords: [
    "mock interview",
    "AI interview practice",
    "interview preparation",
    "behavioral interview",
    "technical interview",
    "system design interview",
    "interview feedback",
    "Gemini",
  ],
  themeColor: "#05070d",
};

/**
 * Absolute URL of this deployment, used for canonical links, Open Graph
 * images and the sitemap.
 *
 * Order: NEXT_PUBLIC_SITE_URL (set it when you use a custom domain), then the
 * Vercel production domain, then the Vercel preview URL, then localhost.
 */
export function getSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return `http://localhost:${process.env.PORT || 3000}`;
}
