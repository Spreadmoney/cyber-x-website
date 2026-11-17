import type { Metadata } from "next";

import { SignInFlow } from "@/components/auth/SignInFlow";
import { Crumbs } from "@/components/content/Parts";
import { Grid, Note, PageHero, TYPE, Tile } from "@/components/kit/Kit";
import { Button, ButtonLink } from "@/components/site/Button";
import { Icon } from "@/components/site/Icon";
import { WRAP } from "@/components/site/Panel";
import { freezeMyAccount } from "@/lib/auth/actions";
import { getMe } from "@/lib/auth/session";
import { href } from "@/lib/site/routes";

export const metadata: Metadata = {
  title: "Freeze my account",
  description: "Lost your phone? Sign in to stop money leaving your Cyber X account straight away.",
};

function Item({ icon, children }: { icon: "stop" | "check-small"; children: string }) {
  return (
    <li className={`flex items-center gap-3 ${TYPE.p}`}>
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-full ${icon === "stop" ? "bg-[#fdecec]" : "bg-note-ok-bg"}`}
      >
        <Icon name={icon} className="size-4" />
      </span>
      {children}
    </li>
  );
}

/**
 * W2.5 (Figma Freeze my account, Confirm). Signed out: sign in first, then
 * confirm. The freeze is the app's own, so it works on every phone at once.
 */
export default async function FreezePage() {
  const me = await getMe();
  if (!me) {
    return (
      <>
        <SignInFlow
          next="/freeze"
          crumb={<Crumbs dark items={[["Security", href("security")], ["Freeze my account"]]} />}
          title="Freeze your account."
          sub="Lost your phone? Sign in to stop money leaving your account straight away."
          checklist={[
            "Takes under a minute.",
            "Works without your phone.",
            "Money coming in still arrives.",
          ]}
          note="This website never shows your balance or moves money."
        />
        <div className={`${WRAP} pt-6 pb-10 lg:pt-8 lg:pb-16`}>
          <Grid cols={2}>
            <Tile
              level={2}
              title="No phone at all?"
              desc="Dial the Cyber X USSD code from any phone and choose Freeze."
            />
            <Tile
              level={2}
              title="Paid a scammer?"
              desc="Freeze first, then tell us what happened."
              link={{ label: "Report a scam", href: href("report") }}
            />
          </Grid>
        </div>
      </>
    );
  }

  return (
    <PageHero
      crumb={`Signed in as ${me.alias ? `@${me.alias}` : me.cyberxId}`}
      title="Freeze your account?"
      sub="Do this if your phone is lost or stolen, or someone else may know your PIN."
      card={
        <div className="flex flex-col gap-4">
          <h2 className={TYPE.h4}>This stops straight away:</h2>
          <ul className="flex flex-col gap-3">
            <Item icon="stop">Payments, withdrawals and payment numbers</Item>
            <Item icon="stop">Sign-ins on every phone, including the lost one</Item>
          </ul>
          <h2 className={TYPE.h4}>What still works:</h2>
          <ul className="flex flex-col gap-3">
            <Item icon="check-small">Money coming in still arrives</Item>
          </ul>
          <Note tone="grey">
            To unfreeze, sign in on a phone you trust and do a short video check with our team.
          </Note>
          <form action={freezeMyAccount} className="flex flex-col">
            <Button type="submit" variant="danger">
              Freeze my account
            </Button>
          </form>
          <ButtonLink href="/account" variant="soft">
            Cancel
          </ButtonLink>
        </div>
      }
    />
  );
}
