import type { ReactNode } from "react";

import { FIELD } from "@/components/auth/Fields";
import { DataRow, Note, PageHero, Steps, TYPE } from "@/components/kit/Kit";
import { ArrowLink, ButtonLink, buttonClass } from "@/components/site/Button";
import { Icon } from "@/components/site/Icon";
import { initials } from "@/lib/requests/rules";
import type { Order, Screen } from "@/lib/safely/rules";
import { href } from "@/lib/site/routes";

/**
 * The Pay me safely buyer screens (W6; Figma Pay me safely link and its 11
 * states). Built ahead of the app: for now they are only shown for review,
 * where each button goes to the next screen (`to`). W6.1–W6.4 wire them to
 * the app and the payment partner.
 */
type To = (screen: Screen) => string;

function Mark({ tone, children }: { tone: "ok" | "info" | "warn"; children?: ReactNode }) {
  const look = { ok: "bg-[#dff3ec]", info: "bg-info-bg", warn: "bg-[#fdf0d5]" }[tone];
  return (
    <span
      aria-hidden="true"
      className={`flex size-14 items-center justify-center rounded-full lg:size-[60px] ${look}`}
    >
      {children ?? <Icon name="check" className="size-[25px]" />}
    </span>
  );
}

const Tag = ({ children }: { children: ReactNode }) => (
  <p className={`${TYPE.cap} text-muted-fg`}>{children}</p>
);

/** A form for review only: sending it goes to the next screen. */
function NextForm({
  to,
  label,
  children,
  submit,
}: {
  to: string;
  label: string;
  children: ReactNode;
  submit: string;
}) {
  const [path, query] = to.split("?");
  const preview = new URLSearchParams(query).get("preview") ?? "";
  return (
    <form action={path} method="get" aria-label={label} className="flex flex-col gap-4">
      <input type="hidden" name="preview" value={preview} />
      {children}
      <button type="submit" className={buttonClass("primary")}>
        {submit}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] leading-[1.2] font-medium">{label}</span>
      {children}
    </label>
  );
}

/** Kemi Adebayo, @kemi.fabrics · Verified, with her record (on the blue panel). */
function Seller({ order }: { order: Order }) {
  const { seller } = order;
  return (
    <div className="w-full rounded-[20px] border border-white/50 bg-white/14 p-4 shadow-[0_12px_32px_rgba(10,23,77,0.18)]">
      <div className="flex items-center gap-3 pb-2">
        <span
          aria-hidden="true"
          className={`flex size-11 shrink-0 items-center justify-center rounded-full bg-white/18 ${TYPE.lab} text-white`}
        >
          {initials(seller.name)}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className={`${TYPE.h4} text-white`}>{seller.name}</span>
          <span className={`${TYPE.cap} text-white/82`}>@{seller.alias} · Verified</span>
        </span>
      </div>
      <DataRow dark label="On Cyber X since" value={seller.since} />
      <DataRow dark label="Protected sales" value={String(seller.sales)} />
      <DataRow dark label="Scam reports" value={<span className="text-[#c8f7e1]">None</span>} />
    </div>
  );
}

