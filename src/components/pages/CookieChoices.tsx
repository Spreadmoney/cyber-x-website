"use client";

import { useState, useSyncExternalStore } from "react";

/**
 * "Your cookie choices" (Figma Cookie policy). The website sets only
 * essential cookies; this remembers what you chose, in one essential
 * cookie, for 12 months. Nothing else is set before you choose.
 */
export const CHOICE_COOKIE = "cx_cookie_choices";

type Choice = { preferences: boolean; analytics: boolean };

export function readChoice(cookie: string): Choice | null {
  const value = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CHOICE_COOKIE}=`))
    ?.slice(CHOICE_COOKIE.length + 1);
  if (!value || !/^p[01]a[01]$/.test(value)) return null;
  return { preferences: value[1] === "1", analytics: value[3] === "1" };
}

export function writeChoice(choice: Choice): string {
  const value = `p${choice.preferences ? 1 : 0}a${choice.analytics ? 1 : 0}`;
  const secure =
    typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  return `${CHOICE_COOKIE}=${value}; Max-Age=${60 * 60 * 24 * 365}; Path=/; SameSite=Lax${secure}`;
}

function Switch({
  label,
  hint,
  checked,
  locked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  locked?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <label className={`flex items-center gap-3 py-2 ${locked ? "" : "cursor-pointer"}`}>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-[17px] leading-[1.2] font-medium lg:text-[21px] lg:leading-[1.3]">
          {label}
          {locked ? " · Always on" : ""}
        </span>
        <span className="text-muted-fg text-[15px] leading-[1.5]">{hint}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={locked}
        onChange={(event) => onChange?.(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`peer-focus-visible:outline-accent flex h-[26px] w-11 shrink-0 items-center rounded-full p-[3px] transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 ${checked ? "bg-accent justify-end" : "justify-start bg-[rgb(10_19_56/0.5)]"} ${locked ? "opacity-45" : ""}`}
      >
        <span className="size-5 rounded-full bg-white" />
      </span>
    </label>
  );
}

export function CookieChoices() {
  // The saved choice, read from the cookie once the page is in the browser.
  const cookie = useSyncExternalStore(
    () => () => {},
    () => document.cookie,
    () => "",
  );
  const [draft, setDraft] = useState<Choice | null>(null);
  const [saved, setSaved] = useState(false);
  const choice = draft ?? readChoice(cookie) ?? { preferences: true, analytics: false };
  const setChoice = (next: Choice) => setDraft(next);

  const save = (next: Choice) => {
    document.cookie = writeChoice(next);
    setDraft(next);
    setSaved(true);
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[17px] leading-[1.2] font-medium lg:text-[21px] lg:leading-[1.3]">
        Your cookie choices
      </h2>
      <Switch label="Essential" hint="Keep the site secure and you signed in." checked locked />
      <Switch
        label="Preferences"
        hint="Remember choices like these."
        checked={choice.preferences}
        onChange={(preferences) => {
          setChoice({ ...choice, preferences });
          setSaved(false);
        }}
      />
      <Switch
        label="Analytics"
        hint="Show us which pages people use. Never who you are."
        checked={choice.analytics}
        onChange={(analytics) => {
          setChoice({ ...choice, analytics });
          setSaved(false);
        }}
      />
      <button
        type="button"
        onClick={() => save(choice)}
        className="bg-accent focus-visible:outline-accent mt-1 h-[52px] rounded-full px-7 text-[17px] font-medium text-white hover:bg-[#0952e6] focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Save my choices
      </button>
      <button
        type="button"
        onClick={() => save({ preferences: false, analytics: false })}
        className="border-fg hover:bg-fg/5 focus-visible:outline-fg h-[52px] rounded-full border px-7 text-[17px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Reject all but essential
      </button>
      <p role="status" className="text-success min-h-[1.5em] text-[15px] leading-[1.5]">
        {saved ? "Saved. You can change these any time." : ""}
      </p>
    </div>
  );
}
