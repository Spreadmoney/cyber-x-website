import { SiteLink as Link } from "@/components/site/SiteLink";
import type { ReactNode } from "react";

import { ArrowLink, ButtonLink } from "@/components/site/Button";
import { GlassX } from "@/components/site/GlassX";
import { Icon, type IconName } from "@/components/site/Icon";
import { Panel, Tag, WRAP } from "@/components/site/Panel";
import { href, type PageName } from "@/lib/site/routes";

/**
 * Home (Figma "Home", draft 3): eight parts, in the order Ayora chose.
 * Panels run blue · paper · blue · white · blue · paper · white · blue, so no
 * two blue panels sit next to each other.
 */
export default function HomePage() {
  return (
    <>
      <Opening />
      <TheIdea />
      <BankApp />
      <WhatYouCanDo />
      <WhereItsGoing />
      <WhosBehindIt />
      <Questions />
      <GetStarted />
    </>
  );
}

const H2 =
  "text-[28px] leading-[1.25] font-medium tracking-[-0.14px] lg:text-[48px] lg:leading-[1.1] lg:tracking-[-0.48px]";
const GLASS = "shadow-glass rounded-[24px] border";
const GLASS_LIGHT = `${GLASS} border-white/95 bg-white/72`;
const GLASS_BLUE = `${GLASS} border-white/50 bg-white/14`;

/* 1 · Opening (blue) */
function Opening() {
  return (
    <Panel
      tone="blue"
      labelledBy="home-title"
      rosette={{ size: 560, x: -93, y: 308 }}
      rosetteDesktop={{ size: 900, x: -116, y: -142, from: "right" }}
    >
      <div
        className={`${WRAP} flex flex-col gap-7 pt-9 pb-8 lg:min-h-[584px] lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:py-[72px]`}
      >
        <div className="flex max-w-[536px] flex-col gap-4 lg:gap-6">
          <h1
            id="home-title"
            className="text-[44px] leading-[1.18] font-medium tracking-[-0.44px] lg:text-[64px] lg:leading-[1.05] lg:tracking-[-0.64px]"
          >
            A new financial system, built around people.
          </h1>
          <p className="text-[19px] leading-[1.5] text-white/82 lg:text-[24px] lg:leading-[1.4]">
            Cyber X makes sure your money reaches the right person, for the right reason, and helps
            it grow over time.
          </p>
          <div className="flex flex-col gap-3 pt-2 lg:flex-row">
            <ButtonLink href={href("getTheApp")} variant="white" className="w-full lg:w-auto">
              Get the app
            </ButtonLink>
            <ButtonLink
              href={href("howItWorks")}
              variant="outline-light"
              className="w-full lg:w-auto"
            >
              See how it works
            </ButtonLink>
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <GlassX />
        </div>
      </div>
    </Panel>
  );
}

/* 2 · The idea (paper) */
const FOUR_QUESTIONS = [
  ["Who", "A verified person, never a bare account number."],
  ["Why", "The reason travels with the money."],
  ["How much", "Set by the person being paid. Never more than what’s owed."],
  ["When", "Only when both sides agree. Until then, it’s still yours."],
] as const;

