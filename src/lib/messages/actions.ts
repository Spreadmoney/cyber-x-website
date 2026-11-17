"use server";

import { readMessage, type Kind, type MessageState } from "./rules";

/**
 * Contact us, Complaints and Careers (W7.2). Until the control room exists
 * (app M16, M19) nothing is sent: a message that reads well answers
 * "not_live". W7.2 stores it and answers "sent" with a reference (and, for
 * a complaint, the day we aim to resolve it by); W7.3 adds limits and a bot check.
 */
async function send(kind: Kind, form: FormData): Promise<MessageState> {
  const read = readMessage(kind, form);
  if (!read.ok) return read.state;
  return { step: "not_live" };
}

export async function sendContact(_previous: MessageState, form: FormData) {
  return send("contact", form);
}

export async function sendComplaint(_previous: MessageState, form: FormData) {
  return send("complaint", form);
}

export async function sendIntroduction(_previous: MessageState, form: FormData) {
  return send("careers", form);
}
