import { BELOW_MENU, SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

/** Every ordinary page: the fixed menu bar, the page, the full footer. */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main id="main" className={`flex-1 ${BELOW_MENU}`}>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
