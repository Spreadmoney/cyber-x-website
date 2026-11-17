import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/s/kemi7Q2mX9" }));

import { EXAMPLE, LINK_SCREENS, ORDER_SCREENS, reviewLink, type Screen } from "@/lib/safely/rules";

import { SafelyScreen } from "./SafelyScreens";

const APP = "https://cyber-x-eosin.vercel.app";
const show = (name: Screen) =>
  render(<SafelyScreen screen={name} order={EXAMPLE} to={reviewLink} appUrl={APP} />);

const TITLES: Record<Screen, string> = {
  link: "Pay Kemi safely.",
  pay_by_card: "Pay ₦18,500.00 by card.",
  held: "Your payment is held.",
  open_order: "Open your order.",
  waiting: "Your order.",
  cancel: "Cancel your order?",
  cancelled: "Order cancelled.",
  sent: "Your order is on its way.",
  did_it_arrive: "Did your order arrive?",
  paid: "Kemi has been paid.",
  whats_wrong: "What’s wrong?",
  report_received: "We’ve got your report.",
};

describe("Pay me safely, the buyer's screens (W6)", () => {
  it.each([...LINK_SCREENS, ...ORDER_SCREENS])("%s", (name) => {
    show(name);
    expect(screen.getByRole("heading", { level: 1, name: TITLES[name] })).toBeInTheDocument();
  });

  it("the link: the seller's record, what's held, and two ways to pay", () => {
    show("link");
    expect(screen.getByText("@kemi.fabrics · Verified")).toBeInTheDocument();
    expect(screen.getByText("31")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pay with the Cyber X app" })).toHaveAttribute(
      "href",
      `${APP}/s/kemi7Q2mX9`,
    );
    expect(screen.getByRole("link", { name: "Pay by card" })).toHaveAttribute(
      "href",
      "/s/kemi7Q2mX9?preview=pay_by_card",
    );
  });

  it("pay by card: the buyer's name and number, then the partner's secure page", () => {
    show("pay_by_card");
    expect(screen.getByLabelText("Your name")).toHaveValue("Bisi Adewale");
    expect(screen.getByRole("form", { name: "Pay by card" })).toHaveAttribute(
      "action",
      "/s/kemi7Q2mX9",
    );
    expect(screen.getByText(/Cyber X never sees your full card number/)).toBeInTheDocument();
  });

  it("the order: done steps are said to be done", () => {
    show("sent");
    expect(screen.getAllByText("(done)")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "It arrived" })).toHaveAttribute(
      "href",
      "/o/b1s1Ord3rT0k3n?preview=did_it_arrive",
    );
  });

  it("cancelling is red, keeping it is not", () => {
    show("cancel");
    expect(screen.getByRole("link", { name: "Cancel order" }).className).toMatch(/bg-error-text/);
  });

  it("what's wrong: a reason, more words, and photos", () => {
    show("whats_wrong");
    expect(screen.getByLabelText("Wrong item")).toBeChecked();
    expect(screen.getByLabelText("Take a photo")).toHaveAttribute("capture", "environment");
  });
});