/** The order's progress: done, now, next (Figma order timeline). */
function Timeline({ items }: { items: readonly (readonly [string, string, boolean])[] }) {
  return (
    <ol className="flex flex-col gap-3.5">
      {items.map(([title, detail, done]) => (
        <li key={title} className="flex gap-3.5">
          <span
            aria-hidden="true"
            className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${done ? "bg-[#dff3ec]" : "border-[1.5px] border-[#c9d0dc] bg-white"}`}
          >
            {done ? <Icon name="check-small" className="size-3.5" /> : null}
          </span>
          <span className="flex flex-col gap-0.5">
            <span className={TYPE.h4}>
              {title}
              {done ? <span className="sr-only"> (done)</span> : null}
            </span>
            <span className={`${TYPE.small} text-muted-fg`}>{detail}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function OrderHead({ order }: { order: Order }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className={`${TYPE.h4} lg:text-[21px]`}>{order.item}</h2>
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className={`bg-avatar text-deep flex size-8 items-center justify-center rounded-full ${TYPE.cap} font-medium`}
        >
          {initials(order.seller.name)}
        </span>
        <span className={`${TYPE.small} text-muted-fg`}>
          From {order.seller.name} · @{order.seller.alias}
        </span>
      </div>
      <DataRow line label="Held by Cyber X" value={order.amount} />
    </div>
  );
}

/**
 * Review only: where the buyer goes next when it isn't a button on this
 * screen (a texted link, or the seller sending the order). Not in Figma.
 */
function ReviewNext({ href: target, children }: { href: string; children: ReactNode }) {
  return (
    <p
      className={`${TYPE.cap} text-muted-fg rounded-[14px] border border-dashed border-[#9aa3b2] px-3.5 py-2.5`}
    >
      For review, next: <ArrowLink href={target}>{children}</ArrowLink>
    </p>
  );
}

const getTheApp = (
  <ButtonLink href={href("getTheApp")} variant="soft">
    Get Cyber X for next time
  </ButtonLink>
);

export function SafelyScreen({
  screen,
  order,
  to,
  appUrl,
}: {
  screen: Screen;
  order: Order;
  to: To;
  appUrl: string;
}) {
  const { seller, buyer } = order;
  switch (screen) {
    case "link":
      return (
        <PageHero
          tag="Pay me safely"
          title={`Pay ${seller.first} safely.`}
          sub="Your money is held until your order arrives."
          after={<Seller order={order} />}
          card={
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <p className={`${TYPE.cap} text-muted-fg`}>You’re paying for</p>
                <p className="text-[21px] leading-[1.3] font-medium">{order.item}</p>
                <p className="text-[40px] leading-[1.1] font-medium tracking-[-0.4px]">
                  {order.amount}
                </p>
                <p className={`${TYPE.small} text-muted-fg`}>
                  {seller.first} sends it within {order.sendWithinDays} days of your payment.
                </p>
              </div>
              <Steps
                items={[
                  ["Your money is held.", `It doesn’t go to ${seller.first} yet.`],
                  [`${seller.first} sees “Payment secured”`, "and sends your order."],
                  ["You confirm it arrived", `then ${seller.first} is paid.`],
                ]}
              />
              <Note tone="green">
                If she doesn’t send it in time, your money comes back to you.
              </Note>
              <ButtonLink href={`${appUrl}/s/${encodeURIComponent(order.code)}`} variant="primary">
                Pay with the Cyber X app
              </ButtonLink>
              <ButtonLink href={to("pay_by_card")} variant="soft">
                Pay by card
              </ButtonLink>
            </div>
          }
        />
      );
    case "pay_by_card":
      return (
        <PageHero
          tone="paper"
          crumb={<Tag>Pay me safely</Tag>}
          title={`Pay ${order.amount} by card.`}
          sub={`To ${seller.name} for ${order.item}. Your money is held until you confirm it arrived.`}
          card={
            <NextForm to={to("held")} label="Pay by card" submit="Continue to secure payment">
              <Field label="Your name">
                <input
                  name="name"
                  autoComplete="name"
                  defaultValue={buyer.name}
                  className={FIELD}
                />
              </Field>
              <Field label="Your phone number">
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  defaultValue={buyer.phone}
                  className={FIELD}
                />
                <span className={`${TYPE.cap} text-muted-fg`}>
                  We’ll text you a link to confirm delivery. {seller.first} never sees your number.
                </span>
              </Field>
              <Note tone="grey" icon="lock">
                Next, you’ll enter your card on our payment partner’s secure page. Cyber X never
                sees your full card number.
              </Note>
              <DataRow label="Total" value={order.amount} />
            </NextForm>
          }
        />
      );
    case "held":
      return (
        <PageHero
          tone="paper"
          crumb={<Mark tone="ok" />}
          title="Your payment is held."
          sub={`${seller.first} has been told “Payment secured” and can now send your order.`}
          card={
            <div className="flex flex-col gap-4">
              <p className="text-[40px] leading-[1.1] font-medium tracking-[-0.4px]">
                {order.amount}
              </p>
              <h2 className={TYPE.h4}>What happens next</h2>
              <Steps
                items={[
                  [`We’ve texted a link to ${buyer.masked}.`],
                  [
                    "When your order arrives, open the link and tap “It arrived”.",
                    `${seller.first} is paid then.`,
                  ],
                  [
                    `If ${seller.first} doesn’t send it by ${order.sendBy}, your money goes back to your card.`,
                  ],
                ]}
              />
              <DataRow line label="Reference" value={order.reference} mono />
              {getTheApp}
              <ReviewNext href={to("open_order")}>Open the texted link</ReviewNext>
            </div>
          }
        />
      );
    case "open_order":
      return (
        <PageHero
          tone="paper"
          title="Open your order."
          sub={`We just texted a 6-digit code to ${buyer.masked}. It keeps your order private.`}
          card={
            <NextForm to={to("waiting")} label="Open your order" submit="Open my order">
              <Field label="Enter the code">
                <input
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  className={`${FIELD} text-center font-mono text-[28px] tracking-[0.5em] lg:h-16`}
                />
              </Field>
              <p className={`${TYPE.cap} text-muted-fg`}>Resend code in 0:45</p>
            </NextForm>
          }
        />
      );
    case "waiting":
      return (
        <PageHero
          tone="paper"
          title="Your order."
          sub={`${seller.first} has your payment secured and is getting it ready.`}
          card={
            <div className="flex flex-col gap-4">
              <OrderHead order={order} />
              <Timeline
                items={[
                  ["Paid and held", order.paidAt, true],
                  [`${seller.first} sends it`, `By ${order.sendBy}`, false],
                  ["You confirm it arrived", `Then ${seller.first} is paid`, false],
                ]}
              />
              <Note tone="grey">
                You can cancel until {seller.first} sends it. If she doesn’t send it by{" "}
                {order.sendBy}, your money goes back to your card by itself.
              </Note>
              <ButtonLink href={to("cancel")} variant="soft">
                Cancel my order
              </ButtonLink>
              <ReviewNext href={to("sent")}>Once {seller.first} sends it</ReviewNext>
            </div>
          }
        />
      );
    case "cancel":
      return (
        <PageHero
          tone="paper"
          title="Cancel your order?"
          sub={`${order.amount} goes back to your card and ${seller.first} is told. It can take a few days to show, depending on your bank.`}
          card={
            <div className="flex flex-col gap-4">
              <div>
                <DataRow label="Order" value={order.item} />
                <DataRow line label="Back to your card" value={order.amount} />
              </div>
              <ButtonLink href={to("cancelled")} variant="danger">
                Cancel order
              </ButtonLink>
              <ButtonLink href={to("waiting")} variant="soft">
                Keep my order
              </ButtonLink>
            </div>
          }
        />
      );
    case "cancelled":
      return (
        <PageHero
          tone="paper"
          crumb={<Mark tone="info" />}
          title="Order cancelled."
          sub={`${seller.first} has been told. It can take a few days to show in your bank account, depending on your bank.`}
          card={
            <div className="flex flex-col gap-4">
              <p>
                <span className="block text-[40px] leading-[1.1] font-medium tracking-[-0.4px]">
                  {order.amount}
                </span>
                <span className={`${TYPE.small} text-muted-fg`}>
                  is on its way back to your card
                </span>
              </p>
              {getTheApp}
            </div>
          }
        />
      );
    case "sent":
      return (
        <PageHero
          tone="paper"
          title="Your order is on its way."
          sub={`Tell us when it arrives, and ${seller.first} is paid.`}
          card={
            <div className="flex flex-col gap-4">
              <OrderHead order={order} />
              <Timeline
                items={[
                  ["Paid and held", order.paidAt, true],
                  [`Sent by ${seller.first}`, order.sentAt, true],
                  ["You confirm it arrived", `${seller.first} is paid when you do`, false],
                ]}
              />
              <Note tone="grey">
                From {seller.first}: “{order.sellerNote}”
              </Note>
              <p className={`${TYPE.cap} text-muted-fg`}>
                If you don’t reply by {order.autoPayBy}, {seller.first} is paid.
              </p>
              <ButtonLink href={to("did_it_arrive")} variant="primary">
                It arrived
              </ButtonLink>
              <ButtonLink href={to("whats_wrong")} variant="soft">
                Something’s wrong
              </ButtonLink>
            </div>
          }
        />
      );
    case "did_it_arrive":
      return (
        <PageHero
          tone="paper"
          title="Did your order arrive?"
          sub={`${seller.first} will be paid ${order.amount} straight away. Only say yes if you have it and it’s what you ordered.`}
          card={
            <div className="flex flex-col gap-4">
              <Note tone="amber">You can’t undo this.</Note>
              <ButtonLink href={to("paid")} variant="primary">
                Yes, it arrived
              </ButtonLink>
              <ButtonLink href={to("sent")} variant="soft">
                Not yet
              </ButtonLink>
            </div>
          }
        />
      );
    case "paid":
      return (
        <PageHero
          tone="paper"
          crumb={<Mark tone="ok" />}
          title={`${seller.first} has been paid.`}
          sub={`Thanks for confirming, ${buyer.first}. Your order is complete. We’ve texted you a receipt.`}
          card={
            <div className="flex flex-col gap-4">
              <div>
                <DataRow label={`Paid to ${seller.first}`} value={order.amount} />
                <DataRow line label="For" value={order.item} />
                <DataRow line label="Reference" value={order.reference} mono />
              </div>
              {getTheApp}
            </div>
          }
        />
      );
    case "whats_wrong":
      return (
        <PageHero
          tone="paper"
          title="What’s wrong?"
          sub={`Your money stays held while we look into it. ${seller.first} is told and can reply.`}
          card={
            <NextForm to={to("report_received")} label="What’s wrong?" submit="Send to Cyber X">
              <fieldset className="flex flex-col gap-2">
                <legend className="sr-only">What’s wrong?</legend>
                {["It didn’t arrive", "Wrong item", "Damaged", "Something else"].map(
                  (reason, i) => (
                    <label
                      key={reason}
                      className="has-checked:border-accent has-checked:bg-info-bg/40 has-focus-visible:outline-accent flex min-h-12 cursor-pointer items-center gap-3 rounded-[14px] border border-[#d5dce8] bg-white px-4 py-3 text-base has-focus-visible:outline-2 has-focus-visible:outline-solid lg:text-[15px]"
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={reason}
                        defaultChecked={i === 1}
                        className="checked:border-accent size-5 shrink-0 appearance-none rounded-full border border-[#c9d0dc] bg-white outline-none checked:border-[6px]"
                      />
                      {reason}
                    </label>
                  ),
                )}
              </fieldset>
              <Field label="Tell us more">
                <textarea
                  name="more"
                  rows={3}
                  defaultValue="It’s 4 yards, not 6."
                  className={`${FIELD} h-auto min-h-24 py-3.5`}
                />
              </Field>
              <div className="flex flex-col gap-2">
                <span className="text-[13px] leading-[1.2] font-medium">Photos</span>
                <div className="grid grid-cols-2 gap-3">
                  {(["Take a photo", "Add from gallery"] as const).map((label) => (
                    <label
                      key={label}
                      className={`${buttonClass("soft")} has-focus-visible:outline-accent cursor-pointer px-3 text-[15px] has-focus-visible:outline-2 has-focus-visible:outline-solid`}
                    >
                      {label}
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        capture={label === "Take a photo" ? "environment" : undefined}
                        className="sr-only"
                      />
                    </label>
                  ))}
                </div>
                <span className={`${TYPE.cap} text-muted-fg`}>Up to 5 photos of what you got.</span>
              </div>
            </NextForm>
          }
        />
      );
    case "report_received":
      return (
        <PageHero
          tone="paper"
          crumb={<Mark tone="ok" />}
          title="We’ve got your report."
          sub={`Your ${order.amount} stays held.`}
          card={
            <div className="flex flex-col gap-4">
              <DataRow label="Reference" value={order.reportReference} mono />
              <Note tone="grey">
                We’ll text you within 24 hours, and tell you what {seller.first} says. Keep the
                fabric and its packaging until this is settled.
              </Note>
              <ButtonLink href={to("sent")} variant="soft">
                Back to my order
              </ButtonLink>
            </div>
          }
        />
      );
  }
}