function TheIdea() {
  return (
    <Panel
      tone="paper"
      labelledBy="idea-title"
      rosette={{ size: 560, x: -93, y: 611 }}
      rosetteDesktop={{ size: 860, x: -148, y: -72, from: "right" }}
      rosetteOpacity={0.18}
    >
      <div
        className={`${WRAP} flex flex-col gap-7 py-10 lg:flex-row lg:items-center lg:justify-between lg:gap-[72px] lg:py-[72px]`}
      >
        <div className="flex max-w-[568px] flex-col gap-7 lg:gap-8">
          <div className="flex flex-col items-start gap-3 lg:gap-5">
            <Tag tone="paper">The idea</Tag>
            <h2 id="idea-title" className={H2}>
              Money is not the point. Value is.
            </h2>
            <p className="text-muted-fg text-[17px] leading-[1.5] lg:text-[19px]">
              Today, money moves to a row of digits that can’t tell you who is behind them, or why
              you’re paying. That gap is where fraud lives. On Cyber X, every payment answers four
              questions before it moves.
            </p>
          </div>
          <dl>
            {FOUR_QUESTIONS.map(([question, answer]) => (
              <div
                key={question}
                className="flex gap-4 border-t border-[rgb(10_19_56/0.1)] py-3.5 lg:py-[15px]"
              >
                <dt className="text-accent w-[86px] shrink-0 text-[17px] leading-[1.2] font-medium lg:w-[130px] lg:text-[21px] lg:leading-[1.3]">
                  {question}
                </dt>
                <dd className="text-muted-fg text-[15px] leading-[1.5] lg:text-[17px]">{answer}</dd>
              </div>
            ))}
          </dl>
        </div>
        <OnePayment />
      </div>
    </Panel>
  );
}

function OnePayment() {
  const rows = [
    ["Who", "Kemi Fabrics, verified"],
    ["Why", "Ankara fabric, 6 yards"],
    ["How much", "₦18,500.00"],
    ["When", "Held until it arrives"],
  ] as const;
  return (
    <figure className={`${GLASS_LIGHT} w-full p-5 lg:w-[440px] lg:shrink-0 lg:p-7`}>
      <figcaption className="flex items-center gap-3 pb-3">
        <span className="bg-avatar text-deep flex size-11 shrink-0 items-center justify-center rounded-full text-[13px] leading-[1.2] font-medium">
          KF
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-[17px] leading-[1.2] font-medium lg:text-[21px] lg:leading-[1.3]">
            One payment, four answers
          </span>
          <span className="text-muted-fg text-[13px] leading-[1.4]">
            Bisi buys fabric from Kemi
          </span>
        </span>
      </figcaption>
      <dl className="text-[15px] leading-[1.5]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center gap-3 py-2.5">
            <dt className="text-muted-fg shrink-0">{label}</dt>
            <dd className={`flex-1 text-right ${label === "When" ? "text-success" : ""}`}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="bg-note-ok-bg text-note-ok mt-2 rounded-[14px] px-3.5 py-3 text-[15px] leading-[1.5]">
        Kemi sees “Payment secured” and sends the fabric.
      </p>
    </figure>
  );
}

/* 3 · Your bank app and Cyber X (blue) */
const COMPARE = [
  ["You pay", "An account number", "A verified person"],
  ["Buying from a stranger", "Pay and hope", "Held until it arrives"],
  ["A payment alert", "Easy to fake", "Checked in seconds"],
  ["Money sent to you", "Lands without asking", "Waits for your yes"],
] as const;

function BankApp() {
  return (
    <Panel
      tone="blue"
      labelledBy="bank-title"
      rosette={{ size: 560, x: -93, y: -27 }}
      rosetteDesktop={{ size: 900, x: -241, y: -217, from: "right" }}
    >
      <div className={`${WRAP} flex flex-col gap-6 py-10 lg:gap-10 lg:py-[72px]`}>
        <div className="flex max-w-[760px] flex-col items-start gap-3 lg:gap-5">
          <Tag tone="blue">Why not my bank app?</Tag>
          <h2 id="bank-title" className={H2}>
            Your bank app sends money. Cyber X makes sure of it.
          </h2>
        </div>
        <div className={`${GLASS_BLUE} p-4 lg:p-7`}>
          <div className="grid grid-cols-2 gap-2 pb-3 text-[13px] leading-[1.2] font-medium lg:grid-cols-[240px_1fr_1fr] lg:gap-4">
            <span aria-hidden="true" className="hidden lg:block" />
            <span className="text-white/82">A bank transfer</span>
            <span>Cyber X</span>
          </div>
          {COMPARE.map(([label, bank, cyberx]) => (
            <div
              key={label}
              className="grid grid-cols-2 gap-2 border-t border-white/20 py-3.5 lg:grid-cols-[240px_1fr_1fr] lg:items-center lg:gap-4"
            >
              <p className="col-span-2 text-[13px] leading-[1.4] text-white/82 lg:col-span-1 lg:text-[21px] lg:leading-[1.3] lg:text-white">
                {label}
              </p>
              <p className="rounded-xl bg-white/10 px-3 py-2.5 text-[15px] leading-[1.5] text-white/82">
                <span className="sr-only">A bank transfer: </span>
                {bank}
              </p>
              <p className="text-deep rounded-xl bg-white px-3 py-2.5 text-[15px] leading-[1.5]">
                <span className="sr-only">Cyber X: </span>
                {cyberx}
              </p>
            </div>
          ))}
        </div>
        <p className="text-[15px] leading-[1.5] text-white/82 lg:text-[17px]">
          Keep your bank. Cyber X works beside it.
        </p>
      </div>
    </Panel>
  );
}

