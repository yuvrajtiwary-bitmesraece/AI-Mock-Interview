import { SITE } from "@/utils/site";

/** Web app manifest: lets people install the app from Chrome, Edge or Android. */
export default function manifest() {
  return {
    name: SITE.name,
    short_name: "Mock Interview",
    description: SITE.description,
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: SITE.themeColor,
    theme_color: SITE.themeColor,
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
