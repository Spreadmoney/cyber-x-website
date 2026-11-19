import { SiteLink as Link } from "@/components/site/SiteLink";

import { FOOTER, href } from "@/lib/site/routes";

import { WRAP } from "./Panel";

/** Footer links: grey words turn Cyber X blue on hover, no underline (Ayora, 19 Nov 2026). */
export const FOOTER_LINK =
  "rounded-sm transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function LegalRow() {
  return (
    <div className="text-muted-fg flex flex-col gap-0 text-[13px] leading-[1.4] lg:flex-row lg:items-start lg:justify-between">
      <div className="flex flex-col gap-1">
        <p>© 2026 Cyber X Technologies.</p>
        <p>Cyber X will never ask for your PIN, password or codes.</p>
      </div>
      <p>Nigeria</p>
    </div>
  );
}

/** The full footer (Figma RS/Footer · mobile and · desktop). */
export function SiteFooter() {
  return (
    <footer className={`${WRAP} flex flex-col gap-5 py-10 lg:gap-9 lg:py-16`}>
      {/* Phones: one row per group, opened with + */}
      <div className="flex flex-col lg:hidden">
        {FOOTER.map((column) => (
          <details key={column.title} className="group border-line border-b">
            <summary className="text-fg focus-visible:outline-accent flex cursor-pointer items-center justify-between py-4 text-[15px] leading-[1.5] focus-visible:outline-2">
              <span>{column.title}</span>
              <span aria-hidden="true" className="text-muted-fg group-open:hidden">
                +
              </span>
              <span aria-hidden="true" className="text-muted-fg hidden group-open:inline">
                −
              </span>
            </summary>
            <ul className="text-muted-fg flex flex-col gap-3 pb-4 text-[15px] leading-[1.4]">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={href(link.page)} className={FOOTER_LINK}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      {/* Desktop: five columns */}
      <div className="hidden gap-10 text-[13px] lg:flex">
        {FOOTER.map((column) => (
          <div key={column.title} className="flex min-w-0 flex-1 flex-col gap-2.5">
            <h2 className="text-fg leading-[1.2] font-medium">{column.title}</h2>
            <ul className="text-muted-fg flex flex-col gap-2.5 leading-[1.4]">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={href(link.page)} className={FOOTER_LINK}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="bg-line h-px" />
      <LegalRow />
    </footer>
  );
}

/** The slim footer for error and maintenance pages (Figma RS/Footer slim). */
export function SlimFooter() {
  return (
    <footer
      className={`${WRAP} text-muted-fg flex flex-col py-6 text-[13px] leading-[1.4] lg:flex-row lg:justify-between`}
    >
      <p>© 2026 Cyber X Technologies.</p>
      <p>
        <Link href={href("privacy")} className={FOOTER_LINK}>
          Privacy
        </Link>
        {" · "}
        <Link href={href("terms")} className={FOOTER_LINK}>
          Terms
        </Link>
        {" · "}
        <Link href={href("help")} className={FOOTER_LINK}>
          Help
        </Link>
      </p>
    </footer>
  );
}

/** Space for the fixed menu bar and the phone's safe area above it. */
export const BELOW_MENU = "pt-[calc(74px+env(safe-area-inset-top))] lg:pt-[90px]";
