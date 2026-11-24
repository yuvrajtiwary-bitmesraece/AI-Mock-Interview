import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Toaster } from "sonner";

import { NavigationProgress } from "@/components/site/NavigationProgress";
import { OfflineNotice } from "@/components/site/OfflineNotice";
import { SmoothnessGuard } from "@/components/site/SmoothnessGuard";
import { SITE, getSiteUrl } from "@/utils/site";
import "./globals.css";

// Open-source fonts (SIL Open Font License). next/font downloads them at build
// time and serves them from this site, so no request ever goes to Google.
const sans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
// Only the italic is used (accent words), so only the italic is downloaded.
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-serif",
  display: "swap",
});
// Only small labels use the mono font, so it isn't preloaded: on a slow
// connection the fonts that render the headline and body text arrive first.
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap", preload: false });

/*
 * Runs before the first paint, so it is tiny and written for old browsers.
 *
 * 1. Lite mode (app/globals.css, [data-lite]): the same design without looping
 *    or entrance animation, for devices that report 2 GB of memory or less,
 *    2 cores or less, 4 GB with 4 cores, a 2G connection or Data Saver.
 *    components/site/SmoothnessGuard.jsx turns it on later for any other
 *    device that can't keep the page smooth, and remembers that for the visit.
 * 2. Translation and some browser extensions move the page's text into their
 *    own elements. React then can't find the nodes it updates and the page
 *    crashes on the next click; these two patches make that harmless instead
 *    (https://github.com/facebook/react/issues/11538).
 */
const BOOT_SCRIPT = `(function(){
var d=document.documentElement;
try{var n=navigator,c=n.connection||{},m=n.deviceMemory||8,h=n.hardwareConcurrency||8;
if(sessionStorage.getItem("lite")==="1"||c.saveData||/2g$/.test(c.effectiveType||"")||m<=2||h<=2||(m<=4&&h<=4))d.setAttribute("data-lite","")}catch(e){}
var p=window.Node&&Node.prototype;if(!p)return;
var remove=p.removeChild,insert=p.insertBefore;
p.removeChild=function(child){if(child&&child.parentNode!==this)return child;return remove.apply(this,arguments)};
p.insertBefore=function(node,ref){if(ref&&ref.parentNode!==this)return insert.call(this,node,null);return insert.apply(this,arguments)};
})();`;

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

// Clerk is only loaded where it is needed: components/auth/AuthProvider.jsx
// wraps the sign-in, sign-up and dashboard layouts.
export default function RootLayout({ children }) {
  return (
    // The boot script may add data-lite to <html> before React starts.
    <html lang="en" className={`dark ${sans.variable} ${serif.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
        >
          Skip to content
        </a>
        <NavigationProgress />
        {children}
        <Toaster theme="dark" position="top-center" richColors closeButton />
        <OfflineNotice />
        <SmoothnessGuard />
        {/* Vercel Web Analytics and Speed Insights: cookie-free, and inactive outside Vercel. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
