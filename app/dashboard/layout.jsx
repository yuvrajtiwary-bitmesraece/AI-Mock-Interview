import Header from "./_components/Header";

// AI requests (server actions) run inside these pages. Allow up to 60 seconds,
// the maximum on Vercel's free plan without Fluid compute.
export const maxDuration = 60;

export const metadata = {
  title: "Dashboard",
  // Signed-in pages shouldn't appear in search results.
  robots: { index: false, follow: false },
};

/** Every signed-in page: the floating header and a padded content column. */
export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-dvh">
      <Header />
      <main id="main" className="container pb-24 pt-28 sm:pt-32 print:pt-0">
        {children}
      </main>
    </div>
  );
}
