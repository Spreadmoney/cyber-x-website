import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Avatar, DataRow, PageHero, TYPE, Table } from "@/components/kit/Kit";
import { Button, ButtonLink } from "@/components/site/Button";
import { Icon, type IconName } from "@/components/site/Icon";
import { WRAP } from "@/components/site/Panel";
import { SiteLink } from "@/components/site/SiteLink";
import { getCountryPack } from "@/config/countries";
import { signOutPhone } from "@/lib/auth/actions";
import { formatMoment, tierLabel } from "@/lib/auth/rules";
import { getMe } from "@/lib/auth/session";
import { accountPlaces, accountSignins } from "@/lib/auth/store";
import { href } from "@/lib/site/routes";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false },
};

const CARD =
  "shadow-tile border-line flex flex-col gap-4 rounded-[24px] border bg-white p-5 lg:rounded-[28px] lg:p-6";

function Disc({ icon, tone = "bg-icon-bg" }: { icon: IconName; tone?: string }) {
  return (
    <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${tone}`}>
      <Icon name={icon} className="size-5" />
    </span>
  );
}

function Globe() {
  return (
    <span className="bg-icon-bg flex size-10 shrink-0 items-center justify-center rounded-full">
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17M12 3.5c2.4 2.6 3.5 5.4 3.5 8.5s-1.1 5.9-3.5 8.5c-2.4-2.6-3.5-5.4-3.5-8.5s1.1-5.9 3.5-8.5Z" />
      </svg>
    </span>
  );
}

function LinkRow({
  icon,
  title,
  text,
  to,
}: {
  icon: IconName;
  title: string;
  text: string;
  to: string;
}) {
  return (
    <li className="border-line border-b last:border-b-0">
      <SiteLink href={to} className="group flex items-center gap-3 py-3.5">
        <Disc icon={icon} />
        <span className="flex flex-1 flex-col gap-0.5">
          <span className={`${TYPE.p} text-accent font-medium group-hover:underline`}>{title}</span>
          <span className={`${TYPE.cap} text-muted-fg`}>{text}</span>
        </span>
        <span aria-hidden="true" className="text-muted-fg">
          ›
        </span>
      </SiteLink>
    </li>
  );
}

function Pill({ children, tone }: { children: ReactNode; tone: "green" | "blue" | "grey" }) {
  const look = {
    green: "bg-note-ok-bg text-note-ok",
    blue: "bg-info-bg text-deep",
    grey: "bg-soft text-muted-fg",
  }[tone];
  return (
    <span className={`rounded-full px-2.5 py-1 text-[13px] leading-[1.2] ${look}`}>{children}</span>
  );
}

/** W2.4 (Figma Your account). What a signed-in person sees: never a balance. */
export default async function AccountPage() {
  const me = await getMe();
  if (!me) redirect(`${href("signIn")}?next=/account`);
  const [places, signins] = await Promise.all([
    accountPlaces(me.sessionHash),
    accountSignins(me.sessionHash, 5),
  ]);
  const zone = getCountryPack().timeZone;

  return (
    <>
      <PageHero
        title="Your account."
        sub="Protect your account from any browser. Your balance and payments stay in the app."
        card={
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Avatar initials={me.initials} />
              <div className="flex flex-col">
                <span className={TYPE.h4}>{me.name}</span>
                {me.alias ? (
                  <span className={`${TYPE.small} text-muted-fg`}>@{me.alias}</span>
                ) : null}
              </div>
            </div>
            <div>
              <DataRow label="Cyber X ID" value={me.cyberxId} mono line />
              <DataRow label="Verification level" value={tierLabel(me.tier)} line />
              <DataRow label="Phone number" value={me.maskedPhone ?? "On your account"} line />
            </div>
          </div>
        }
      />

      <div className={`${WRAP} flex flex-col gap-4 py-8 lg:gap-6 lg:py-14`}>
        <section aria-labelledby="lost" className={`${CARD} lg:flex-row lg:items-center lg:gap-6`}>
          <Disc icon="freeze" tone="bg-warn-bg" />
          <div className="flex flex-1 flex-col gap-1">
            <h2 id="lost" className={TYPE.h3}>
              Lost your phone?
            </h2>
            <p className={`${TYPE.p} text-muted-fg`}>
              Freeze your account now. Money going out and sign-ins stop on every device. Money
              coming in still arrives. You unfreeze it in the app with a video check.
            </p>
          </div>
          <ButtonLink href={href("freeze")} variant="danger">
            Freeze my account
          </ButtonLink>
        </section>

        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
          <section aria-labelledby="where" className={CARD}>
            <div className="flex flex-col gap-1">
              <h2 id="where" className={TYPE.h4}>
                Where you’re signed in
              </h2>
              <p className={`${TYPE.small} text-muted-fg`}>
                Cyber X works on one phone at a time. Signing in on a new phone signs this one out.
              </p>
            </div>
            <ul>
              {places.map((place) => (
                <li
                  key={place.id}
                  className="border-line flex items-center gap-3 border-b py-3 last:border-b-0"
                >
                  {place.kind === "phone" ? <Disc icon="phone" /> : <Globe />}
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className={TYPE.p}>{place.label}</span>
                    <span className={`${TYPE.cap} text-muted-fg`}>
                      {place.kind === "phone"
                        ? `App · ${place.signedIn ? "Signed in" : "Signed out"}`
                        : "Website"}
                    </span>
                  </span>
                  {place.kind === "phone" && place.signedIn ? (
                    <form action={signOutPhone}>
                      <input type="hidden" name="phone" value={place.id} />
                      <Button type="submit" variant="quiet" size="S">
                        Sign out
                      </Button>
                    </form>
                  ) : null}
                  {place.thisBrowser ? <Pill tone="green">This browser</Pill> : null}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="protect" className={CARD}>
            <div className="flex flex-col gap-1">
              <h2 id="protect" className={TYPE.h4}>
                Protect your account
              </h2>
              <p className={`${TYPE.small} text-muted-fg`}>Something feels wrong? Start here.</p>
            </div>
            <ul>
              <LinkRow
                icon="flag"
                title="Report a scam"
                text="Someone tricked you, or tried to."
                to={href("report")}
              />
              <LinkRow
                icon="check"
                title="Check a payment"
                text="See if a receipt or an alert is real."
                to={href("check")}
              />
              <LinkRow
                icon="phone"
                title="Help with a lost phone"
                text="What to do in the first ten minutes."
                to="/help/how-do-i-freeze-my-account"
              />
            </ul>
          </section>
        </div>

        <section aria-labelledby="recent" className="flex flex-col gap-4 pt-4">
          <h2 id="recent" className={TYPE.h3}>
            Recent sign-ins
          </h2>
          <Table
            caption="Recent sign-ins"
            columns={["When", "Device", "Signed in on"]}
            rows={signins.map((signin) => [
              formatMoment(signin.at, zone),
              signin.label,
              signin.place === "app" ? "App" : "Website",
            ])}
          />
          <p className={`${TYPE.small} text-muted-fg`}>
            Don’t recognise one? Freeze your account, then contact us.
          </p>
        </section>

        <p
          className={`bg-info-bg text-deep self-center rounded-full px-5 py-3 text-center ${TYPE.small}`}
        >
          The website never shows your balance or moves money. Use the app for that.
        </p>
      </div>
    </>
  );
}
