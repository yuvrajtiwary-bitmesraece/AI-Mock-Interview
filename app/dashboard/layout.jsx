import Header from "./_components/Header";

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
