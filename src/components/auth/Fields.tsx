"use client";

import { useId, useState, type ComponentProps } from "react";

/**
 * A labelled field for the sign-in card. 16px text on phones: iPhone zooms
 * in on anything smaller (e2e/fields.spec.ts).
 */
export const FIELD =
  "h-12 w-full rounded-[14px] border border-[#d5dce8] bg-white px-4 text-base text-fg outline-none placeholder:text-[#737d8f] focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent lg:h-[52px] lg:text-[17px]";

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
