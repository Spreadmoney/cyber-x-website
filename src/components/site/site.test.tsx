import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

import { ArrowLink, Button, ButtonLink, buttonClass } from "./Button";
import { GlassX } from "./GlassX";
import { Icon, Seal } from "./Icon";
import { LogoLink } from "./Logo";
import { Panel, Tag } from "./Panel";
import { FOOTER_LINK, SiteFooter, SlimFooter } from "./SiteFooter";
import { SiteHeader, navPill } from "./SiteHeader";
import { SiteLink } from "./SiteLink";
import { StoreButton, StoreLink } from "./StoreButton";
import { CardItem, SystemPage } from "./SystemPage";

describe("buttons and links", () => {
  it("gives each variant and size its own look", () => {
    expect(buttonClass()).toContain("bg-accent");
    expect(buttonClass("white", "S")).toContain("h-8");
    expect(buttonClass("secondary")).toContain("border-fg");
    expect(buttonClass("soft")).toContain("bg-accent/10");
    expect(buttonClass("quiet")).toContain("bg-fg/6");
    expect(buttonClass("outline-light")).toContain("border-white/70");
  });

  it("uses a plain link for another site and next/link for this one", () => {
    render(
      <>
        <ButtonLink href="https://cyber-x-eosin.vercel.app">Try the demo</ButtonLink>
        <ButtonLink href="/get-the-app">Get the app</ButtonLink>
      </>,
    );
    expect(screen.getByRole("link", { name: "Try the demo" })).toHaveAttribute(
      "href",
      "https://cyber-x-eosin.vercel.app",
    );
    expect(screen.getByRole("link", { name: "Get the app" })).toHaveAttribute(
      "href",
      "/get-the-app",
    );
  });

  it("makes real buttons, and arrow links whose › is not read out", () => {
    const onClick = vi.fn();
    render(
      <>
        <Button onClick={onClick}>Try again</Button>
        <ArrowLink href="/help" tone="white">
          All questions
        </ArrowLink>
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Try again" })).toHaveAttribute("type", "button");
    expect(screen.getByRole("link", { name: "All questions" })).toHaveClass("text-white");
  });

  it("doesn't fetch pages from later stages ahead of time", () => {
    render(
      <>
        <SiteLink href="/features">Features</SiteLink>
        <SiteLink href={{ pathname: "/get-the-app" }}>Get the app</SiteLink>
      </>,
    );
    expect(screen.getByRole("link", { name: "Features" })).toHaveAttribute("href", "/features");
    expect(screen.getByRole("link", { name: "Get the app" })).toHaveAttribute(
      "href",
      "/get-the-app",
    );
  });
});

describe("pictures", () => {
  it("shows icons and the seal as decoration, and the logo with its name", () => {
    const { container } = render(
      <>
        <Icon name="send" />
        <Icon name="freeze" size={24} />
        <Seal />
        <LogoLink />
      </>,
    );
    const decorative = container.querySelectorAll('img[alt=""]');
    expect(decorative).toHaveLength(3);
    expect(decorative[1]).toHaveStyle({ width: "24px" });
    expect(screen.getByRole("link", { name: "Cyber X, Home" })).toHaveAttribute("href", "/");
  });

  it("hides the hero drawing from screen readers", () => {
    const { container } = render(<GlassX />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    expect(container.textContent).toContain("Held until it arrives");
  });
});

describe("panels", () => {
  it("draws the rosette white on blue and blue on paper, placed per width", () => {
    const { container } = render(
      <>
        <Panel
          tone="blue"
          rosette={{ size: 560, x: -93, y: 308 }}
          rosetteDesktop={{ size: 900, x: -116, y: -142, from: "right" }}
        >
          <p>Blue</p>
        </Panel>
        <Panel tone="paper" rosette={{ size: 520, x: 10, y: 20 }} rosetteOpacity={0.3} as="div">
          <p>Paper</p>
        </Panel>
        <Panel tone="blue-reverse">
          <p>No print</p>
        </Panel>
      </>,
    );
    const [blue, paper] = container.querySelectorAll<HTMLElement>(".rosette");
    expect(blue).toHaveClass("bg-white");
    expect(blue!.style.getPropertyValue("--ms")).toBe("560px");
    expect(blue!.style.getPropertyValue("--dr")).toBe("-116px");
    expect(blue!.style.getPropertyValue("--dl")).toBe("auto");
    expect(blue!.style.opacity).toBe("0.2");
    expect(paper).toHaveClass("bg-accent");
    expect(paper!.style.opacity).toBe("0.3");
    expect(container.querySelectorAll(".rosette")).toHaveLength(2);
  });

  it("labels tags for blue and paper panels", () => {
    render(
      <>
        <Tag tone="blue">Where it’s going</Tag>
        <Tag tone="paper">The idea</Tag>
      </>,
    );
    expect(screen.getByText("Where it’s going")).toHaveClass("text-white");
    expect(screen.getByText("The idea")).toHaveClass("text-deep");
  });
});

describe("menu bar", () => {
  it("opens and closes the phone menu, and closes it with Escape", () => {
    render(<SiteHeader />);
    const toggle = screen.getByRole("button", { name: "Open menu" });
    const menu = document.getElementById("site-menu")!;
    expect(menu).toHaveAttribute("hidden");
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(menu).not.toHaveAttribute("hidden");
    fireEvent.keyDown(menu, { key: "Escape" });
    expect(menu).toHaveAttribute("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent.click(within(menu).getByRole("link", { name: "Sign in" }));
    expect(menu).toHaveAttribute("hidden");
    fireEvent.keyDown(toggle, { key: "Tab" });
  });

  it("links every page in the menu, and Get the app", () => {
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Features" })).toHaveAttribute(
      "href",
      "/features",
    );
    expect(within(nav).getByRole("link", { name: "Get the app" })).toHaveAttribute(
      "href",
      "/get-the-app",
    );
  });

  it("marks menu links with a light-blue pill, never an underline", () => {
    expect(navPill(false)).toContain("hover:bg-accent/10");
    expect(navPill(true)).toContain("bg-accent/15");
    expect(navPill(true)).toContain("text-deep");
    render(<SiteHeader />);
    const features = within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", {
      name: "Features",
    });
    expect(features).not.toHaveAttribute("aria-current");
    expect(features.className).toContain("rounded-full");
    expect(features.className).not.toContain("underline");
  });
});

