"use client";

import { useActionState, useId, useState } from "react";

import { FIELD } from "@/components/auth/Fields";
import { Checklist, DataRow, Note, PageHero, TYPE } from "@/components/kit/Kit";
import { Button, ButtonLink } from "@/components/site/Button";
import { Icon } from "@/components/site/Icon";
import { SiteLink } from "@/components/site/SiteLink";
import { checkPayment } from "@/lib/check/actions";
import type { CheckState } from "@/lib/check/rules";
import { href } from "@/lib/site/routes";

const CRUMB = (
  <p className={`${TYPE.cap} text-muted-fg`}>
    <SiteLink href={href("security")} className="hover:underline">
      Security
    </SiteLink>{" "}
    › Check a payment
  </p>
);

/** The round status mark above a result's title (Figma Status). */
function Status({ tone }: { tone: "ok" | "warn" | "info" }) {
  const look = {
    ok: "bg-[#dff3ec]",
    warn: "bg-[#fdf0d5] text-[#8a5a00]",
    info: "bg-info-bg",
  }[tone];
  return (
    <span
      aria-hidden="true"
      className={`flex size-14 items-center justify-center rounded-full text-2xl font-medium lg:size-[60px] ${look}`}
    >
      {tone === "ok" ? <Icon name="check" className="size-[25px]" /> : null}
      {tone === "warn" ? "!" : null}
      {tone === "info" ? <Icon name="clock" className="size-[26px]" /> : null}
    </span>
  );
}

/**
 * Check a payment (W4.2; Figma Check a payment, Real, Not found). Built ahead
 * of the app: until it can send payments, a check answers "Checks start
 * soon" (see CHECKS_LIVE in lib/check/rules).
 */
export function CheckFlow({ initial, live }: { initial: CheckState; live: boolean }) {
  const [state, action, pending] = useActionState(checkPayment, initial);
  // "Check again" goes back to the form with what was typed; a new answer
  // from the server shows again.
  const [dismissed, setDismissed] = useState<CheckState | null>(null);
  const [reference, setReference] = useState(state.step === "form" ? "" : state.reference);
  const [amount, setAmount] = useState(state.step === "form" ? "" : state.amount);
  const id = useId();

  if (state.step !== "form" && state !== dismissed) {
    const again = () => {
      setReference(state.reference);
      setAmount(state.amount);
      setDismissed(state);
    };
    if (state.step === "real") {
      return (
        <PageHero
          tone="paper"
          crumb={<Status tone="ok" />}
          title="This payment is real."
          sub="It matches a completed Cyber X payment."
          card={
            <div className="flex flex-col gap-4">
              <div>
                <DataRow label="Amount" value={state.amount} />
                <DataRow line label="From" value={state.from} />
                <DataRow line label="To" value={state.to} />
                <DataRow line label="Paid" value={state.paidAt} />
                <DataRow line label="Status" value="Completed" tone="ok" />
                <DataRow line label="Reference" value={state.reference} mono />
              </div>
              <Note tone="green">
                The money is in {state.to.split(" ")[0]}’s Cyber X account. We only show first names
                and initials, to protect both people.
              </Note>
              <ButtonLink href={href("check")} variant="soft">
                Check another payment
              </ButtonLink>
            </div>
          }
        />
      );
    }
    const notFound = state.step === "not_found";
    // Non-breaking hyphens keep a reference on one line.
    const ref = state.reference.replaceAll("-", "\u2011");
    return (
      <PageHero
        tone="paper"
        crumb={<Status tone={notFound ? "warn" : "info"} />}
        title={notFound ? "We can’t find this payment." : "Checks start soon."}
        sub={
          notFound
            ? `No Cyber X payment matches ${ref} for ${state.amount}.`
            : `Cyber X payments aren’t live yet, so there’s nothing to check ${ref} for ${state.amount} against.`
        }
        card={
          <div className="flex flex-col gap-4">
            {notFound ? (
              <Note tone="amber">
                Check the reference and amount. If they’re right, this receipt may be fake. Don’t
                hand anything over until you see the money.
              </Note>
            ) : (
              <Note tone="blue">
                Until then, a receipt or an alert proves nothing. Don’t hand anything over until the
                money is in your own account.
              </Note>
            )}
            <Button variant="primary" onClick={again}>
              Check again
            </Button>
            <ButtonLink href={href("report")} variant="soft">
              Report a fake receipt
            </ButtonLink>
          </div>
        }
      />
    );
  }

  const errors = state.step === "form" && state !== dismissed ? (state.errors ?? {}) : {};
  return (
    <PageHero
      tone="paper"
      crumb={CRUMB}
      title="Check a payment."
      sub="Got a receipt or a payment alert? Check it’s real before you hand anything over."
      after={
        <Checklist
          dark={false}
          items={["A text or a screenshot can be faked.", "A check here can’t."]}
        />
      }
      card={
        <form
          action={action}
          noValidate
          className="flex flex-col gap-4"
          aria-label="Check a payment"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-reference`} className="text-[13px] leading-[1.2] font-medium">
              Reference
            </label>
            <input
              id={`${id}-reference`}
              name="reference"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="DX-7741-0912"
              maxLength={40}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              aria-invalid={errors.reference ? true : undefined}
              aria-describedby={errors.reference ? `${id}-reference-error` : undefined}
              className={`${FIELD} font-mono`}
            />
            {errors.reference ? (
              <p id={`${id}-reference-error`} className="text-error-text text-[13px] leading-[1.4]">
                {errors.reference}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-amount`} className="text-[13px] leading-[1.2] font-medium">
              Amount
            </label>
            <input
              id={`${id}-amount`}
              name="amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="₦25,000.00"
              maxLength={32}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={errors.amount ? true : undefined}
              aria-describedby={errors.amount ? `${id}-amount-error` : undefined}
              className={FIELD}
            />
            {errors.amount ? (
              <p id={`${id}-amount-error`} className="text-error-text text-[13px] leading-[1.4]">
                {errors.amount}
              </p>
            ) : null}
          </div>
          <p className={`${TYPE.cap} text-muted-fg`}>
            Both are on the receipt. We never ask for a PIN or password here.
          </p>
          {live ? null : <Note tone="blue">Checks start when Cyber X payments go live.</Note>}
          <Button type="submit" variant="primary" disabled={pending} aria-busy={pending}>
            Check payment
          </Button>
        </form>
      }
    />
  );
}
