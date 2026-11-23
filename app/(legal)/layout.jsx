import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

export default function LegalLayout({ children }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="container max-w-3xl pb-24 pt-16 sm:pt-24">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