/* 4 · What you can do today (white) */
const PRODUCTS: readonly { icon: IconName; title: string; text: string; page: PageName }[] = [
  {
    icon: "send",
    title: "Pay by name",
    text: "Send to an alias like @kemi.fabrics.",
    page: "sendAndReceive",
  },
  {
    icon: "settlements",
    title: "Buy safely",
    text: "Your money is held until your order arrives.",
    page: "features",
  },
  {
    icon: "search",
    title: "Check before you trust",
    text: "Look up a person. Check a payment alert.",
    page: "check",
  },
  {
    icon: "electricity",
    title: "Bills and airtime",
    text: "The name on the account is confirmed first.",
    page: "billsAndAirtime",
  },
  {
    icon: "card",
    title: "Online payments",
    text: "One number per merchant, with a cap you set.",
    page: "onlinePayments",
  },
  {
    icon: "askx-40",
    title: "Ask X",
    text: "Answers about your money, from your own account.",
    page: "askX",
  },
];

function WhatYouCanDo() {
  return (
    <section
      aria-labelledby="today-title"
      className={`${WRAP} flex flex-col gap-5 py-10 lg:gap-10 lg:py-[72px]`}
    >
      <div className="flex items-end justify-between gap-3">
        <h2 id="today-title" className={H2}>
          What you can do today.
        </h2>
        <ArrowLink href={href("features")} className="hidden lg:inline-block">
          See everything Cyber X does
        </ArrowLink>
      </div>
      <ul className="shadow-tile border-line flex flex-col rounded-[24px] border bg-white px-5 py-1.5 lg:grid lg:grid-cols-3 lg:gap-6 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        {PRODUCTS.map((product, index) => (
          <li
            key={product.title}
            className={`lg:shadow-tile lg:border-line lg:rounded-[24px] lg:border lg:bg-white ${index > 0 ? "border-t border-[rgb(10_19_56/0.08)] lg:border-t" : ""}`}
          >
            <Link
              href={href(product.page)}
              className="focus-visible:outline-accent flex items-center gap-3.5 rounded-[24px] py-3.5 focus-visible:outline-2 lg:h-full lg:flex-col lg:items-start lg:gap-3 lg:p-8 lg:pb-10"
            >
              {product.icon === "askx-40" ? (
                <span className="size-10 shrink-0 lg:size-12">
                  <Icon name="askx-40" className="size-full" />
                </span>
              ) : (
                <span className="bg-icon-bg flex size-10 shrink-0 items-center justify-center rounded-full lg:size-12">
                  <Icon name={product.icon} className="size-[22px] lg:size-[26.4px]" />
                </span>
              )}
              <span className="flex flex-col gap-0.5 lg:gap-3">
                <span className="text-[17px] leading-[1.2] font-medium lg:text-[28px] lg:leading-[1.25]">
                  {product.title}
                </span>
                <span className="text-muted-fg text-[15px] leading-[1.5] lg:text-[17px]">
                  {product.text}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <ArrowLink href={href("features")} className="self-start lg:hidden">
        See everything Cyber X does
      </ArrowLink>
    </section>
  );
}

