import { Avatar, Note, PageHero, TYPE } from "@/components/kit/Kit";
import { ArrowLink, ButtonLink } from "@/components/site/Button";
import { Icon } from "@/components/site/Icon";
import { appRequestUrl, firstName, initials, type RequestView } from "@/lib/requests/rules";
import { href } from "@/lib/site/routes";

/** Who is asking: avatar, name, alias, Verified (Figma request card). */
function Requester({ name, alias, dark }: { name: string; alias: string; dark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {dark ? (
        <span
          aria-hidden="true"
          className={`flex size-12 shrink-0 items-center justify-center rounded-full bg-white/18 ${TYPE.lab} text-white`}
        >
          {initials(name)}
        </span>
      ) : (
        <Avatar initials={initials(name)} size={44} />
      )}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={`${TYPE.h4} ${dark ? "text-white" : ""}`}>{name}</span>
        <span className={`${TYPE.cap} ${dark ? "text-white/82" : "text-muted-fg"}`}>
          @{alias} · Verified
        </span>
      </span>
    </div>
  );
}

function SentTo({ alias, line }: { alias: string; line?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 py-2.5 ${line ? "border-t border-[rgb(10_19_56/0.08)]" : ""}`}
    >
      <span className={`${TYPE.small} text-muted-fg shrink-0`}>Sent to</span>
      <span className={`${TYPE.small} flex-1 text-right`}>@{alias}</span>
    </div>
  );
}

function Status({ tone }: { tone: "ok" | "wait" | "warn" }) {
  const look = { ok: "bg-[#dff3ec]", wait: "bg-info-bg", warn: "bg-[#fdf0d5] text-[#8a5a00]" }[
    tone
  ];
  return (
    <span
      aria-hidden="true"
      className={`flex size-14 items-center justify-center rounded-full text-2xl font-medium lg:size-[60px] ${look}`}
    >
      {tone === "ok" ? <Icon name="check" className="size-[25px]" /> : null}
      {tone === "wait" ? <Icon name="clock" className="size-[26px]" /> : null}
      {tone === "warn" ? "!" : null}
    </span>
  );
}

/**
 * A payment request link (W5; Figma Payment request link, Paid, Expired,
 * Cancelled, Not a real link). Never the amount or what it's for.
 */
export function RequestPage({ view, appUrl }: { view: RequestView; appUrl: string }) {
  if (view.state === "not_real") {
    return (
      <PageHero
        tone="paper"
        crumb={<Status tone="warn" />}
        title="This isn’t a real Cyber X link."
        sub="Don’t pay anything it asks for, and don’t share your PIN or codes."
        card={
          <div className="flex flex-col gap-4">
            <Note tone="amber">
              Real Cyber X links always show who sent them, and the amount only ever appears inside
              the app.
            </Note>
            <ButtonLink href={href("report")} variant="primary">
              Report a scam
            </ButtonLink>
            <ArrowLink href="/blog/five-scams">How to spot a fake</ArrowLink>
          </div>
        }
      />
    );
  }

  const { from, sentTo, code } = view;
  if (view.state === "open") {
    return (
      <PageHero
        tag="Payment request"
        title={`${firstName(from.name)} sent you a request.`}
        sub="Open it in the Cyber X app to see what it’s for, and pay if you agree."
        after={
          <div className="w-full rounded-[20px] border border-white/50 bg-white/14 p-4 shadow-[0_12px_32px_rgba(10,23,77,0.18)]">
            <Requester name={from.name} alias={from.alias} dark />
          </div>
        }
        card={
          <div className="flex flex-col gap-4">
            <SentTo alias={sentTo} />
            <Note tone="grey" icon="lock">
              The amount and what it’s for appear in the app, once it checks who’s signed in. We
              never show them on the web, because links get forwarded.
            </Note>
            <ButtonLink href={appRequestUrl(appUrl, code)} variant="primary">
              Open in the Cyber X app
            </ButtonLink>
            <p
              className={`${TYPE.small} text-muted-fg flex flex-wrap items-center justify-center gap-x-1.5`}
            >
              Not on this phone? <ArrowLink href={href("getTheApp")}>Get the app</ArrowLink>
            </p>
            <p className={`${TYPE.cap} text-muted-fg text-center`}>
              Only pay requests from people you know.
            </p>
          </div>
        }
      />
    );
  }

  type Copy = { tone: "ok" | "wait"; title: string; sub: string };
  const copy: Copy = (
    {
      paid: { tone: "ok", title: "Paid in full.", sub: "Nothing more to pay on this request." },
      expired: {
        tone: "wait",
        title: "This request has expired.",
        sub: `Ask ${from.name} to send a new one if you still owe it.`,
      },
      cancelled: {
        tone: "wait",
        title: `${firstName(from.name)} cancelled this request.`,
        sub: "There’s nothing to pay.",
      },
    } satisfies Record<typeof view.state, Copy>
  )[view.state];
  return (
    <PageHero
      tone="paper"
      crumb={<Status tone={copy.tone} />}
      title={copy.title}
      sub={copy.sub}
      card={
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <Requester name={from.name} alias={from.alias} />
            <SentTo alias={sentTo} line />
          </div>
          {view.state === "paid" ? (
            <ButtonLink href={appUrl} variant="soft">
              Open the app
            </ButtonLink>
          ) : (
            <ArrowLink href={href("getTheApp")}>Get the app</ArrowLink>
          )}
        </div>
      }
    />
  );
}
