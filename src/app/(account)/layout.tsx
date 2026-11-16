import { BELOW_MENU, SlimFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getMe } from "@/lib/auth/session";

/**
 * Sign in, Your account and Freeze my account (W2): the menu bar, the page,
 * and the slim footer, as in Figma.
 */
export default async function AccountLayout({ children }: LayoutProps<"/">) {
  const me = await getMe();
  return (
    <>
      <SiteHeader me={me ? { initials: me.initials, firstName: me.firstName } : null} />
      <main id="main" className={`flex-1 ${BELOW_MENU}`}>
        {children}
      </main>
      <SlimFooter />
    </>
  );
}