/* 5 · Where it's going (blue, the other way round) */
const ROADMAP = [
  {
    tag: "Today",
    later: false,
    text: "Answers, a weekly summary, and a heads-up before a bill is due.",
  },
  { tag: "Next", later: true, text: "X suggests, you approve. A safety pot for what you keep." },
  { tag: "The long run", later: true, text: "A plan that fits how you earn and spend." },
] as const;

function WhereItsGoing() {
  return (
    <Panel
      tone="blue-reverse"
      labelledBy="going-title"
      rosette={{ size: 560, x: -93, y: 14 }}
      rosetteDesktop={{ size: 900, x: -227, y: -177, from: "right" }}
    >
      <div className={`${WRAP} flex flex-col gap-6 py-10 lg:gap-12 lg:py-[72px]`}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-[72px]">
          <div className="flex max-w-[568px] flex-col items-start gap-3 lg:gap-5">
            <Tag tone="blue">Where it’s going</Tag>
            <h2 id="going-title" className={H2}>
              First, protect what you have. Then, grow it.
            </h2>
            <p className="text-[17px] leading-[1.5] text-white/82 lg:text-[19px]">
              X is the intelligence inside Cyber X. It learns how your money really moves, and its
              help gets sharper over time.
            </p>
          </div>
          <YourWeek />
        </div>
        <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-3 lg:gap-6">
          {ROADMAP.map((card) => (
            <li
              key={card.tag}
              className={`${GLASS_BLUE} flex flex-col gap-2.5 rounded-[20px] p-[18px] lg:p-6`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-[5px] text-[13px] leading-[1.2] font-medium ${card.later ? "bg-white/14 text-white" : "text-fg bg-white"}`}
                >
                  {card.tag}
                </span>
                {card.later ? (
                  <span className="text-[13px] leading-[1.4] text-white/82">Coming later</span>
                ) : null}
              </span>
              <p className="text-[17px] leading-[1.2] font-medium lg:text-[21px] lg:leading-[1.3]">
                {card.text}
              </p>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2 border-t border-white/18 pt-5 lg:pt-7">
          <p className="text-[13px] leading-[1.4] text-white/82">Our twenty-year ambition</p>
          <p className="text-[21px] leading-[1.3] font-medium lg:text-[28px] lg:leading-[1.25]">
            The system people use to hold, move, earn and grow value, with trust built in.
          </p>
        </div>
        <p className="text-[13px] leading-[1.4] text-white/82">
          X never moves money on its own, and it doesn’t give investment advice.
        </p>
      </div>
    </Panel>
  );
}

function YourWeek() {
  const rows = [
    ["Money in", "₦85,000.00"],
    ["Money out", "₦62,400.00"],
    ["Kept", "₦22,600.00"],
  ] as const;
  return (
    <figure className={`${GLASS_BLUE} w-full p-5 lg:w-[440px] lg:shrink-0 lg:p-7`}>
      <figcaption className="flex items-center gap-3 pb-2.5">
        <Icon name="askx-40" />
        <span className="flex flex-col gap-0.5">
          <span className="text-[17px] leading-[1.2] font-medium lg:text-[21px] lg:leading-[1.3]">
            Your week with X
          </span>
          <span className="text-[13px] leading-[1.4] text-white/82">9 to 15 November</span>
        </span>
      </figcaption>
      <dl className="text-[15px] leading-[1.5]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center gap-3 py-2.5">
            <dt className="shrink-0 text-white/82">{label}</dt>
            <dd className="flex-1 text-right">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="bg-warn-bg text-warn-fg mt-2 rounded-[14px] px-3.5 py-3 text-[15px] leading-[1.5]">
        Heads-up: rent is due in 5 days.
      </p>
    </figure>
  );
}

/* 6 · Who's behind it (paper) */
const PROMISES = [
  "We stop fraud before the money moves. We don’t promise refunds.",
  "We never sell your data.",
  "This website never touches your money.",
  "We’ll never ask for your PIN, password or codes.",
];

const HELP: readonly { icon: IconName; label: string; page: PageName }[] = [
  { icon: "freeze", label: "Freeze my account", page: "freeze" },
  { icon: "flag", label: "Report a scam", page: "report" },
  { icon: "check", label: "Check a payment", page: "check" },
];

function WhosBehindIt() {
  return (
    <Panel
      tone="paper"
      labelledBy="behind-title"
      rosette={{ size: 560, x: -93, y: -113 }}
      rosetteDesktop={{ size: 900, x: -283, y: -258 }}
      rosetteOpacity={0.3}
    >
      <div
        className={`${WRAP} flex flex-col gap-7 py-10 lg:flex-row lg:items-start lg:justify-between lg:gap-[72px] lg:py-[72px]`}
      >
        <div className="flex max-w-[548px] flex-col items-start gap-4 lg:gap-6">
          <Tag tone="paper">
            <span id="behind-title">Who’s behind it</span>
          </Tag>
          <blockquote className="border-accent border-l-3 pl-4 text-[21px] leading-[1.3] font-medium lg:pl-6 lg:text-[28px] lg:leading-[1.25]">
            <p>
              “Long before Cyber X had a name, I wanted one thing: a way to pay that fraud can’t get
              into. Everything here grew from that.”
            </p>
          </blockquote>
          <div className="flex items-center gap-3">
            <span className="bg-avatar text-deep flex size-11 shrink-0 items-center justify-center rounded-full text-[13px] leading-[1.2] font-medium">
              AO
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[17px] leading-[1.2] font-medium lg:text-[21px] lg:leading-[1.3]">
                Ayora Okafor
              </span>
              <span className="text-muted-fg text-[13px] leading-[1.4]">
                Founder, Cyber X Technologies
              </span>
            </span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2.5 pt-2">
            <ArrowLink href={href("about")}>Our story</ArrowLink>
            <ArrowLink href={href("team")}>Meet the team</ArrowLink>
            <ArrowLink href={href("blog")}>From the blog</ArrowLink>
          </div>
        </div>
        <div className="flex w-full flex-col gap-4 lg:w-[460px] lg:shrink-0">
          <div className={`${GLASS_LIGHT} p-5 lg:p-7`}>
            <h3 className="text-[17px] leading-[1.2] font-medium lg:text-[21px] lg:leading-[1.3]">
              Our promises
            </h3>
            <ul>
              {PROMISES.map((promise) => (
                <li key={promise} className="flex items-start gap-3 pt-3">
                  <span className="bg-ok-bg flex size-6 shrink-0 items-center justify-center rounded-full">
                    <Icon name="check-small" />
                  </span>
                  <span className="text-[15px] leading-[1.5] lg:text-[17px]">{promise}</span>
                </li>
              ))}
            </ul>
          </div>
          <h3 className="text-[17px] leading-[1.2] font-medium lg:text-[21px] lg:leading-[1.3]">
            Something wrong?
          </h3>
          <ul className="flex flex-wrap gap-2">
            {HELP.map((item) => (
              <li key={item.label}>
                <Link
                  href={href(item.page)}
                  className="border-line hover:bg-paper focus-visible:outline-accent flex items-center gap-2 rounded-full border bg-white py-2.5 pr-4 pl-3 text-[13px] leading-[1.2] font-medium focus-visible:outline-2"
                >
                  <Icon name={item.icon} />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
}

/* 7 · Questions (white) */
const QUESTIONS: readonly { q: string; a: ReactNode }[] = [
  {
    q: "Do I still need my bank account?",
    a: "Yes. You add money from it and withdraw back to it.",
  },
  {
    q: "What do I need to join?",
    a: "Your phone number, your NIN and a selfie taken in the app. You need to be 18 or older.",
  },
  {
    q: "What does it cost?",
    a: (
      <>
        Sending is free up to ₦5,000, ₦10 up to ₦50,000 and ₦50 above, as the CBN’s 2026 guide sets.
        Every fee is shown before you approve.{" "}
        <Link href={href("feesAndLimits")} className="text-accent underline underline-offset-4">
          Fees and limits
        </Link>
      </>
    ),
  },
  {
    q: "Will Cyber X refund me if I’m scammed?",
    a: "No. Cyber X stops fraud before the money moves: it checks who you’re paying and holds the money until your order arrives. It doesn’t promise refunds.",
  },
];

function Questions() {
  return (
    <section
      aria-labelledby="questions-title"
      className={`${WRAP} flex flex-col gap-4 py-10 lg:flex-row lg:justify-between lg:gap-[72px] lg:py-[72px]`}
    >
      <div className="flex flex-col gap-4 lg:w-[320px] lg:shrink-0">
        <h2 id="questions-title" className={H2}>
          Questions.
        </h2>
        <ArrowLink href={href("help")} className="hidden self-start lg:inline-block">
          All questions
        </ArrowLink>
      </div>
      <div className="flex-1 lg:max-w-[688px]">
        {QUESTIONS.map((item, index) => (
          <details
            key={item.q}
            open={index === 0}
            className="group border-t border-[rgb(10_19_56/0.1)] py-[18px] last:border-b"
          >
            <summary className="focus-visible:outline-accent flex cursor-pointer items-center gap-4 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4">
              <span className="flex-1 text-[17px] leading-[1.2] font-medium lg:text-[21px] lg:leading-[1.3]">
                {item.q}
              </span>
              <span
                aria-hidden="true"
                className="text-muted-fg text-[21px] leading-[1.3] font-medium group-open:hidden"
              >
                +
              </span>
              <span
                aria-hidden="true"
                className="text-accent hidden text-[21px] leading-[1.3] font-medium group-open:inline"
              >
                −
              </span>
            </summary>
            <p className="text-muted-fg pt-2 text-[15px] leading-[1.5] lg:text-[17px]">{item.a}</p>
          </details>
        ))}
        <ArrowLink href={href("help")} className="mt-5 inline-block lg:hidden">
          All questions
        </ArrowLink>
      </div>
    </section>
  );
}

/* 8 · Get started (blue) */
const STEPS = ["Get the app", "Verify with your NIN and a selfie", "Choose your alias"];

function GetStarted() {
  return (
    <Panel
      tone="blue"
      labelledBy="start-title"
      rosette={{ size: 560, x: -93, y: 35 }}
      rosetteDesktop={{ size: 900, x: 246, y: -160 }}
    >
      <div
        className={`${WRAP} flex flex-col items-center gap-5 py-12 text-center lg:gap-8 lg:py-[72px]`}
      >
        <h2
          id="start-title"
          className="text-[44px] leading-[1.18] font-medium tracking-[-0.44px] text-balance lg:text-[56px] lg:tracking-[-0.56px]"
        >
          Your money.
          <br />
          Going only where you send it.
        </h2>
        <ol className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:justify-center">
          {STEPS.map((step, index) => (
            <li
              key={step}
              className={`${GLASS_BLUE} flex items-center gap-2.5 rounded-full py-2 pr-[18px] pl-2 text-left`}
            >
              <span className="text-deep flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-[13px] leading-[1.2] font-medium">
                {index + 1}
              </span>
              <span className="text-[13px] leading-[1.2] font-medium">{step}</span>
            </li>
          ))}
        </ol>
        <p className="text-[17px] leading-[1.5] text-white/82 lg:text-[19px]">
          On iPhone and Android.
        </p>
        <ButtonLink href={href("getTheApp")} variant="white" className="w-full lg:w-auto">
          Get the app
        </ButtonLink>
      </div>
    </Panel>
  );
}
