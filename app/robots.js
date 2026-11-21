import { getSiteUrl } from "@/utils/site";

export default function robots() {
  const siteUrl = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Signed-in pages are private and useless to search engines.
        disallow: ["/dashboard"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
