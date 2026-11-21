import { getSiteUrl } from "@/utils/site";

/** Public pages only; everything under /dashboard requires sign-in. */
const PUBLIC_PATHS = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/sign-up", priority: 0.6, changeFrequency: "yearly" },
  { path: "/sign-in", priority: 0.4, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap() {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();
  return PUBLIC_PATHS.map(({ path, priority, changeFrequency }) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
