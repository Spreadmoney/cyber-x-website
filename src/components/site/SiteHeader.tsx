"use client";

import { SiteLink as Link } from "@/components/site/SiteLink";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { signOut } from "@/lib/auth/actions";
import { NAV, href } from "@/lib/site/routes";

import { ButtonLink, buttonClass } from "./Button";
import { LogoLink } from "./Logo";

/**
 * The menu bar (Figma RS/Nav · mobile and · desktop). It stays fixed at the
 * top while the page scrolls. Above it, a white strip as tall as the phone's
 * status bar (the "safe area") keeps it clear of the notch or Dynamic Island
 * when the browser draws the page edge to edge.
 */
/** Who is signed in to the website, for the menu bar (W2.4). */
export interface HeaderMe {
  initials: string;
  firstName: string;
}

/**
 * A menu link's colours. Hover: blue words on a light-blue pill (4.6:1).
 * The page you're on: deep-blue words on a stronger pill (7.2:1), so it
 * stays marked without an underline.
 */
export function navPill(current: boolean): string {
  return current ? "bg-accent/15 text-deep" : "text-fg hover:bg-accent/10 hover:text-accent";
}

export function SiteHeader({ me = null }: { me?: HeaderMe | null }) {
  const pathname = usePathname();
  const [openOn, setOpenOn] = useState<string | null>(null);
  // The menu closes by itself when the page changes.
  const open = openOn === pathname;
  const close = () => setOpenOn(null);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50"
      onKeyDown={(event) => {
        if (event.key === "Escape") close();
      }}
    >
      <div aria-hidden="true" className="h-[env(safe-area-inset-top)] bg-white" />
      <div className="px-4 py-3 lg:px-6 lg:py-5">
        <nav
          aria-label="Main"
          className="shadow-pill mx-auto flex max-w-[1136px] items-center justify-between rounded-full bg-white py-2 pr-2 pl-[18px] lg:pl-6"
        >
          <LogoLink />
          {/* Menu links: a light-blue pill on hover, a stronger one on the
              page you're on. No underline (Ayora, 19 Nov 2026). */}
          <ul className="hidden items-center gap-1 text-[15px] leading-[1.2] lg:flex">
            {NAV.map((link) => {
              const current = pathname === href(link.page);
              return (
                <li key={link.page}>
                  <Link
                    href={href(link.page)}
                    aria-current={current ? "page" : undefined}
                    className={`${navPill(current)} focus-visible:outline-accent flex h-9 items-center rounded-full px-3.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center gap-2 lg:gap-2.5">
            {me ? (
              <div className="hidden items-center gap-2 text-[15px] leading-[1.2] lg:flex">
                {/* Sign in and Sign out are buttons, not links (Ayora, 17 Nov 2026). */}
                <Link
                  href="/account"
                  className="text-fg hover:bg-paper focus-visible:outline-accent flex h-10 items-center gap-2.5 rounded-full pr-4 pl-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span
                    aria-hidden="true"
                    className="bg-avatar text-deep flex size-8 items-center justify-center rounded-full text-[13px] font-medium"
                  >
                    {me.initials}
                  </span>
                  <span>
                    <span className="sr-only">Your account: </span>
                    {me.firstName}
                  </span>
                </Link>
                <form action={signOut}>
                  <button type="submit" className={`${buttonClass("quiet", "S")} h-9 px-4`}>
                    Sign out
                  </button>
                </form>
              </div>
            ) : (
              // On phones, Sign in is in the menu (the button's own inline-flex
              // would override "hidden", so a wrapper hides it).
              <span className="hidden lg:contents">
                <ButtonLink href={href("signIn")} variant="soft" size="S" className="h-9 px-4">
                  Sign in
                </ButtonLink>
              </span>
            )}
            <button
              type="button"
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpenOn(open ? null : pathname)}
              className="focus-visible:outline-accent flex size-10 flex-col items-center justify-center gap-[5px] rounded-full focus-visible:outline-2 lg:hidden"
            >
              <span
                className={`bg-fg block h-0.5 w-[18px] rounded-[1px] transition-transform ${open ? "translate-y-[3.5px] rotate-45" : ""}`}
              />
              <span
                className={`bg-fg block h-0.5 w-[18px] rounded-[1px] transition-transform ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`}
              />
            </button>
            {me ? (
              <Link
                href="/account"
                className="bg-avatar text-deep focus-visible:outline-accent flex size-10 items-center justify-center rounded-full text-[13px] font-medium focus-visible:outline-2 lg:hidden"
              >
                <span aria-hidden="true">{me.initials}</span>
                <span className="sr-only">Your account</span>
              </Link>
            ) : (
              <ButtonLink href={href("getTheApp")} size="S" className="h-9 px-4">
                Get the app
              </ButtonLink>
            )}
          </div>
        </nav>
        <div
          id="site-menu"
          hidden={!open}
          data-open={open}
          className="menu-sheet shadow-pill mx-auto mt-2 max-w-[1136px] rounded-[24px] bg-white p-2 lg:hidden"
        >
          <ul className="flex flex-col">
            {[
              ...NAV.map((link) => ({ label: link.label, to: href(link.page) })),
              ...(me ? [{ label: "Your account", to: "/account" }] : []),
            ].map((link) => (
              <li key={link.to}>
                <Link
                  href={link.to}
                  onClick={close}
                  className="text-fg hover:bg-paper focus-visible:outline-accent flex min-h-12 items-center rounded-2xl px-4 text-[17px] leading-[1.2] focus-visible:outline-2"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="border-line mt-1 border-t px-2 pt-3 pb-1">
              {me ? (
                <form action={signOut}>
                  <button type="submit" className={`${buttonClass("quiet")} w-full`}>
                    Sign out
                  </button>
                </form>
              ) : (
                <ButtonLink href={href("signIn")} variant="soft" className="w-full" onClick={close}>
                  Sign in
                </ButtonLink>
              )}
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
