import { describe, expect, it } from "vitest";

import { qrSvg } from "./qr";

describe("qrSvg", () => {
  it("draws a QR code as a plain SVG with no scripts", async () => {
    const svg = await qrSvg("https://cyber-x-website-chi.vercel.app/get-the-app");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).not.toMatch(/<script|on\w+=/i);
    expect(svg).toContain("#0b0d12");
  });
});