describe("footers", () => {
  it("lists every group, with the promise about PINs", () => {
    render(<SiteFooter />);
    expect(screen.getAllByText("Licences")).toHaveLength(2);
    expect(
      screen.getByText("Cyber X will never ask for your PIN, password or codes."),
    ).toBeInTheDocument();
  });

  it("turns footer links blue on hover, never underlined", () => {
    render(<SlimFooter />);
    const privacy = screen.getByRole("link", { name: "Privacy" });
    expect(FOOTER_LINK).toContain("hover:text-accent");
    expect(privacy.className).toContain("hover:text-accent");
    expect(privacy.className).not.toContain("underline");
  });

  it("keeps the slim footer to the essentials", () => {
    render(<SlimFooter />);
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Help" })).toHaveAttribute("href", "/help");
  });
});

describe("store buttons", () => {
  it("open “Coming to the stores”, which points to the demo", () => {
    render(
      <>
        <StoreButton store="apple" demoUrl="https://cyber-x-eosin.vercel.app" />
        <StoreLink store="google" demoUrl="https://cyber-x-eosin.vercel.app" />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: /App Store/ }));
    const sheets = screen.getAllByRole("dialog", { hidden: true });
    const open = sheets.find((sheet) => (sheet as HTMLDialogElement).open)!;
    expect(within(open).getByRole("link", { name: "Try the demo" })).toHaveAttribute(
      "href",
      "https://cyber-x-eosin.vercel.app",
    );
    fireEvent.click(within(open).getByRole("button", { name: "Close" }));
    expect((open as HTMLDialogElement).open).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /On Android\? Get it on Google Play/ }));
    const second = sheets.find((sheet) => (sheet as HTMLDialogElement).open)!;
    fireEvent.click(second);
    expect((second as HTMLDialogElement).open).toBe(false);
  });
});

describe("system pages", () => {
  it("frame the message, the actions and the card", () => {
    render(
      <SystemPage
        status={<span>Error 404</span>}
        title="This page isn’t here."
        text="It may have moved."
        actions={<button type="button">Try again</button>}
        card={<CardItem title="Freeze by USSD">Dial the code.</CardItem>}
      />,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "This page isn’t here." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Freeze by USSD" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
