import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/report" }));
const actions = vi.hoisted(() => ({ sendReport: vi.fn() }));
vi.mock("@/lib/report/actions", () => actions);

import { REPORT_PREVIEWS } from "@/lib/report/rules";

import { ReportFlow } from "./ReportFlow";

beforeEach(() => actions.sendReport.mockReset());

describe("Report a scam (W7.1)", () => {
  it("says up front that nothing is sent yet, and to freeze first", () => {
    render(<ReportFlow initial={{ step: "form" }} />);
    expect(screen.getByRole("heading", { level: 1, name: "Report a scam." })).toBeInTheDocument();
    expect(screen.getByText(/nothing sent here reaches our team/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Freeze my account" })).toHaveAttribute(
      "href",
      "/freeze",
    );
    expect(screen.getByRole("group", { name: "What happened?" })).toBeInTheDocument();
  });

  it("shows what to fix, by each part", async () => {
    actions.sendReport.mockResolvedValue({
      step: "form",
      errors: { kind: "Choose what happened.", message: "Tell us a little about what happened." },
      summary: "Two things need fixing: choose what happened, and tell us a little about it.",
      values: { message: "Short" },
    });
    render(<ReportFlow initial={{ step: "form" }} />);
    fireEvent.click(screen.getByLabelText("Someone pretending to be Cyber X"));
    expect(screen.getByLabelText("Someone pretending to be Cyber X")).toBeChecked();
    await act(async () => fireEvent.submit(screen.getByRole("form", { name: "Report a scam" })));
    expect(screen.getByRole("alert")).toHaveTextContent("Two things need fixing");
    expect(screen.getByRole("group", { name: "What happened?" })).toHaveAccessibleDescription(
      "Choose what happened.",
    );
    expect(screen.getByLabelText("Tell us what happened")).toHaveAttribute("aria-invalid", "true");
  });

  it("checks a screenshot's kind and size, and sends none yet", () => {
    render(<ReportFlow initial={{ step: "form" }} />);
    const picker = screen.getByLabelText("Screenshot (optional)") as HTMLInputElement;
    expect(picker).not.toHaveAttribute("name");
    fireEvent.change(picker, {
      target: { files: [new File(["x"], "note.txt", { type: "text/plain" })] },
    });
    expect(screen.getByText("Choose a PNG or JPG image.")).toBeInTheDocument();
    const big = new File(["x"], "big.png", { type: "image/png" });
    Object.defineProperty(big, "size", { value: 11 * 1024 * 1024 });
    fireEvent.change(picker, { target: { files: [big] } });
    expect(screen.getByText("Choose an image up to 10 MB.")).toBeInTheDocument();
    fireEvent.change(picker, {
      target: { files: [new File(["x"], "proof.jpg", { type: "image/jpeg" })] },
    });
    expect(screen.getByText("proof.jpg")).toBeInTheDocument();
    fireEvent.change(picker, { target: { files: [] } });
    expect(screen.getByText(/Add an image/)).toBeInTheDocument();
  });

  it("before launch: reports open soon", () => {
    render(<ReportFlow initial={REPORT_PREVIEWS.not_live} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Reports open soon." }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Nothing was sent/)).toBeInTheDocument();
  });

  it("sent: a reference to keep", () => {
    render(<ReportFlow initial={REPORT_PREVIEWS.sent} />);
    expect(screen.getByRole("heading", { level: 1, name: "Report sent." })).toBeInTheDocument();
    expect(screen.getByText("SCM-4F2A")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to Security/ })).toHaveAttribute(
      "href",
      "/security",
    );
  });
});
