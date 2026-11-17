import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/r/k7Q2mX9pLw" }));

import { REQUEST_PREVIEWS } from "@/lib/requests/rules";

import { RequestPage } from "./RequestView";

const APP = "https://cyber-x-eosin.vercel.app";

describe("a payment request link (W5)", () => {
  it("shows who is asking and where to pay, never the amount", () => {
    const { container } = render(<RequestPage view={REQUEST_PREVIEWS.open} appUrl={APP} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Chidi sent you a request." }),
    ).toBeInTheDocument();
    expect(screen.getByText("@chidi.eze · Verified")).toBeInTheDocument();
    expect(screen.getByText("@ayora")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open in the Cyber X app" })).toHaveAttribute(
      "href",
      `${APP}/r/k7Q2mX9pLw`,
    );
    expect(screen.getByRole("link", { name: /Get the app/ })).toHaveAttribute(
      "href",
      "/get-the-app",
    );
    expect(container.textContent).not.toMatch(/₦|\d+\.\d{2}/);
  });

  it.each([
    ["paid", "Paid in full."],
    ["expired", "This request has expired."],
    ["cancelled", "Chidi cancelled this request."],
  ] as const)("%s", (state, title) => {
    render(<RequestPage view={REQUEST_PREVIEWS[state]} appUrl={APP} />);
    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText("Chidi Eze")).toBeInTheDocument();
  });

  it("a paid request opens the app; an expired one points to Get the app", () => {
    render(<RequestPage view={REQUEST_PREVIEWS.paid} appUrl={APP} />);
    expect(screen.getByRole("link", { name: "Open the app" })).toHaveAttribute("href", APP);
  });

  it("a link that isn't ours says so, and how to report it", () => {
    render(<RequestPage view={{ state: "not_real" }} appUrl={APP} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "This isn’t a real Cyber X link." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Report a scam" })).toHaveAttribute("href", "/report");
    expect(screen.getByRole("link", { name: /How to spot a fake/ })).toHaveAttribute(
      "href",
      "/blog/five-scams",
    );
  });
});
