import { readWho } from "@/lib/auth/identity";
import { fits, isEmail, isReplyAddress, summary, text, type Errors } from "@/lib/forms/rules";

/**
 * Contact us, Complaints and Careers (W7.2; Figma Contact us, Message sent,
 * Complaints, Complaint received, Careers). Built ahead of the app on
 * 17 Nov 2026: until the control room exists (app M16, M19), nothing is
 * sent (FORMS_LIVE in lib/forms/rules) and each form says so.
 */
export type Kind = "contact" | "complaint" | "careers";

export const TOPICS = [
  ["account", "My account or signing in"],
  ["payment", "A payment"],
  ["money", "Adding money or withdrawing"],
  ["safely", "Pay me safely"],
  ["fees", "Fees and limits"],
  ["other", "Something else"],
] as const;

type Field = "name" | "who" | "reply" | "topic" | "reference" | "message" | "link";

/** Each field: how to read it, when it's wrong, and what to say. */
interface Rule {
  longest: number;
  ok: (value: string) => boolean;
  message: string;
  inSummary: string;
}

const NAME: Rule = {
  longest: 80,
  ok: (v) => fits(v, 2, 80),
  message: "Enter your first and last name.",
  inSummary: "add your name",
};
const REPLY: Rule = {
  longest: 120,
  ok: (v) => isReplyAddress(v),
  message: "Enter an email address or a phone number.",
  inSummary: "add how we can reply",
};
const optionalWho: Rule = {
  longest: 60,
  ok: (v) => !v || ["alias", "id"].includes(readWho(v)?.kind ?? ""),
  message: "Enter your alias, like @ayora, or your Cyber X ID.",
  inSummary: "check your alias or Cyber X ID",
};

export const RULES: Record<Kind, Partial<Record<Field, Rule>>> = {
  contact: {
    name: NAME,
    who: optionalWho,
    reply: REPLY,
    topic: {
      longest: 20,
      ok: (v) => TOPICS.some(([value]) => value === v),
      message: "Choose a topic.",
      inSummary: "choose a topic",
    },
    message: {
      longest: 2000,
      ok: (v) => fits(v, 10, 2000),
      message: "Tell us a little more: at least 10 characters.",
      inSummary: "write your message",
    },
  },
  complaint: {
    name: NAME,
    who: {
      ...optionalWho,
      ok: (v) => Boolean(v) && optionalWho.ok(v),
      inSummary: "add your alias or Cyber X ID",
    },
    reply: REPLY,
    reference: {
      longest: 40,
      ok: (v) => !v || /^[A-Za-z0-9-]{4,40}$/.test(v),
      message: "Enter the reference as it’s written, letters, digits and dashes.",
      inSummary: "check the reference",
    },
    message: {
      longest: 2000,
      ok: (v) => fits(v, 10, 2000),
      message: "Tell us what went wrong: at least 10 characters.",
      inSummary: "say what went wrong",
    },
  },
  careers: {
    name: NAME,
    reply: {
      longest: 120,
      ok: (v) => isEmail(v),
      message: "Enter your email address.",
      inSummary: "add your email",
    },
    message: {
      longest: 1000,
      ok: (v) => fits(v, 10, 1000),
      message: "Tell us what you’d work on: at least 10 characters.",
      inSummary: "say what you’d work on",
    },
    link: {
      longest: 200,
      ok: (v) => !v || /^https:\/\/[^\s/$.?#][^\s]{3,190}$/.test(v),
      message: "Enter a full address starting with https://.",
      inSummary: "check the link",
    },
  },
};

export type MessageState =
  | {
      step: "form";
      errors?: Errors<Field>;
      summary?: string;
      values?: Partial<Record<Field, string>>;
    }
  /** Until the control room exists (FORMS_LIVE): nothing is sent. */
  | { step: "not_live" }
  | { step: "sent"; reference: string; resolveBy?: string };

export function readMessage(
  kind: Kind,
  form: FormData,
): { ok: true; values: Partial<Record<Field, string>> } | { ok: false; state: MessageState } {
  const rules = RULES[kind];
  const values: Partial<Record<Field, string>> = {};
  const errors: Errors<Field> = {};
  const fixes: string[] = [];
  for (const [field, rule] of Object.entries(rules) as [Field, Rule][]) {
    const value = text(form.get(field), rule.longest);
    values[field] = value;
    if (value.length > rule.longest || !rule.ok(value)) {
      errors[field] = rule.message;
      fixes.push(rule.inSummary);
    }
  }
  if (fixes.length)
    return { ok: false, state: { step: "form", errors, summary: summary(fixes), values } };
  return { ok: true, values };
}

/** The Figma examples, shown only where PAGE_PREVIEWS=on. */
export const MESSAGE_PREVIEWS: Record<Kind, MessageState> = {
  contact: { step: "sent", reference: "CT-7Q4M-1611" },
  complaint: { step: "sent", reference: "CMP-5H2K-1611", resolveBy: "30 Nov 2026" },
  careers: { step: "sent", reference: "CR-3J8P-1611" },
};

export function messagePreview(
  kind: Kind,
  asked: unknown,
  previews: string | undefined,
): MessageState | null {
  if (previews !== "on") return null;
  if (asked === "sent") return MESSAGE_PREVIEWS[kind];
  if (asked === "not_live") return { step: "not_live" };
  return null;
}
