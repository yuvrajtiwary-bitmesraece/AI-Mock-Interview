import Header from "./_components/Header";

// AI requests (server actions) run inside these pages. Allow up to 60 seconds,
// the maximum on Vercel's free plan without Fluid compute.
export const maxDuration = 60;

export const metadata = {
  title: "Dashboard",
  // Signed-in pages shouldn't appear in search results.
  robots: { index: false, follow: false },
};

function DashboardLayout({ children }) {
  return (
    <div className="min-h-dvh">
      <Header />
      <main id="main" className="container pb-20 pt-24 sm:pt-28">
        {children}
      </main>
    </div>
  );
}

export default DashboardLayout;
