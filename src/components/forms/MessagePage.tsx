"use client";

import { useActionState, useState, type ReactNode } from "react";

import { FIELD } from "@/components/auth/Fields";
import { Columns, DataRow, Note, PageHero, Section, TYPE } from "@/components/kit/Kit";
import { ArrowLink, Button } from "@/components/site/Button";
import { Icon } from "@/components/site/Icon";
import { sendComplaint, sendContact, sendIntroduction } from "@/lib/messages/actions";
import { TOPICS, type Kind, type MessageState } from "@/lib/messages/rules";

import { FixSummary, NotSentYet, TextArea, TextField } from "./FormParts";

const ACTIONS = { contact: sendContact, complaint: sendComplaint, careers: sendIntroduction };

const SEND = { contact: "Send message", complaint: "Send complaint", careers: "Send" };

/** What each page says once a message is sent, or that nothing is sent yet. */
const RESULT: Record<
  Kind,
  { sent: [title: string, sub: string, note: string]; soon: string; back: [string, string] }
> = {
  contact: {
    sent: [
      "Message sent.",
      "Thanks. We’ll reply by email or text, to the details you gave us.",
      "Keep this reference if you contact us again.",
    ],
    soon: "Messages open soon.",
    back: ["Back to Help", "/help"],
  },
  complaint: {
    sent: [
      "Complaint received.",
      "Thank you. We’ll reply within 3 days.",
      "Not resolved by then? You can take it to the Central Bank of Nigeria.",
    ],
    soon: "Complaints open soon.",
    back: ["Back to Help", "/help"],
  },
  careers: {
    sent: [
      "Thanks for introducing yourself.",
      "We read every one. If there’s a fit, we’ll email you.",
      "Keep this reference if you write to us again.",
    ],
    soon: "Introductions open soon.",
    back: ["Back to About", "/about"],
  },
};

