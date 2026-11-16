import type { ReactNode } from "react";

import { ArrowLink, ButtonLink } from "@/components/site/Button";
import { Icon, type IconName } from "@/components/site/Icon";
import { Panel, Tag, WRAP } from "@/components/site/Panel";

/**
 * The parts the information pages are built from. Each mirrors a helper
 * the Figma pages were drawn with (SEC, TILE, ROWS, FROST, TABLE…), so the
 * code and the design stay in step. Sizes are phone first, desktop at lg.
 */

/* Type (Figma text styles: desktop / phone) */
export const TYPE = {
  hero: "text-[44px] leading-[1.18] font-medium tracking-[-0.44px] lg:text-[64px] lg:leading-[1.05] lg:tracking-[-1.28px]",
  h2: "text-[28px] leading-[1.25] font-medium tracking-[-0.14px] lg:text-[48px] lg:leading-[1.1] lg:tracking-[-0.72px]",
  h3: "text-[21px] leading-[1.3] font-medium lg:text-[28px] lg:leading-[1.25] lg:tracking-[-0.14px]",
  h4: "text-[17px] leading-[1.2] font-medium lg:text-[21px] lg:leading-[1.3]",
  body: "text-[17px] leading-[1.5] lg:text-[19px]",
  p: "text-[15px] leading-[1.5] lg:text-[17px]",
  small: "text-[15px] leading-[1.5]",
  cap: "text-[13px] leading-[1.4]",
  lab: "text-[13px] leading-[1.2] font-medium",
  amt: "text-[40px] leading-[1.1] font-medium tracking-[-0.4px] lg:text-[48px] lg:tracking-[-0.72px]",
  mono: "font-mono text-[15px] leading-[1.4]",
  monoL: "font-mono text-[32px] leading-[1.2]",
} as const;

const muted = (dark?: boolean) => (dark ? "text-white/82" : "text-muted-fg");

/* Hero (Figma TOOL): a panel with the page title and a glass card beside it. */
export function PageHero({
  tone = "blue",
  tag,
  crumb,
  title,
  sub,
  after,
  card,
}: {
  tone?: "blue" | "paper";
  tag?: string;
  crumb?: ReactNode;
  title: string;
  sub?: string;
  after?: ReactNode;
  card?: ReactNode;
}) {
  const dark = tone === "blue";
  return (
    <Panel tone={tone} labelledBy="page-title" rosetteAt={[0.8, 0.5]}>
      <div
        className={`${WRAP} flex flex-col gap-6 pt-8 pb-7 lg:flex-row lg:items-center lg:justify-between lg:gap-20 lg:py-20`}
      >
        <div
          className={`flex ${card ? "max-w-[592px]" : "w-full"} flex-col items-start gap-3 lg:gap-5`}
        >
          {typeof crumb === "string" ? (
            <p className={`${TYPE.cap} ${muted(dark)}`}>{crumb}</p>
          ) : (
            crumb
          )}
          {tag ? <Tag tone={dark ? "blue" : "paper"}>{tag}</Tag> : null}
          <h1 id="page-title" className={TYPE.hero}>
            {title}
          </h1>
          {sub ? <p className={`${TYPE.body} max-w-[820px] ${muted(dark)}`}>{sub}</p> : null}
          {after}
        </div>
        {card ? <Frost className="w-full lg:w-[480px] lg:shrink-0 lg:p-8">{card}</Frost> : null}
      </div>
    </Panel>
  );
}

