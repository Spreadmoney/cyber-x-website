"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";

import { FIELD } from "@/components/auth/Fields";
import { Note } from "@/components/kit/Kit";

/**
 * Parts for the website's forms (W7; Figma Report a scam, Contact us,
 * Complaints, Careers). Text is 16px on phones so iPhone doesn't zoom in;
 * each field says what to fix under it, tied to it for screen readers.
 */
const LABEL = "text-[13px] leading-[1.2] font-medium";
const ERROR = "text-error-text text-[13px] leading-[1.4]";
const WRONG = "border-error-text";

function Wrapper({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className={ERROR}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

const described = (id: string, error?: string) =>
  error ? { "aria-invalid": true as const, "aria-describedby": `${id}-error` } : {};

export function TextField({
  label,
  error,
  className = "",
  ...input
}: { label: string; error?: string } & ComponentProps<"input">) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} error={error}>
      <input
        id={id}
        className={`${FIELD} ${error ? WRONG : ""} ${className}`}
        {...described(id, error)}
        {...input}
      />
    </Wrapper>
  );
}

export function TextArea({
  label,
  error,
  ...area
}: { label: string; error?: string } & ComponentProps<"textarea">) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} error={error}>
      <textarea
        id={id}
        rows={4}
        className={`${FIELD} h-auto min-h-28 resize-y py-3.5 leading-[1.5] ${error ? WRONG : ""}`}
        {...described(id, error)}
        {...area}
      />
    </Wrapper>
  );
}

/** A choice of one, drawn as white option cards (Figma "What happened?"). */
export function OptionCards({
  legend,
  name,
  options,
  value,
  onChange,
  error,
}: {
  legend: string;
  name: string;
  options: readonly (readonly [value: string, label: string])[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const id = useId();
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className={`${LABEL} mb-2`}>{legend}</legend>
      {options.map(([option, label]) => (
        <label
          key={option}
          className={`has-checked:border-accent has-checked:bg-info-bg/40 has-focus-visible:outline-accent flex min-h-12 cursor-pointer items-center gap-3 rounded-[14px] border bg-white px-4 py-3 text-base leading-[1.4] has-focus-visible:outline-2 has-focus-visible:outline-solid lg:text-[15px] ${error ? WRONG : "border-[#d5dce8]"}`}
        >
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
            className="checked:border-accent size-5 shrink-0 appearance-none rounded-full border border-[#c9d0dc] bg-white outline-none checked:border-[6px]"
          />
          {label}
        </label>
      ))}
      {error ? (
        <p id={`${id}-error`} className={ERROR}>
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

/** Up to 10 MB of PNG or JPG. Nothing is uploaded until the form is live. */
export function ImagePicker({ label }: { label: string }) {
  const id = useId();
  const [picked, setPicked] = useState<{ name?: string; error?: string }>({});
  return (
    <div className="flex flex-col gap-1.5">
      <span className={LABEL} id={`${id}-label`}>
        {label}
      </span>
      <label
        htmlFor={id}
        className="has-focus-visible:outline-accent text-muted-fg flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-[#9aa3b2] bg-white px-4 py-3 text-center text-[13px] leading-[1.4] has-focus-visible:outline-2 has-focus-visible:outline-solid"
      >
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="8.5" stroke="#0b0d12" strokeWidth="1.5" />
          <path d="M11 7.5v7M7.5 11h7" stroke="#0b0d12" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span>{picked.name ?? "Add an image, PNG or JPG, up to 10 MB"}</span>
        <input
          id={id}
          type="file"
          accept="image/png,image/jpeg"
          aria-labelledby={`${id}-label`}
          aria-describedby={picked.error ? `${id}-error` : undefined}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return setPicked({});
            if (!["image/png", "image/jpeg"].includes(file.type)) {
              event.target.value = "";
              return setPicked({ error: "Choose a PNG or JPG image." });
            }
            if (file.size > 10 * 1024 * 1024) {
              event.target.value = "";
              return setPicked({ error: "Choose an image up to 10 MB." });
            }
            setPicked({ name: file.name });
          }}
        />
      </label>
      {picked.error ? (
        <p id={`${id}-error`} className={ERROR}>
          {picked.error}
        </p>
      ) : null}
    </div>
  );
}

/** The list of what to fix, at the top of a form (Figma Needs fixing). */
export function FixSummary({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <div role="alert">
      <Note tone="red">{text}</Note>
    </div>
  );
}

/** Said before anyone types: until the control room exists, nothing is sent. */
export function NotSentYet({ children }: { children: ReactNode }) {
  return <Note tone="blue">{children}</Note>;
}
