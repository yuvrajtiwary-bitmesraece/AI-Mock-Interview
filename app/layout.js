import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";

import { SITE, getSiteUrl } from "@/utils/site";
import "./globals.css";

// Both fonts are open source (SIL Open Font License). next/font downloads them
// at build time and serves them from this site, so no request goes to Google.
const fontSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const fontMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE.name} · ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: SITE.keywords,
  authors: [{ name: "Yuvraj Tiwary" }, { name: "Aditya Srivastava" }],
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

// Clerk's sign-in, sign-up and account screens, styled to match the app.
const clerkAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: "#22d3ee",
    colorPrimaryForeground: "#05070d",
    colorBackground: "#0b1020",
    colorInput: "#111a2e",
    colorInputForeground: "#f8fafc",
    colorForeground: "#f8fafc",
    colorMutedForeground: "#a3adc2",
    colorDanger: "#f87171",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-sans)",
  },
  elements: {
    card: "border border-white/10 shadow-2xl shadow-black/40",
    userButtonPopoverCard: "border border-white/10 shadow-2xl",
  },
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider afterSignOutUrl="/" appearance={clerkAppearance}>
      <html lang="en" className="dark">
        <body className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          >
            Skip to content
          </a>
          {children}
          <Toaster theme="dark" position="top-center" richColors closeButton />
          {/* Vercel Web Analytics and Speed Insights: cookie-free, and they do nothing outside Vercel. */}
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