/* Section (Figma SEC): white, or a paper or blue panel, with an optional heading. */
export function Section({
  tone = "white",
  id,
  tag,
  title,
  sub,
  rosetteAt = [0.85, 0.5],
  children,
}: {
  tone?: "white" | "paper" | "blue";
  id?: string;
  tag?: string;
  title?: string;
  sub?: string;
  rosetteAt?: [number, number];
  children: ReactNode;
}) {
  const dark = tone === "blue";
  const headingId = id ? `${id}-title` : undefined;
  const heading =
    tag || title || sub ? (
      <div className="flex max-w-[820px] flex-col items-start gap-2.5 lg:gap-4">
        {tag ? <Tag tone={dark ? "blue" : "paper"}>{tag}</Tag> : null}
        {title ? (
          <h2 id={headingId} className={TYPE.h2}>
            {title}
          </h2>
        ) : null}
        {sub ? <p className={`${TYPE.body} ${muted(dark)}`}>{sub}</p> : null}
      </div>
    ) : null;

  if (tone === "white") {
    return (
      <section
        id={id}
        aria-labelledby={headingId}
        className={`${WRAP} flex flex-col gap-6 py-9 lg:gap-12 lg:py-20`}
      >
        {heading}
        {children}
      </section>
    );
  }
  return (
    <Panel tone={tone} labelledBy={headingId} rosetteAt={rosetteAt}>
      <div id={id} className={`${WRAP} flex flex-col gap-6 py-10 lg:gap-12 lg:py-[72px]`}>
        {heading}
        {children}
      </div>
    </Panel>
  );
}

/* Grid of tiles (Figma GRID + TILE). */
const COLS = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
} as const;

export function Grid({ cols, children }: { cols: keyof typeof COLS; children: ReactNode }) {
  return <ul className={`flex flex-col gap-3.5 lg:grid lg:gap-6 ${COLS[cols]}`}>{children}</ul>;
}

export function IconDisc({
  icon,
  dark,
  size = "md",
}: {
  icon: IconName | "spark";
  dark?: boolean;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "size-9" : "size-10 lg:size-12";
  if (icon === "spark") {
    return (
      <span className={`${box} shrink-0`}>
        <Icon name="askx-40" className="size-full" />
      </span>
    );
  }
  return (
    <span
      className={`flex ${box} shrink-0 items-center justify-center rounded-full ${dark ? "bg-white" : "bg-icon-bg"}`}
    >
      <Icon name={icon} className={size === "sm" ? "size-5" : "size-[22px] lg:size-[26.4px]"} />
    </span>
  );
}

export function Tile({
  icon,
  tag,
  big,
  title,
  desc,
  link,
  action,
  dark,
}: {
  icon?: IconName | "spark";
  tag?: string;
  big?: string;
  title: string;
  desc?: string;
  link?: { label: string; href: string };
  /** A button at the foot of the tile (Figma Help centre, "Urgent"). */
  action?: ReactNode;
  dark?: boolean;
}) {
  const box = dark
    ? "shadow-glass rounded-[22px] border border-white/50 bg-white/14 lg:rounded-[26px]"
    : "shadow-tile rounded-[24px] border border-line bg-white lg:rounded-[28px]";
  return (
    <li className={`${box} flex flex-col items-start gap-2.5 p-5 lg:gap-3.5 lg:p-7`}>
      {icon ? <IconDisc icon={icon} dark={dark} /> : null}
      {tag ? <Tag tone={dark ? "blue" : "paper"}>{tag}</Tag> : null}
      {big ? <p className={TYPE.amt}>{big}</p> : null}
      <h3 className={TYPE.h4}>{title}</h3>
      {desc ? <p className={`${TYPE.p} ${muted(dark)}`}>{desc}</p> : null}
      {link ? (
        <ArrowLink href={link.href} tone={dark ? "white" : "accent"}>
          {link.label}
        </ArrowLink>
      ) : null}
      {action ? <div className="mt-auto w-full pt-1.5">{action}</div> : null}
    </li>
  );
}

/* Rows (Figma ROWS): a title and a line, side by side on desktop. */
export function Rows({
  items,
  dark,
  labelWidth = 400,
}: {
  items: readonly (readonly [string, ReactNode])[];
  dark?: boolean;
  labelWidth?: 120 | 200 | 220 | 400;
}) {
  const width = {
    120: "lg:w-[120px]",
    200: "lg:w-[200px]",
    220: "lg:w-[220px]",
    400: "lg:w-[400px]",
  }[labelWidth];
  return (
    <dl>
      {items.map(([title, text]) => (
        <div
          key={title}
          className={`flex flex-col gap-1.5 border-t py-4 lg:flex-row lg:gap-10 lg:py-6 ${dark ? "border-white/28" : "border-[rgb(10_19_56/0.1)]"}`}
        >
          <dt className={`${TYPE.h4} ${width} lg:shrink-0`}>{title}</dt>
          <dd className={`${TYPE.p} ${muted(dark)}`}>{text}</dd>
        </div>
      ))}
    </dl>
  );
}

/* Two columns (Figma COLS). */
export function Columns({
  left,
  right,
  leftWidth = 480,
  top,
}: {
  left: ReactNode;
  right: ReactNode;
  leftWidth?: 420 | 480 | 520;
  top?: boolean;
}) {
  const width = { 420: "lg:w-[420px]", 480: "lg:w-[480px]", 520: "lg:w-[520px]" }[leftWidth];
  return (
    <div
      className={`flex flex-col gap-5 lg:flex-row lg:gap-16 ${top ? "lg:items-start" : "lg:items-center"}`}
    >
      <div className={`flex flex-col gap-3.5 lg:shrink-0 lg:gap-5 ${width}`}>{left}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-3.5 lg:gap-5">{right}</div>
    </div>
  );
}

/* Glass cards (Figma FROST, light, and G, on blue). */
export function Frost({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`shadow-glass-soft text-fg flex flex-col gap-3 rounded-[22px] border border-white/95 bg-white/78 p-5 lg:gap-4 lg:rounded-[26px] lg:p-7 ${className}`}
    >
      {children}
    </div>
  );
}

