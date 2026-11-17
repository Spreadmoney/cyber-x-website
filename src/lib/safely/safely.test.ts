import { describe, expect, it } from "vitest";

import { LINK_SCREENS, ORDER_SCREENS, reviewLink, safelyPreview } from "./rules";

describe("Pay me safely links (W6)", () => {
  it("shows a screen for review only where previews are on", () => {
    expect(safelyPreview(LINK_SCREENS, "pay_by_card", "on")).toBe("pay_by_card");
    expect(safelyPreview(LINK_SCREENS, "waiting", "on")).toBeNull();
    expect(safelyPreview(ORDER_SCREENS, "waiting", "on")).toBe("waiting");
    expect(safelyPreview(LINK_SCREENS, "link", undefined)).toBeNull();
    expect(safelyPreview(LINK_SCREENS, ["link"], "on")).toBeNull();
  });

  it("keeps the seller's link and the buyer's order apart", () => {
    expect(reviewLink("held")).toBe("/s/kemi7Q2mX9?preview=held");
    expect(reviewLink("paid")).toBe("/o/b1s1Ord3rT0k3n?preview=paid");
  });
});
