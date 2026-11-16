import type { Metadata } from "next";

import { SystemPage } from "@/components/site/SystemPage";
import { maintenanceBackBy } from "@/lib/site/maintenance";

export const metadata: Metadata = {
  title: "Maintenance",
  robots: { index: false },
};

/**
 * Maintenance (Figma "Maintenance"). Every page shows this while the
 * maintenance switch is on (src/proxy.ts). The app keeps working.
 */
export default function MaintenancePage() {
  const backBy = maintenanceBackBy();
  return (
    <SystemPage
      status={
        <span className="text-deep shadow-pill inline-flex rounded-full bg-white px-3.5 py-1.5 text-[13px] leading-[1.2] font-medium">
          {backBy ? `Back by ${backBy}` : "Back soon"}
        </span>
      }
      title="We’re making Cyber X better."
      text="This website is down for planned work. The app isn’t affected."
      card={
        <>
          <h2 className="text-[17px] leading-[1.2] font-medium lg:text-[21px] lg:leading-[1.3]">
            Need to freeze your account?
          </h2>
          <p className="text-muted-fg text-[15px] leading-[1.5]">
            Dial the Cyber X USSD code from any phone and choose Freeze, or freeze it in the app.
          </p>
          <p className="text-muted-fg border-t border-[rgb(10_19_56/0.1)] pt-4 text-[13px] leading-[1.4]">
            We’ll never call or text to ask for your PIN, password or codes, even during
            maintenance.
          </p>
        </>
      }
    />
  );
}