export function Glass({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`shadow-glass flex flex-col gap-3 rounded-[22px] border border-white/50 bg-white/14 p-5 lg:rounded-[26px] lg:p-7 ${className}`}
    >
      {children}
    </div>
  );
}

/* A numbered step (Figma STEPN). */
export function Steps({
  items,
  dark,
}: {
  items: readonly (readonly [ReactNode, ReactNode?])[];
  dark?: boolean;
}) {
  return (
    <ol className="flex flex-col gap-3.5 lg:gap-5">
      {items.map(([title, desc], index) => (
        <li key={index} className="flex gap-3.5">
          <span
            className={`flex size-7 shrink-0 items-center justify-center rounded-full ${TYPE.lab} text-deep ${dark ? "bg-white" : "bg-icon-bg"}`}
          >
            {index + 1}
          </span>
          <span className="flex flex-col gap-0.5 pt-[3px]">
            <span className={TYPE.h4}>{title}</span>
            {desc ? <span className={`${TYPE.p} ${muted(dark)}`}>{desc}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

/* A label and a value (Figma ROW). */
export function DataRow({
  label,
  value,
  line,
  mono,
  dark,
  tone,
}: {
  label: string;
  value: ReactNode;
  line?: boolean;
  mono?: boolean;
  dark?: boolean;
  tone?: "ok" | "warn";
}) {
  const colour =
    tone === "ok"
      ? "text-success"
      : tone === "warn"
        ? "text-warn-fg"
        : dark
          ? "text-white"
          : "text-fg";
  return (
    <div
      className={`flex items-center gap-3 py-2.5 ${line ? `border-t ${dark ? "border-white/20" : "border-[rgb(10_19_56/0.08)]"}` : ""}`}
    >
      <span className={`${TYPE.small} shrink-0 ${muted(dark)}`}>{label}</span>
      <span className={`flex-1 text-right ${mono ? TYPE.mono : TYPE.small} ${colour}`}>
        {value}
      </span>
    </div>
  );
}

/* A coloured note (Figma NOTE). */
const NOTE_TONES = {
  blue: "bg-info-bg text-deep",
  green: "bg-note-ok-bg text-note-ok",
  amber: "bg-warn-bg text-warn-fg",
  grey: "bg-soft text-muted-fg",
  glass: "bg-white/14 text-white/82",
  red: "bg-[#fdecec] text-[#b42318]",
} as const;

export function Note({
  tone = "grey",
  icon,
  children,
}: {
  tone?: keyof typeof NOTE_TONES;
  icon?: IconName;
  children: ReactNode;
}) {
  return (
    <p
      className={`flex items-start gap-2.5 rounded-[14px] px-3.5 py-3 ${TYPE.small} ${NOTE_TONES[tone]}`}
    >
      {icon ? <Icon name={icon} className="mt-0.5" /> : null}
      <span>{children}</span>
    </p>
  );
}

export function Avatar({ initials, size = 44 }: { initials: string; size?: 32 | 36 | 40 | 44 }) {
  const box = { 32: "size-8", 36: "size-9", 40: "size-10", 44: "size-11" }[size];
  return (
    <span
      aria-hidden="true"
      className={`flex ${box} bg-avatar shrink-0 items-center justify-center rounded-full ${TYPE.lab} text-deep`}
    >
      {initials}
    </span>
  );
}

export function OkBadge() {
  return (
    <span className="bg-ok-bg flex size-12 items-center justify-center rounded-full lg:size-14">
      <Icon name="check" className="size-6" />
    </span>
  );
}

/**
 * Pictures of the app: a field or a button as it looks in the app. They are
 * not controls on this website (it never moves money), so they can't be
 * pressed or typed in.
 */
export function MockField({
  label,
  value,
  icon,
  right,
}: {
  label?: string;
  value: string;
  icon?: IconName;
  right?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {label ? <span className={TYPE.lab}>{label}</span> : null}
      <span className="flex h-[52px] items-center gap-2.5 rounded-[14px] border border-[#d5dce8] bg-white px-4">
        {icon ? <Icon name={icon} className="size-5" /> : null}
        <span className={`flex-1 ${TYPE.p}`}>{value}</span>
        {right ? <span className={`${TYPE.lab} text-accent`}>{right}</span> : null}
      </span>
    </div>
  );
}

export function MockButton({
  label,
  variant = "primary",
}: {
  label: string;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const look = {
    primary: "bg-accent text-white",
    secondary: "border border-fg text-fg",
    ghost: "border border-white/70 text-white",
  }[variant];
  return (
    <span
      aria-hidden="true"
      className={`flex h-[52px] w-full items-center justify-center rounded-full text-[17px] leading-[1.2] font-medium ${look}`}
    >
      {label}
    </span>
  );
}

export function Person({
  initials,
  name,
  handle,
}: {
  initials: string;
  name: string;
  handle: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar initials={initials} />
      <span className="flex flex-col gap-0.5">
        <span className={TYPE.h4}>{name}</span>
        <span className={`${TYPE.cap} text-accent`}>{handle}</span>
      </span>
    </div>
  );
}

/* The film slot (Figma VIDEO). The film isn't made yet. */
export function VideoSlot({ title, length }: { title: string; length: string }) {
  return (
    <figure className="panel-blue relative isolate flex aspect-video w-full items-center justify-center overflow-hidden rounded-[20px] lg:rounded-[28px]">
      <div
        aria-hidden="true"
        className="rosette -z-10 bg-white"
        style={{
          width: "min(800px, 110%)",
          aspectRatio: "1",
          left: "78%",
          top: "50%",
          translate: "-50% -50%",
          opacity: 0.22,
        }}
      />
      <span className="absolute top-4 left-4 lg:top-7 lg:left-8">
        <Tag tone="blue">Film</Tag>
      </span>
      <span
        aria-hidden="true"
        className="flex size-16 items-center justify-center rounded-full bg-white/94 shadow-[0_10px_30px_rgb(10_23_77/0.25)] lg:size-24"
      >
        <span className="border-l-accent ml-1 size-0 border-y-[11px] border-l-[19px] border-y-transparent lg:border-y-[16px] lg:border-l-[28px]" />
      </span>
      <figcaption className="absolute bottom-4 left-4 flex items-center gap-2.5 lg:bottom-8 lg:left-8">
        <span className={TYPE.h4}>{title}</span>
        <Tag tone="blue">{length}</Tag>
        <span className="sr-only">The film is being made and will play here.</span>
      </figcaption>
    </figure>
  );
}

/* Questions (Figma FAQ): the first one open. */
export function Faq({ items }: { items: readonly (readonly [string, ReactNode])[] }) {
  return (
    <div>
      {items.map(([question, answer], index) => (
        <details
          key={question}
          open={index === 0}
          className="group border-t border-[rgb(10_19_56/0.1)] py-[18px] lg:py-6"
        >
          <summary className="focus-visible:outline-accent flex cursor-pointer items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4">
            <span className={`flex-1 ${TYPE.h4}`}>{question}</span>
            <span aria-hidden="true" className={`${TYPE.h3} text-accent group-open:hidden`}>
              +
            </span>
            <span aria-hidden="true" className={`hidden ${TYPE.h3} text-accent group-open:inline`}>
              –
            </span>
          </summary>
          <p className={`pt-2 ${TYPE.p} text-muted-fg`}>{answer}</p>
        </details>
      ))}
    </div>
  );
}

/* A table (Figma TABLE): a real table on desktop, one card per row on phones. */
export function Table({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: readonly string[];
  rows: readonly (readonly string[])[];
}) {
  return (
    <>
      <div className="shadow-tile border-line hidden rounded-[28px] border bg-white px-8 py-2 lg:block">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className={`pt-4 pr-6 pb-3.5 font-normal ${TYPE.cap} text-muted-fg`}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]} className="border-t border-[rgb(10_19_56/0.08)] align-top">
                {row.map((cell, index) =>
                  index === 0 ? (
                    <th key={index} scope="row" className={`py-[18px] pr-6 text-left ${TYPE.h4}`}>
                      {cell}
                    </th>
                  ) : (
                    <td
                      key={index}
                      className={`py-[18px] pr-6 ${TYPE.p} ${index === 1 ? "text-fg" : "text-muted-fg"}`}
                    >
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-3 lg:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li
            key={row[0]}
            className="shadow-tile border-line flex flex-col gap-1 rounded-[24px] border bg-white p-[18px]"
          >
            <h3 className={TYPE.h4}>{row[0]}</h3>
            {row
              .slice(1)
              .map((cell, index) =>
                cell ? (
                  <DataRow
                    key={columns[index + 1]}
                    label={columns[index + 1] ?? ""}
                    value={cell}
                    line
                  />
                ) : null,
              )}
          </li>
        ))}
      </ul>
    </>
  );
}

/* The closing band (Figma CTA). */
export function Cta({
  appUrl,
  title = "Ready when you are.",
  sub = "Get Cyber X on iPhone or Android. Or try the demo in your browser first.",
}: {
  appUrl: string;
  title?: string;
  sub?: string;
}) {
  return (
    <Section tone="blue" id="get-started" title={title} sub={sub} rosetteAt={[0.82, 0.6]}>
      <HeroButtons appUrl={appUrl} />
    </Section>
  );
}

/** Get the app (white) and Try the demo (white outline), for blue panels. */
export function HeroButtons({
  appUrl,
  first = { label: "Get the app", href: "/get-the-app" },
  second,
}: {
  appUrl: string;
  first?: { label: string; href: string };
  second?: { label: string; href: string };
}) {
  const other = second ?? { label: "Try the demo", href: appUrl };
  return (
    <div className="flex w-full flex-col gap-3 pt-2 lg:w-auto lg:flex-row">
      <ButtonLink href={first.href} variant="white" className="w-full lg:w-auto">
        {first.label}
      </ButtonLink>
      <ButtonLink href={other.href} variant="outline-light" className="w-full lg:w-auto">
        {other.label}
      </ButtonLink>
    </div>
  );
}

/* Legal pages: the "In short" card and the text (Figma SHORT and DOC). */
export function InShort({ lines }: { lines: readonly string[] }) {
  return (
    <>
      <h2 className={TYPE.h4}>In short</h2>
      <ul className="flex flex-col gap-3">
        {lines.map((line) => (
          <li key={line} className="flex items-start gap-2.5">
            <span className="bg-ok-bg mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
              <Icon name="check-small" className="size-3" />
            </span>
            <span className={TYPE.p}>{line}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

export type DocPart = readonly [string, ...(string | readonly (readonly [string, string])[])[]];

export function LegalText({ parts }: { parts: readonly DocPart[] }) {
  return (
    <div className="flex max-w-[720px] flex-col gap-3.5 lg:gap-[18px]">
      {parts.map(([heading, ...content]) => (
        <section key={heading} className="flex flex-col gap-3.5 lg:gap-[18px]">
          <h2 className={TYPE.h3}>{heading}</h2>
          {content.map((item, index) =>
            typeof item === "string" ? (
              <p key={index} className={`${TYPE.body} text-muted-fg`}>
                {item}
              </p>
            ) : (
              <Rows key={index} items={item} labelWidth={220} />
            ),
          )}
        </section>
      ))}
    </div>
  );
}

export function LastUpdated({ date }: { date: string }) {
  return <p className={`${TYPE.cap} text-muted-fg`}>Last updated {date}</p>;
}
