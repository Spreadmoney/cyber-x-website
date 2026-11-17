import {
  FORMS_LIVE,
  fits,
  isPastDate,
  isReplyAddress,
  summary,
  text,
  type Errors,
} from "@/lib/forms/rules";

/** Report a scam (W7.1; Figma Report a scam, Needs fixing, Sent). */
export const SCAM_KINDS = [
  ["fake_link", "A fake payment link or receipt"],
  ["impostor", "Someone pretending to be Cyber X"],
  ["asked_pin", "A message asking for my PIN or a code"],
  ["wrong_person", "Someone I paid isn’t who they said"],
  ["other", "Something else"],
] as const;

export type ScamKind = (typeof SCAM_KINDS)[number][0];
type Field = "kind" | "who" | "when" | "message" | "reply";

const FIX: Record<Field, readonly [message: string, inSummary: string]> = {
  kind: ["Choose what happened.", "choose what happened"],
  who: ["Up to 60 characters.", "shorten the alias, ID or reference"],
  when: ["Choose the day it happened, today or before.", "say when it happened"],
  message: ["Tell us a little about what happened.", "tell us a little about it"],
  reply: ["Enter a phone number or an email address.", "check how we can reply"],
};

export interface Report {
  kind: ScamKind;
  who: string;
  when: string;
  message: string;
  reply: string;
}

export type ReportState =
  | { step: "form"; errors?: Errors<Field>; summary?: string; values?: Partial<Report> }
  /** Until the control room exists (FORMS_LIVE): nothing is sent. */
  | { step: "not_live" }
  | { step: "sent"; reference: string };

export function readReport(
  form: FormData,
  today?: Date,
): { ok: true; report: Report } | { ok: false; state: ReportState } {
  const kind = text(form.get("kind"), 20);
  const report = {
    kind: kind as ScamKind,
    who: text(form.get("who"), 60),
    when: text(form.get("when"), 10),
    message: text(form.get("message"), 2000),
    reply: text(form.get("reply"), 120),
  };
  const errors: Errors<Field> = {};
  if (!SCAM_KINDS.some(([value]) => value === kind)) errors.kind = FIX.kind[0];
  if (!fits(report.who, 0, 60)) errors.who = FIX.who[0];
  if (!isPastDate(report.when, today)) errors.when = FIX.when[0];
  if (!fits(report.message, 10, 2000)) errors.message = FIX.message[0];
  if (report.reply && (report.reply.length > 120 || !isReplyAddress(report.reply))) {
    errors.reply = FIX.reply[0];
  }
  const wrong = (Object.keys(FIX) as Field[]).filter((field) => errors[field]);
  if (wrong.length) {
    return {
      ok: false,
      state: {
        step: "form",
        errors,
        summary: summary(wrong.map((field) => FIX[field][1])),
        values: report,
      },
    };
  }
  return { ok: true, report };
}

/** Sent nowhere yet: W7.1 stores reports for the control room (app M16, M19). */
export const REPORTS_LIVE = FORMS_LIVE;

/** The Figma examples, shown only where PAGE_PREVIEWS=on. */
export const REPORT_PREVIEWS = {
  sent: { step: "sent", reference: "SCM-4F2A" },
  not_live: { step: "not_live" },
} as const satisfies Record<string, ReportState>;
