import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

import {
  Avatar,
  Columns,
  Cta,
  DataRow,
  Faq,
  Frost,
  Glass,
  Grid,
  HeroButtons,
  IconDisc,
  InShort,
  LastUpdated,
  LegalText,
  MockButton,
  MockField,
  Note,
  OkBadge,
  PageHero,
  Person,
  Rows,
  Section,
  Steps,
  Table,
  Tile,
  VideoSlot,
} from "./Kit";

describe("page parts", () => {
  it("gives the page one main heading and an optional crumb, tag and card", () => {
    const { rerender } = render(
      <PageHero
        tag="Features"
        title="Everything."
        sub="One app."
        after={<p>after</p>}
        card={<p>card</p>}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Everything." })).toHaveAttribute(
      "id",
      "page-title",
    );
    expect(screen.getByText("Features")).toBeInTheDocument();
    expect(screen.getByText("card")).toBeInTheDocument();
    rerender(<PageHero tone="paper" crumb="Legal" title="Terms." sub="The agreement." />);
    expect(screen.getByText("Legal")).toBeInTheDocument();
    expect(screen.queryByText("card")).toBeNull();
  });

  it("titles a section only when it has a heading", () => {
    const { container, rerender } = render(
      <Section
        tone="blue"
        id="team"
        tag="Team"
        title="The people."
        sub="Who we are."
        rosetteAt={[0.5, 0.5]}
      >
        <p>inside</p>
      </Section>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "The people." })).toBeInTheDocument();
    expect(container.querySelector("#team")).not.toBeNull();
    rerender(
      <Section tone="paper">
        <p>inside</p>
      </Section>,
    );
    expect(screen.queryByRole("heading")).toBeNull();
    rerender(
      <Section>
        <p>plain</p>
      </Section>,
    );
    expect(screen.getByText("plain")).toBeInTheDocument();
  });

  it("lays out tiles in light and dark, with icons, numbers, tags and links", () => {
    render(
      <Grid cols={3}>
        <Tile icon="send" title="Pay" desc="By name." link={{ label: "More", href: "/features" }} />
        <Tile
          icon="spark"
          dark
          tag="Coming later"
          title="Next"
          desc="Soon."
          link={{ label: "Later", href: "/ask-x" }}
        />
        <Tile big="1" title="Pick." />
      </Grid>,
    );
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
    expect(screen.getByRole("link", { name: /More/ })).toHaveAttribute("href", "/features");
    expect(screen.getByText("Coming later")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("gives a tile a level-2 title where no section heading sits above it", () => {
    render(
      <Grid cols={2}>
        <Tile level={2} title="New to Cyber X?" />
      </Grid>,
    );
    expect(screen.getByRole("heading", { level: 2, name: "New to Cyber X?" })).toBeInTheDocument();
  });

  it("draws small and dark icon discs", () => {
    const { container } = render(
      <>
        <IconDisc icon="spark" size="sm" />
        <IconDisc icon="check" dark />
      </>,
    );
    expect(container.querySelectorAll("span").length).toBeGreaterThan(1);
  });

  it("writes rows as a description list, in light and dark", () => {
    render(
      <>
        <Rows items={[["Fees", "Free up to ₦5,000."]]} />
        <Rows dark labelWidth={400} items={[["Limits", <b key="b">By tier</b>]]} />
      </>,
    );
    expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual(["Fees", "Limits"]);
    expect(screen.getByText("By tier")).toBeInTheDocument();
  });

  it("puts two columns side by side", () => {
    render(
      <>
        <Columns left={<p>left</p>} right={<p>right</p>} />
        <Columns top leftWidth={420} left={<p>l2</p>} right={<p>r2</p>} />
        <Frost className="w-1">frost</Frost>
        <Glass>glass</Glass>
      </>,
    );
    for (const text of ["left", "right", "l2", "r2", "frost", "glass"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });

  it("numbers steps in order", () => {
    render(
      <>
        <Steps
          items={[
            ["You pay.", "We hold it."],
            ["They send it.", "You see it."],
          ]}
        />
        <Steps dark items={[["One.", "First."]]} />
      </>,
    );
    const lists = screen.getAllByRole("list");
    expect(within(lists[0]!).getAllByRole("listitem")).toHaveLength(2);
  });

  it("colours data rows by meaning", () => {
    render(
      <>
        <DataRow label="Fee" value="₦10.00" />
        <DataRow label="Status" value="Paid" tone="ok" line />
        <DataRow label="Due" value="Waiting" tone="warn" />
        <DataRow label="Sent" value="15 Nov" dark line />
        <DataRow label="Meter" value="4512" mono />
      </>,
    );
    expect(screen.getByText("Paid").className).toContain("text-success");
    expect(screen.getByText("Waiting").className).toContain("text-warn-fg");
    expect(screen.getByText("15 Nov").className).toContain("text-white");
  });

  it("shows notes in each tone", () => {
    render(
      <>
        <Note>grey note</Note>
        <Note tone="green" icon="check">
          green note
        </Note>
      </>,
    );
    expect(screen.getByText("grey note").parentElement?.className).toContain("bg-soft");
    expect(screen.getByText("green note").parentElement?.className).toContain("bg-note-ok-bg");
  });

  it("draws pictures of the app that can’t be clicked", () => {
    render(
      <>
        <Avatar initials="MB" size={32} />
        <Avatar initials="AO" />
        <OkBadge />
        <MockField label="To" value="@maryam.b" icon="search" right="Paste" />
        <MockField value="₦25,000.00" />
        <MockButton label="Approve with Face ID" />
        <MockButton label="Take it back" variant="ghost" />
        <MockButton label="Copy" variant="secondary" />
        <Person initials="MB" name="Maryam B." handle="@maryam.b" />
      </>,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByText("Maryam B.")).toBeInTheDocument();
  });

  it("tells screen readers the film isn’t ready", () => {
    render(<VideoSlot title="Cyber X in 90 seconds" length="1:30" />);
    expect(screen.getByText("The film is being made and will play here.")).toBeInTheDocument();
  });

  it("opens questions one at a time", () => {
    render(<Faq items={[["Can I link my bank?", "Not yet."]]} />);
    expect(screen.getByText("Can I link my bank?").closest("details")).not.toBeNull();
  });

  it("gives a table a caption, and repeats it as cards on phones", () => {
    render(
      <Table
        caption="What things cost"
        columns={["Service", "Fee", "Good to know"]}
        rows={[
          ["Bills", "₦50 per bill", "Shown first"],
          ["Airtime", "Free", ""],
        ]}
      />,
    );
    expect(screen.getByRole("table", { name: "What things cost" })).toBeInTheDocument();
    expect(screen.getAllByText("₦50 per bill")).toHaveLength(2);
  });

  it("ends with Get the app and Try the demo by default", () => {
    render(<Cta appUrl="https://demo.example" />);
    expect(screen.getByRole("heading", { name: "Ready when you are." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Try the demo" })).toHaveAttribute(
      "href",
      "https://demo.example",
    );
  });

  it("lets a page change both hero buttons", () => {
    render(
      <HeroButtons
        appUrl="https://demo.example"
        first={{ label: "Meet the team", href: "#team" }}
        second={{ label: "Careers", href: "/careers" }}
      />,
    );
    expect(screen.getByRole("link", { name: "Meet the team" })).toHaveAttribute("href", "#team");
    expect(screen.queryByRole("link", { name: "Try the demo" })).toBeNull();
  });

  it("writes legal text with paragraphs, lists and a date", () => {
    render(
      <>
        <InShort lines={["We never sell your data."]} />
        <LegalText
          parts={[
            ["Who we are", "Cyber X Technologies."],
            ["Your rights", [["Correct it", "Fix anything that’s wrong."]], "Contact us."],
          ]}
        />
        <LastUpdated date="16 November 2026" />
      </>,
    );
    expect(screen.getByRole("heading", { name: "In short" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your rights" })).toBeInTheDocument();
    expect(screen.getByText("Correct it")).toBeInTheDocument();
    expect(screen.getByText("Last updated 16 November 2026")).toBeInTheDocument();
  });
});
