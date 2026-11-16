// Copied from Codebase (src/components/brand/Wordmark.test.tsx) by `npm run sync:shared`. Change it there, then sync. Never edit it here.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Wordmark } from "./Wordmark";

describe("Wordmark", () => {
  it("is announced as the Cyber X logo", () => {
    render(<Wordmark />);
    expect(screen.getByRole("img", { name: "Cyber X" })).toBeInTheDocument();
  });

  it("keeps the artwork's proportions at any width", () => {
    const { rerender } = render(<Wordmark width={240} />);
    const logo = screen.getByRole("img", { name: "Cyber X" });
    expect(logo).toHaveAttribute("width", "240");
    const ratio = Number(logo.getAttribute("width")) / Number(logo.getAttribute("height"));

    rerender(<Wordmark width={80} />);
    const small = screen.getByRole("img", { name: "Cyber X" });
    expect(small).toHaveAttribute("width", "80");
    expect(Number(small.getAttribute("width")) / Number(small.getAttribute("height"))).toBeCloseTo(
      ratio,
      5,
    );
  });

  it("colours only the lower-right leg of the X blue", () => {
    render(<Wordmark />);
    const paths = screen.getByRole("img", { name: "Cyber X" }).querySelectorAll("path");
    expect(paths).toHaveLength(2);
    expect(paths[0]).toHaveAttribute("fill", "#0B0D12");
    expect(paths[1]).toHaveAttribute("fill", "#0A5CFF");
  });

  it("passes other attributes through, such as a class name", () => {
    render(<Wordmark className="mx-auto" data-testid="logo" />);
    expect(screen.getByTestId("logo")).toHaveClass("mx-auto");
  });
});
