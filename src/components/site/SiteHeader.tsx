"use client";

import { SiteLink as Link } from "@/components/site/SiteLink";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { signOut } from "@/lib/auth/actions";
import { NAV, href } from "@/lib/site/routes";

import { ButtonLink } from "./Button";
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
          <ul className="hidden items-center gap-7 text-[15px] leading-[1.2] lg:flex">
            {NAV.map((link) => (
              <li key={link.page}>
                <Link
                  href={href(link.page)}
                  aria-current={pathname === href(link.page) ? "page" : undefined}
                  className="text-fg focus-visible:outline-accent rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 aria-[current=page]:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 lg:gap-5">
            {me ? (
              <div className="hidden items-center gap-3 text-[15px] leading-[1.2] lg:flex">
                <Link
                  href="/account"
                  className="text-fg focus-visible:outline-accent flex items-center gap-2.5 rounded-full hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
                >
                  <span
                    aria-hidden="true"
                    className="bg-avatar text-deep flex size-9 items-center justify-center rounded-full text-[13px] font-medium"
                  >
                    {me.initials}
                  </span>
                  <span>
                    <span className="sr-only">Your account: </span>
                    {me.firstName}
                  </span>
                </Link>
                <span aria-hidden="true" className="bg-line h-5 w-px" />
                <form action={signOut}>
                  <button
                    type="submit"
                    className="text-accent focus-visible:outline-accent rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            ) : (
              <Link
                href={href("signIn")}
                className="text-fg focus-visible:outline-accent hidden rounded-sm text-[15px] leading-[1.2] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 lg:inline"
              >
                Sign in
              </Link>
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
              <ButtonLink href={href("getTheApp")} size="S">
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
              me
                ? { label: "Your account", to: "/account" }
                : { label: "Sign in", to: href("signIn") },
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
            {me ? (
              <li>
                <form action={signOut}>
                  <button
                    type="submit"
                    className="text-accent hover:bg-paper focus-visible:outline-accent flex min-h-12 w-full items-center rounded-2xl px-4 text-[17px] leading-[1.2] focus-visible:outline-2"
                  >
                    Sign out
                  </button>
                </form>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </header>
  );
}
