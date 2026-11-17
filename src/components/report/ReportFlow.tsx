"use client";

import { useActionState, useState } from "react";

import {
  FixSummary,
  ImagePicker,
  NotSentYet,
  OptionCards,
  TextArea,
  TextField,
} from "@/components/forms/FormParts";
import { DataRow, Note, PageHero, TYPE } from "@/components/kit/Kit";
import { ArrowLink, Button, ButtonLink } from "@/components/site/Button";
import { Icon } from "@/components/site/Icon";
import { SiteLink } from "@/components/site/SiteLink";
import { sendReport } from "@/lib/report/actions";
import { SCAM_KINDS, type ReportState } from "@/lib/report/rules";
import { href } from "@/lib/site/routes";

/** "Shared your PIN or a code?": freeze first (Figma, beside the form). */
function FreezeFirst() {
  return (
    <div className="flex w-full flex-col gap-2.5 rounded-[24px] border border-[#e3e7ef] bg-white p-5 shadow-[0_8px_12px_rgba(10,23,77,0.06)] lg:p-6">
      <h2 className={TYPE.h4}>Shared your PIN or a code?</h2>
      <p className={`${TYPE.small} text-muted-fg`}>
        Freeze your account now. It stops money leaving your account.
      </p>
      <ButtonLink href={href("freeze")} variant="danger">
        Freeze my account
      </ButtonLink>
      <p className={`${TYPE.cap} text-muted-fg`}>
        Cyber X will never ask for your PIN, password or codes.
      </p>
    </div>
  );
}

function Done({ tone }: { tone: "ok" | "info" }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-14 items-center justify-center rounded-full lg:size-[60px] ${tone === "ok" ? "bg-[#dff3ec]" : "bg-info-bg"}`}
    >
      <Icon name={tone === "ok" ? "check" : "clock"} className="size-[25px]" />
    </span>
  );
}

const BACK = <ArrowLink href={href("security")}>Back to Security</ArrowLink>;

/**
 * Report a scam (W7.1; Figma Report a scam, Needs fixing, Sent). Built ahead
 * of the app: until the control room exists, the form says nothing is sent
 * yet, and a report that reads well answers "Reports open soon".
 */
export function ReportFlow({ initial }: { initial: ReportState }) {
  const [state, action, pending] = useActionState(sendReport, initial);
  const values = state.step === "form" ? (state.values ?? {}) : {};
  const errors = state.step === "form" ? (state.errors ?? {}) : {};
  const [kind, setKind] = useState<string>(values.kind ?? "");

  if (state.step === "sent") {
    return (
      <PageHero
        tone="paper"
        crumb={<Done tone="ok" />}
        title="Report sent."
        sub="Thank you. If you gave us a way to reply, we’ll contact you only if we need more."
        card={
          <div className="flex flex-col gap-4">
            <DataRow label="Your reference" value={state.reference} mono />
            <Note tone="grey">
              Still worried? Freeze your account. It stops money leaving it straight away.
            </Note>
            {BACK}
          </div>
        }
      />
    );
  }
  if (state.step === "not_live") {
    return (
      <PageHero
        tone="paper"
        crumb={<Done tone="info" />}
        title="Reports open soon."
        sub="Nothing was sent. Cyber X hasn’t launched yet, so no one is reading reports."
        card={
          <div className="flex flex-col gap-4">
            <Note tone="blue">
              If you’ve lost money, call your bank straight away and report it to the police.
            </Note>
            <ButtonLink href={href("report")} variant="soft">
              Back to the report
            </ButtonLink>
            {BACK}
          </div>
        }
      />
    );
  }

  return (
    <PageHero
      tone="paper"
      crumb={
        <p className={`${TYPE.cap} text-muted-fg`}>
          <SiteLink href={href("security")} className="hover:underline">
            Security
          </SiteLink>{" "}
          › Report a scam
        </p>
      }
      title="Report a scam."
      sub="If money left your account, report the payment in the app first so we can act on it. Then tell us here."
      after={<FreezeFirst />}
      card={
        <form action={action} noValidate className="flex flex-col gap-4" aria-label="Report a scam">
          <NotSentYet>
            Reports open when Cyber X launches. Until then, nothing sent here reaches our team.
          </NotSentYet>
          <FixSummary text={state.summary} />
          <OptionCards
            legend="What happened?"
            name="kind"
            options={SCAM_KINDS}
            value={kind}
            onChange={setKind}
            error={errors.kind}
          />
          <TextField
            label="Alias, Cyber X ID or reference (optional)"
            name="who"
            defaultValue={values.who}
            placeholder="@kemi.fabrics or DX-7741-0912"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={60}
            error={errors.who}
          />
          <TextField
            label="When did it happen?"
            name="when"
            type="date"
            defaultValue={values.when}
            min="2020-01-01"
            error={errors.when}
          />
          <TextArea
            label="Tell us what happened"
            name="message"
            defaultValue={values.message}
            placeholder="Who contacted you, what they said and what they asked for."
            maxLength={2000}
            error={errors.message}
          />
          <ImagePicker label="Screenshot (optional)" />
          <TextField
            label="How can we reply? (optional)"
            name="reply"
            defaultValue={values.reply}
            placeholder="Phone number or email"
            autoComplete="email"
            maxLength={120}
            error={errors.reply}
          />
          <Button type="submit" variant="primary" disabled={pending} aria-busy={pending}>
            Send report
          </Button>
          <p className={`${TYPE.cap} text-muted-fg text-center`}>We read every report.</p>
        </form>
      }
    />
  );
}
