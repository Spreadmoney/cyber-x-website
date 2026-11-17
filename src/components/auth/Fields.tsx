"use client";

import { useId, useState, type ComponentProps } from "react";

/**
 * A labelled field for the sign-in card. 16px text on phones: iPhone zooms
 * in on anything smaller (e2e/fields.spec.ts).
 */
export const FIELD =
  "h-12 w-full rounded-[14px] border border-[#d5dce8] bg-white px-4 text-base text-fg outline-none placeholder:text-[#737d8f] focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-1 focus-visible:outline-accent lg:h-[52px] lg:text-[17px]";

export function Field({
  label,
  className = "",
  ...input
}: { label: string } & ComponentProps<"input">) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[13px] leading-[1.2] font-medium">
        {label}
      </label>
      <input id={id} className={FIELD} {...input} />
    </div>
  );
}

/** The password field, with Show and Hide. */
export function PasswordField({ label, ...input }: { label: string } & ComponentProps<"input">) {
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] leading-[1.2] font-medium">
        {label}
      </label>
      <div className="relative">
        <input id={id} type={shown ? "text" : "password"} className={`${FIELD} pr-20`} {...input} />
        <button
          type="button"
          onClick={() => setShown(!shown)}
          aria-pressed={shown}
          aria-label={shown ? "Hide password" : "Show password"}
          className="text-accent focus-visible:outline-accent absolute inset-y-0 right-1 my-auto h-9 rounded-full px-3 text-[13px] font-medium focus-visible:outline-2"
        >
          {shown ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}

/** One way to sign in, in the "Other ways to sign in" list. */
export interface OtherWay {
  title: string;
  detail: string;
  icon: "passkey" | "text";
  onClick: () => void;
}

/**
 * Other ways to sign in: one white panel, a row each, with a drawn icon, a
 * line saying what happens and an arrow (replaced the two outlined buttons,
 * which Ayora found low fidelity, 17 Nov 2026). Each row's name is all its
 * words, title first, so what a screen reader says matches what is seen.
 */
export function OtherWays({ ways, disabled }: { ways: OtherWay[]; disabled?: boolean }) {
  const id = useId();
  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-[#b4c2da]" aria-hidden="true" />
        <h2 id={`${id}-heading`} className="text-muted-fg text-[13px] leading-[1.2] font-medium">
          Other ways to sign in
        </h2>
        <span className="h-px flex-1 bg-[#b4c2da]" aria-hidden="true" />
      </div>
      <ul className="divide-y divide-[#e6ecf5] overflow-hidden rounded-[18px] border border-[#dfe6f1] bg-white shadow-[0_6px_18px_rgba(11,63,173,0.06)]">
        {ways.map((way) => (
          <li key={way.title}>
            <button
              type="button"
              disabled={disabled}
              onClick={way.onClick}
              className="group focus-visible:outline-accent flex min-h-[68px] w-full items-center gap-3.5 px-4 py-3 text-left transition-colors hover:bg-[#f4f7fd] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid disabled:opacity-60 motion-reduce:transition-none"
            >
              <span
                aria-hidden="true"
                className="bg-accent/10 text-accent flex size-10 shrink-0 items-center justify-center rounded-full"
              >
                <WayIcon kind={way.icon} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-fg text-base leading-[1.25] font-medium">{way.title}</span>{" "}
                <span className="text-muted-fg text-[13px] leading-[1.35]">{way.detail}</span>
              </span>
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                className="text-muted-fg group-hover:text-accent shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
              >
                <path
                  d="M7 4.5 11.5 9 7 13.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Drawn in the accent blue: a face in a scan frame (passkey), a message (text). */
function WayIcon({ kind }: { kind: OtherWay["icon"] }) {
  if (kind === "passkey") {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path
          d="M3 7V5a2 2 0 0 1 2-2h2M15 3h2a2 2 0 0 1 2 2v2M19 15v2a2 2 0 0 1-2 2h-2M7 19H5a2 2 0 0 1-2-2v-2"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M8 8.5v1M14 8.5v1M11 8.5v3.2h-.8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8.2 14.2c1.6 1.3 4 1.3 5.6 0"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4h11A1.5 1.5 0 0 1 18 5.5v8a1.5 1.5 0 0 1-1.5 1.5H9l-4 3.2V5.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8 8.5h1.2M10.4 8.5h1.2M12.8 8.5H14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M8 11.5h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
