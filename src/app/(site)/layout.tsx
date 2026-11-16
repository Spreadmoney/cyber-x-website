import { BELOW_MENU, SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getMe } from "@/lib/auth/session";

/** Every ordinary page: the fixed menu bar, the page, the full footer. */
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const me = await getMe();
  return (
    <>
      <SiteHeader me={me ? { initials: me.initials, firstName: me.firstName } : null} />
      <main id="main" className={`flex-1 ${BELOW_MENU}`}>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