function Mark({ tone }: { tone: "ok" | "info" }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-14 items-center justify-center rounded-full lg:size-[60px] ${tone === "ok" ? "bg-[#dff3ec]" : "bg-info-bg"}`}
    >
      <Icon name={tone === "ok" ? "check" : "clock"} className="size-[25px]" />
    </span>
  );
}

/**
 * A page with a message form (W7.2): Contact us, Complaints, Careers. The
 * page's own parts come from the server; the form and its answers live here.
 * Until the control room exists, the form says nothing is sent yet.
 */
export function MessagePage({
  kind,
  initial,
  hero,
  formTitle,
  formTag,
  formSub,
  aside,
  after,
}: {
  kind: Kind;
  initial: MessageState;
  hero: ReactNode;
  formTitle: string;
  formTag?: string;
  formSub?: string;
  aside?: ReactNode;
  after?: ReactNode;
}) {
  const [state, action, pending] = useActionState(ACTIONS[kind], initial);
  const values = state.step === "form" ? (state.values ?? {}) : {};
  const errors = state.step === "form" ? (state.errors ?? {}) : {};
  const [topic, setTopic] = useState(values.topic ?? "");
  const copy = RESULT[kind];

  if (state.step !== "form") {
    const sent = state.step === "sent";
    return (
      <PageHero
        tone="paper"
        crumb={<Mark tone={sent ? "ok" : "info"} />}
        title={sent ? copy.sent[0] : copy.soon}
        sub={
          sent
            ? copy.sent[1]
            : "Nothing was sent. Cyber X hasn’t launched yet, so no one is reading these."
        }
        card={
          <div className="flex flex-col gap-4">
            {sent ? (
              <div>
                <DataRow label="Your reference" value={state.reference} mono />
                {state.resolveBy ? (
                  <DataRow line label="We aim to resolve it by" value={state.resolveBy} />
                ) : null}
              </div>
            ) : null}
            <Note tone={sent ? "grey" : "blue"}>
              {sent
                ? copy.sent[2]
                : "If you’ve lost money, call your bank straight away. To freeze a Cyber X account, use the app."}
            </Note>
            <ArrowLink href={copy.back[1]}>{copy.back[0]}</ArrowLink>
          </div>
        }
      />
    );
  }

  const form = (
    <form
      action={action}
      noValidate
      aria-label={formTitle}
      className="flex w-full flex-col gap-4 rounded-[24px] border border-[#e3e7ef] bg-white p-5 shadow-[0_8px_12px_rgba(10,23,77,0.06)] lg:p-8"
    >
      {kind === "careers" ? <h3 className={TYPE.h4}>Introduce yourself</h3> : null}
      <NotSentYet>
        {kind === "careers" ? "Introductions" : kind === "complaint" ? "Complaints" : "Messages"}{" "}
        open when Cyber X launches. Until then, nothing sent here reaches our team.
      </NotSentYet>
      <FixSummary text={state.summary} />
      <TextField
        label="Your name"
        name="name"
        autoComplete="name"
        placeholder="First and last name"
        maxLength={80}
        defaultValue={values.name}
        error={errors.name}
      />
      {kind !== "careers" ? (
        <TextField
          label={
            kind === "contact" ? "Your alias or Cyber X ID (optional)" : "Your alias or Cyber X ID"
          }
          name="who"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="@yourname"
          maxLength={60}
          defaultValue={values.who}
          error={errors.who}
        />
      ) : null}
      <TextField
        label={kind === "careers" ? "Email" : "Email or phone number"}
        name="reply"
        type={kind === "careers" ? "email" : "text"}
        autoComplete="email"
        placeholder={kind === "careers" ? "you@example.com" : "So we can reply"}
        maxLength={120}
        defaultValue={values.reply}
        error={errors.reply}
      />
      {kind === "contact" ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-topic" className="text-[13px] leading-[1.2] font-medium">
            What’s it about?
          </label>
          <select
            id="contact-topic"
            name="topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            aria-invalid={errors.topic ? true : undefined}
            aria-describedby={errors.topic ? "contact-topic-error" : undefined}
            className={`${FIELD} appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2218%22%20height=%2218%22%20viewBox=%220%200%2018%2018%22%3E%3Cpath%20d=%22M4.5%207%209%2011.5%2013.5%207%22%20fill=%22none%22%20stroke=%22%235b6270%22%20stroke-width=%221.6%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22/%3E%3C/svg%3E')] bg-[length:18px] bg-[right_16px_center] bg-no-repeat pr-11 ${topic ? "" : "text-[#737d8f]"} ${errors.topic ? "border-error-text" : ""}`}
          >
            <option value="" disabled>
              Choose a topic
            </option>
            {TOPICS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {errors.topic ? (
            <p id="contact-topic-error" className="text-error-text text-[13px] leading-[1.4]">
              {errors.topic}
            </p>
          ) : null}
        </div>
      ) : null}
      {kind === "complaint" ? (
        <TextField
          label="Reference (optional)"
          name="reference"
          autoComplete="off"
          spellCheck={false}
          placeholder="A payment or dispute reference"
          maxLength={40}
          defaultValue={values.reference}
          error={errors.reference}
        />
      ) : null}
      <TextArea
        label={
          kind === "contact"
            ? "Your message"
            : kind === "complaint"
              ? "What went wrong?"
              : "What would you work on?"
        }
        name="message"
        placeholder={
          kind === "contact"
            ? "Tell us what happened, and when."
            : kind === "complaint"
              ? "Tell us what happened, and what you’d like us to do."
              : "Engineering, risk, design, partnerships…"
        }
        maxLength={kind === "careers" ? 1000 : 2000}
        defaultValue={values.message}
        error={errors.message}
      />
      {kind === "careers" ? (
        <TextField
          label="A link to your work (optional)"
          name="link"
          type="url"
          autoComplete="url"
          placeholder="Portfolio, GitHub or LinkedIn"
          maxLength={200}
          defaultValue={values.link}
          error={errors.link}
        />
      ) : null}
      {kind === "contact" ? (
        <Note tone="grey" icon="lock">
          Never include your PIN, password or codes. We’ll never ask for them.
        </Note>
      ) : null}
      <Button type="submit" variant="primary" disabled={pending} aria-busy={pending}>
        {SEND[kind]}
      </Button>
    </form>
  );

  return (
    <>
      {hero}
      <Section id="send" tag={formTag} title={formTitle} sub={formSub}>
        {aside ? (
          <Columns top leftWidth={520} left={form} right={aside} />
        ) : (
          <div className="lg:max-w-[640px]">{form}</div>
        )}
      </Section>
      {after}
    </>
  );
}
