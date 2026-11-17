import { describe, expect, it } from "vitest";

import { sendComplaint, sendContact, sendIntroduction } from "./actions";
import { MESSAGE_PREVIEWS, messagePreview, readMessage } from "./rules";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

const contact = {
  name: "Ada Obi",
  who: "",
  reply: "ada@example.com",
  topic: "payment",
  message: "My payment is waiting. Why?",
};
const complaint = {
  name: "Ada Obi",
  who: "@ada.obi",
  reply: "0801 234 5678",
  reference: "DX-7741-0912",
  message: "I was charged twice for one transfer.",
};
const intro = {
  name: "Ada Obi",
  reply: "ada@example.com",
  message: "Risk and fraud models for payments.",
  link: "https://github.com/ada",
};

describe("Contact us, Complaints and Careers (W7.2)", () => {
  it("read a message that reads well", () => {
    expect(readMessage("contact", form(contact))).toEqual({ ok: true, values: contact });
    expect(readMessage("complaint", form(complaint))).toMatchObject({ ok: true });
    expect(readMessage("careers", form(intro))).toMatchObject({ ok: true });
    expect(readMessage("contact", form({ ...contact, who: "CX-7K2M-9QF4-T3XD" }))).toMatchObject({
      ok: true,
    });
  });

  it("say what to fix in each, keeping what was typed", () => {
    expect(readMessage("contact", form({ name: "A", reply: "nope", message: "Hi" }))).toMatchObject(
      {
        ok: false,
        state: {
          step: "form",
          summary:
            "Four things need fixing: add your name, add how we can reply, choose a topic, and write your message.",
          values: { name: "A", reply: "nope" },
        },
      },
    );
    expect(readMessage("contact", form({ ...contact, who: "0801 234 5678" }))).toMatchObject({
      state: { errors: { who: expect.any(String) } },
    });
    expect(readMessage("complaint", form({ ...complaint, who: "" }))).toMatchObject({
      state: {
        errors: { who: expect.any(String) },
        summary: "One thing needs fixing: add your alias or Cyber X ID.",
      },
    });
    expect(
      readMessage("complaint", form({ ...complaint, reference: "no spaces please" })),
    ).toMatchObject({
      state: { errors: { reference: expect.any(String) } },
    });
    expect(readMessage("careers", form({ ...intro, reply: "0801 234 5678" }))).toMatchObject({
      state: { errors: { reply: "Enter your email address." } },
    });
    expect(readMessage("careers", form({ ...intro, link: "http://example.com" }))).toMatchObject({
      state: { errors: { link: expect.any(String) } },
    });
    expect(readMessage("careers", form({ ...intro, message: "x".repeat(1001) }))).toMatchObject({
      state: { errors: { message: expect.any(String) } },
    });
  });

  it("send nothing until the control room exists", async () => {
    expect(await sendContact({ step: "form" }, form(contact))).toEqual({ step: "not_live" });
    expect(await sendComplaint({ step: "form" }, form(complaint))).toEqual({ step: "not_live" });
    expect(await sendIntroduction({ step: "form" }, form(intro))).toEqual({ step: "not_live" });
    expect(await sendContact({ step: "form" }, form({}))).toMatchObject({ step: "form" });
  });

  it("show the Figma examples only where previews are on", () => {
    expect(messagePreview("complaint", "sent", "on")).toBe(MESSAGE_PREVIEWS.complaint);
    expect(messagePreview("contact", "not_live", "on")).toEqual({ step: "not_live" });
    expect(messagePreview("contact", "sent", undefined)).toBeNull();
    expect(messagePreview("contact", "other", "on")).toBeNull();
  });
});
