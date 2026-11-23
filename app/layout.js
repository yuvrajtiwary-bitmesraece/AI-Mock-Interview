import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Toaster } from "sonner";

import { SITE, getSiteUrl } from "@/utils/site";
import "./globals.css";

// Open-source fonts (SIL Open Font License). next/font downloads them at build
// time and serves them from this site, so no request ever goes to Google.
const sans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE.name} · ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: SITE.keywords,
  authors: [{ name: "Yuvraj Tiwary" }],
  creator: "Yuvraj Tiwary",
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} · ${SITE.tagline}`,
    description: SITE.description,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} · ${SITE.tagline}`,
    description: SITE.description,
  },
  appleWebApp: {
    capable: true,
    title: SITE.name,
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  themeColor: SITE.themeColor,
  colorScheme: "dark",
};

// Clerk's sign-in, sign-up and account screens, in the Ember colours of
// app/globals.css.
const clerkAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: "#ff813d",
    colorPrimaryForeground: "#141014",
    colorBackground: "#111113",
    colorInput: "#18181b",
    colorInputForeground: "#faf8f5",
    colorForeground: "#faf8f5",
    colorMutedForeground: "#a1a1aa",
    colorDanger: "#ed4556",
    borderRadius: "0.875rem",
    fontFamily: "var(--font-sans)",
  },
  elements: {
    card: "border border-white/10 shadow-2xl shadow-black/60",
    userButtonPopoverCard: "border border-white/10 shadow-2xl shadow-black/60",
  },
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider afterSignOutUrl="/" appearance={clerkAppearance}>
      <html lang="en" className={`dark ${sans.variable} ${serif.variable} ${mono.variable}`}>
        <body>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
          >
            Skip to content
          </a>
          {children}
          <Toaster theme="dark" position="top-center" richColors closeButton />
          {/* Vercel Web Analytics and Speed Insights: cookie-free, and inactive outside Vercel. */}
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
