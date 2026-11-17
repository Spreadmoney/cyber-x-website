"use client";

import { useRef } from "react";

import { buttonClass } from "./Button";

/**
 * App Store and Google Play buttons. Cyber X launches as a phone app; until
 * it is in the stores, the buttons open a short note that points to the demo
 * (Ayora's choice, 16 Nov 2026).
 */
const STORES = {
  apple: {
    kicker: "Download on the",
    name: "App Store",
    link: "On iPhone? Download on the App Store",
  },
  google: { kicker: "Get it on", name: "Google Play", link: "On Android? Get it on Google Play" },
} as const;

export type Store = keyof typeof STORES;

function ComingSheet({
  dialog,
  demoUrl,
}: {
  dialog: React.RefObject<HTMLDialogElement | null>;
  demoUrl: string;
}) {
  return (
    <dialog
      ref={dialog}
      aria-labelledby="stores-title"
      onClick={(event) => {
        // A tap on the dimmed area outside the sheet closes it.
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      className="text-fg backdrop:bg-scrim m-0 mt-auto w-full max-w-none rounded-t-[28px] bg-white p-0 sm:m-auto sm:max-w-[440px] sm:rounded-[28px]"
    >
      <div className="flex flex-col gap-4 p-6 pb-[calc(24px+env(safe-area-inset-bottom))] text-left">
        <h2 id="stores-title" className="text-[21px] leading-[1.3] font-medium">
          Coming to the stores
        </h2>
        <p className="text-muted-fg text-[15px] leading-[1.5]">
          Cyber X will be on the App Store and Google Play at launch. Until then, try the demo in
          your browser. It uses test money, and no real money moves.
        </p>
        <div className="flex flex-col gap-3 pt-2">
          <a href={demoUrl} className={`${buttonClass("primary")} w-full`}>
            Try the demo
          </a>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className={`${buttonClass("soft")} w-full`}
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}

/** The white store button (Figma "Store button"). */
export function StoreButton({
  store,
  demoUrl,
  className = "",
}: {
  store: Store;
  demoUrl: string;
  className?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { kicker, name } = STORES[store];
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
        className={`text-fg flex items-center justify-center rounded-[14px] bg-white py-2.5 pr-[22px] pl-[18px] text-left hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${className}`}
      >
        <span className="flex flex-col">
          <span className="text-[13px] leading-[1.4]">{kicker}</span>
          <span className="text-[17px] leading-[1.2] font-medium">{name}</span>
        </span>
      </button>
      <ComingSheet dialog={dialog} demoUrl={demoUrl} />
    </>
  );
}

/** The other store, as a line of text: "On Android? Get it on Google Play ›". */
export function StoreLink({ store, demoUrl }: { store: Store; demoUrl: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
        className="self-start rounded-sm text-left text-[17px] leading-[1.2] font-medium text-white underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {STORES[store].link}
        <span aria-hidden="true">{"  ›"}</span>
      </button>
      <ComingSheet dialog={dialog} demoUrl={demoUrl} />
    </>
  );
}
