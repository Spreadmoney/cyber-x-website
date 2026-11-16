import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CHOICE_COOKIE, CookieChoices, readChoice, writeChoice } from "./CookieChoices";
import { FeeCalculator } from "./FeeCalculator";
import { ReviewCard } from "./ReviewCard";

const headerValues = vi.hoisted(() => ({ userAgent: null as string | null }));
vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers(headerValues.userAgent ? { "user-agent": headerValues.userAgent } : {}),
}));

import { approveLabel } from "@/lib/site/face";

describe("Work out a fee", () => {
  it("starts with a ₦25,000 withdrawal and its ₦10 fee", () => {
    render(<FeeCalculator />);
    expect(screen.getByText("₦10.00")).toBeInTheDocument();
    expect(screen.getByText("₦25,010.00")).toBeInTheDocument();
  });

  it("works out the fee for what you pick and the amount you type", () => {
    render(<FeeCalculator />);
    fireEvent.change(screen.getByLabelText("What are you doing?"), { target: { value: "bill" } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "10,000" } });
    expect(screen.getByText("₦50.00")).toBeInTheDocument();
    expect(screen.getByText("₦10,050.00")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("What are you doing?"), {
      target: { value: "nonsense" },
    });
    expect(screen.getByText("₦50.00")).toBeInTheDocument();
  });

  it("asks for an amount it can read", () => {
    render(<FeeCalculator />);
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "twenty" } });
    expect(screen.getByText("Type an amount in naira, like 25,000.")).toBeInTheDocument();
    fireEvent.submit(screen.getByLabelText("Amount").closest("form")!);
  });
});

describe("cookie choices", () => {
  afterEach(() => {
    document.cookie = `${CHOICE_COOKIE}=; Max-Age=0; Path=/`;
  });

  it("reads only a well-formed choice", () => {
    expect(readChoice("a=1; cx_cookie_choices=p1a0")).toEqual({
      preferences: true,
      analytics: false,
    });
    expect(readChoice("cx_cookie_choices=p0a1")).toEqual({ preferences: false, analytics: true });
    expect(readChoice("cx_cookie_choices=yes")).toBeNull();
    expect(readChoice("")).toBeNull();
  });

  it("keeps the choice for a year, on this site only", () => {
    const cookie = writeChoice({ preferences: false, analytics: true });
    expect(cookie).toContain("cx_cookie_choices=p0a1");
    expect(cookie).toContain(`Max-Age=${60 * 60 * 24 * 365}`);
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("Secure");
  });

  it("marks the cookie Secure on https", () => {
    const original = window.location;
    Object.defineProperty(window, "location", {
      value: { protocol: "https:" },
      configurable: true,
    });
    expect(writeChoice({ preferences: true, analytics: true })).toContain("; Secure");
    Object.defineProperty(window, "location", { value: original, configurable: true });
  });

  it("sets nothing until you choose, then saves what you chose", () => {
    render(<CookieChoices />);
    expect(document.cookie).not.toContain(CHOICE_COOKIE);
    expect(screen.getByRole("switch", { name: /Essential/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("switch", { name: /Analytics/ }));
    fireEvent.click(screen.getByRole("switch", { name: /Preferences/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save my choices" }));
    expect(document.cookie).toContain("cx_cookie_choices=p0a1");
    expect(screen.getByRole("status")).toHaveTextContent("Saved.");
  });

  it("rejects all but essential in one tap, and shows a saved choice next time", () => {
    const { unmount } = render(<CookieChoices />);
    fireEvent.click(screen.getByRole("button", { name: "Reject all but essential" }));
    expect(document.cookie).toContain("cx_cookie_choices=p0a0");
    unmount();
    render(<CookieChoices />);
    expect(screen.getByRole("switch", { name: /Preferences/ })).not.toBeChecked();
  });
});

describe("review card and approve label", () => {
  it("shows the fee and total before you approve", () => {
    render(<ReviewCard title="Review your withdrawal" button="Approve with Face ID" />);
    expect(screen.getByText("₦25,010.00")).toBeInTheDocument();
    expect(screen.getByText("Approve with Face ID")).toBeInTheDocument();
  });

  it("says fingerprint on Android and Face ID elsewhere", async () => {
    headerValues.userAgent = "Mozilla/5.0 (Linux; Android 14; Pixel 8)";
    expect(await approveLabel()).toBe("Approve with fingerprint");
    headerValues.userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)";
    expect(await approveLabel()).toBe("Approve with Face ID");
    headerValues.userAgent = null;
    expect(await approveLabel()).toBe("Approve with Face ID");
  });
});
