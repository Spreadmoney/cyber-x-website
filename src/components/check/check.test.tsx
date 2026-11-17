import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/check" }));
const actions = vi.hoisted(() => ({ checkPayment: vi.fn() }));
vi.mock("@/lib/check/actions", () => actions);

import { PREVIEWS } from "@/lib/check/rules";

import { CheckFlow } from "./CheckFlow";

beforeEach(() => actions.checkPayment.mockReset());

async function check(reference: string, amount: string) {
  fireEvent.change(screen.getByLabelText("Reference"), { target: { value: reference } });
  fireEvent.change(screen.getByLabelText("Amount"), { target: { value: amount } });
  await act(async () => fireEvent.submit(screen.getByRole("form", { name: "Check a payment" })));
}

describe("Check a payment (W4)", () => {
  it("asks for the reference and amount, and says checks start when payments go live", () => {
    render(<CheckFlow initial={{ step: "form" }} live={false} />);
    expect(screen.getByRole("heading", { level: 1, name: "Check a payment." })).toBeInTheDocument();
    expect(screen.getByText("A check here can’t.")).toBeInTheDocument();
    expect(screen.getByText("Checks start when Cyber X payments go live.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Security" })).toHaveAttribute("href", "/security");
  });

  it("says nothing about going live once checks are live", () => {
    render(<CheckFlow initial={{ step: "form" }} live />);
    expect(screen.queryByText(/go live/)).not.toBeInTheDocument();
  });

  it("shows what to fix beside each field", async () => {
    actions.checkPayment.mockResolvedValue({
      step: "form",
      errors: { reference: "Enter the reference.", amount: "Enter the amount." },
      reference: "x",
      amount: "",
    });
    render(<CheckFlow initial={{ step: "form" }} live={false} />);
    await check("x", "");
    expect(screen.getByLabelText("Reference")).toHaveAccessibleDescription("Enter the reference.");
    expect(screen.getByLabelText("Reference")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Amount")).toHaveAccessibleDescription("Enter the amount.");
  });

  it("before payments are live: checks start soon, then Check again keeps what was typed", async () => {
    actions.checkPayment.mockImplementation(async () => ({ ...PREVIEWS.not_live }));
    render(<CheckFlow initial={{ step: "form" }} live={false} />);
    await check("dx-7741-0912", "25000");
    expect(
      screen.getByRole("heading", { level: 1, name: "Checks start soon." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/nothing to check DX‑7741‑0912 for ₦25,000.00 against/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Report a fake receipt" })).toHaveAttribute(
      "href",
      "/report",
    );
    fireEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(screen.getByLabelText("Reference")).toHaveValue("DX-7741-0912");
    expect(screen.getByLabelText("Amount")).toHaveValue("₦25,000.00");
    expect(screen.getByLabelText("Reference")).not.toHaveAttribute("aria-invalid");
    await check("DX-7741-0912", "₦25,000.00");
    expect(
      screen.getByRole("heading", { level: 1, name: "Checks start soon." }),
    ).toBeInTheDocument();
  });

  it("a real payment shows first names and initials only", () => {
    render(<CheckFlow initial={PREVIEWS.real} live />);
    expect(
      screen.getByRole("heading", { level: 1, name: "This payment is real." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Maryam B.")).toBeInTheDocument();
    expect(screen.getByText(/The money is in Ayora’s Cyber X account/)).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Check another payment" })).toHaveAttribute(
      "href",
      "/check",
    );
  });

  it("a payment it can't find warns not to hand anything over", () => {
    render(<CheckFlow initial={PREVIEWS.not_found} live />);
    expect(
      screen.getByRole("heading", { level: 1, name: "We can’t find this payment." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No Cyber X payment matches DX‑7741‑0921 for ₦25,000.00."),
    ).toBeInTheDocument();
    expect(screen.getByText(/this receipt may be fake/)).toBeInTheDocument();
  });
});
