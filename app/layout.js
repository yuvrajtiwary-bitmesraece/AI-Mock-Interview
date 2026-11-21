import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { dark } from "@clerk/themes";

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
  title: "AI Mock Interview",
  description: "Practice job interviews with AI-generated questions, spoken answers and instant AI feedback.",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      afterSignOutUrl="/"
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#3B82F6', // Tailwind blue-500
        },
        elements: {
          card: 'bg-slate-900 text-white z-[99999]',
          userButtonPopoverCard: 'bg-slate-900 text-white shadow-2xl z-[9999]',
          userButtonPopoverActions: 'bg-slate-800',
          userButtonPopoverActionButton: 'hover:bg-slate-700',
          userButtonPopoverFooter: 'bg-slate-900'
        }
      }}
    >
      <html lang="en">
        <body
          className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}
        >
          <Toaster/>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}