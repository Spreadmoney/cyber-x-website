import { describe, expect, it } from "vitest";

import { sendReport } from "./actions";
import { readReport } from "./rules";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};
const good = {
  kind: "fake_link",
  who: "@kemi.fabrics",
  when: "2026-11-10",
  message: "A receipt for a payment that never arrived.",
  reply: "",
};
const today = new Date("2026-11-17T12:00:00Z");

describe("Report a scam (W7.1)", () => {
  it("reads a report", () => {
    expect(readReport(form(good), today)).toEqual({ ok: true, report: good });
  });

  it("says what needs fixing, keeping what was typed", () => {
    const read = readReport(form({ message: "Short", reply: "nope" }), today);
    expect(read).toMatchObject({
      ok: false,
      state: {
        step: "form",
        summary:
          "Four things need fixing: choose what happened, say when it happened, tell us a little about it, and check how we can reply.",
        values: { message: "Short", reply: "nope" },
      },
    });
    expect(readReport(form({ ...good, kind: "toString" }), today)).toMatchObject({
      state: { errors: { kind: "Choose what happened." } },
    });
    expect(readReport(form({ ...good, who: "x".repeat(61) }), today)).toMatchObject({
      state: { errors: { who: "Up to 60 characters." } },
    });
    expect(
      readReport(form({ ...good, reply: `${"a".repeat(120)}@example.com` }), today),
    ).toMatchObject({
      state: { errors: { reply: expect.any(String) } },
    });
  });

  it("sends nothing until the control room exists", async () => {
    expect(await sendReport({ step: "form" }, form({ ...good, when: "2026-11-01" }))).toEqual({
      step: "not_live",
    });
    expect(await sendReport({ step: "form" }, form({}))).toMatchObject({ step: "form" });
  });
});
