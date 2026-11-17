"use server";

import { readReport, type ReportState } from "./rules";

/**
 * Report a scam (W7.1). Until the control room exists (app M16, M19)
 * nothing is sent: a report that reads well answers "not_live". W7.1 stores
 * it and answers "sent" with a reference; W7.3 adds the limit and bot check.
 */
export async function sendReport(_previous: ReportState, form: FormData): Promise<ReportState> {
  const read = readReport(form);
  if (!read.ok) return read.state;
  return { step: "not_live" };
}
