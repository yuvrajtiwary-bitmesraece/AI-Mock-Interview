import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

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

/**
 * Clerk, for the pages that need it: sign-in, sign-up and the dashboard.
 * The public pages (home, privacy, terms) don't load it at all: Clerk's
 * browser code is over 300 KB, more than the rest of the site's JavaScript,
 * and on a public page it would only decide which header buttons to show
 * (components/site/AuthNav.jsx does that from a cookie instead).
 */
export function AuthProvider({ children }) {
  return (
    <ClerkProvider afterSignOutUrl="/" appearance={clerkAppearance}>
      {children}
    </ClerkProvider>
  );
}
