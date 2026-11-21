import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

export default function LegalLayout({ children }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="container max-w-3xl py-16 sm:py-20">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
