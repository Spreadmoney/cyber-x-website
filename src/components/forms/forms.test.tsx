import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/contact" }));
const actions = vi.hoisted(() => ({
  sendContact: vi.fn(),
  sendComplaint: vi.fn(),
  sendIntroduction: vi.fn(),
}));
vi.mock("@/lib/messages/actions", () => actions);

import { MESSAGE_PREVIEWS } from "@/lib/messages/rules";

import { MessagePage } from "./MessagePage";
import { CAREERS, COMPLAINTS, CONTACT } from "./pages";

beforeEach(() => Object.values(actions).forEach((action) => action.mockReset()));

describe("message forms (W7.2)", () => {
  it("Contact us: urgent things first, then the form, saying nothing is sent yet", () => {
    render(
      <MessagePage
        kind="contact"
        initial={{ step: "form" }}
        hero={CONTACT.hero}
        formTitle="Send us a message"
        aside={CONTACT.aside}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Contact us." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Freeze my account" })).toHaveAttribute(
      "href",
      "/freeze",
    );
    expect(screen.getByText(/Messages open when Cyber X launches/)).toBeInTheDocument();
    expect(screen.getByLabelText("What’s it about?")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("What’s it about?"), { target: { value: "fees" } });
    expect(screen.getByLabelText("What’s it about?")).toHaveValue("fees");
    expect(screen.getByRole("heading", { name: "Other ways to reach us" })).toBeInTheDocument();
  });

  it("shows what to fix, field by field", async () => {
    actions.sendContact.mockResolvedValue({
      step: "form",
      errors: { name: "Enter your first and last name.", topic: "Choose a topic." },
      summary: "Two things need fixing: add your name, and choose a topic.",
      values: { name: "A" },
    });
    render(
      <MessagePage
        kind="contact"
        initial={{ step: "form" }}
        hero={CONTACT.hero}
        formTitle="Send us a message"
      />,
    );
    await act(async () =>
      fireEvent.submit(screen.getByRole("form", { name: "Send us a message" })),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Two things need fixing");
    expect(screen.getByLabelText("Your name")).toHaveAccessibleDescription(
      "Enter your first and last name.",
    );
    expect(screen.getByLabelText("What’s it about?")).toHaveAccessibleDescription(
      "Choose a topic.",
    );
  });

  it("before launch: nothing was sent", async () => {
    actions.sendComplaint.mockResolvedValue({ step: "not_live" });
    render(
      <MessagePage
        kind="complaint"
        initial={{ step: "form" }}
        hero={COMPLAINTS.hero}
        formTitle="Make a complaint"
        after={COMPLAINTS.after}
      />,
    );
    expect(screen.getByRole("heading", { name: "Not happy with our answer?" })).toBeInTheDocument();
    expect(screen.getByLabelText("Reference (optional)")).toBeInTheDocument();
    await act(async () => fireEvent.submit(screen.getByRole("form", { name: "Make a complaint" })));
    expect(
      screen.getByRole("heading", { level: 1, name: "Complaints open soon." }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Nothing was sent/)).toBeInTheDocument();
  });

  it("a complaint received: the reference and the day we aim to resolve it by", () => {
    render(
      <MessagePage
        kind="complaint"
        initial={MESSAGE_PREVIEWS.complaint}
        hero={null}
        formTitle=""
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "Complaint received." }),
    ).toBeInTheDocument();
    expect(screen.getByText("CMP-5H2K-1611")).toBeInTheDocument();
    expect(screen.getByText("30 Nov 2026")).toBeInTheDocument();
  });

  it.each([
    ["contact", "Message sent.", "Back to Help"],
    ["careers", "Thanks for introducing yourself.", "Back to About"],
  ] as const)("%s sent", (kind, title, back) => {
    render(<MessagePage kind={kind} initial={MESSAGE_PREVIEWS[kind]} hero={null} formTitle="" />);
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: new RegExp(back) })).toBeInTheDocument();
  });

  it("Careers: no invented roles, and an introduction instead", () => {
    render(
      <MessagePage
        kind="careers"
        initial={{ step: "form" }}
        hero={
          <>
            {CAREERS.hero}
            {CAREERS.values}
          </>
        }
        formTag="Open roles"
        formTitle="No open roles right now."
        after={CAREERS.after}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "No open roles right now." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Introduce yourself" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("A link to your work (optional)")).toHaveAttribute("type", "url");
    expect(screen.queryByLabelText(/alias/)).not.toBeInTheDocument();
  });
});
