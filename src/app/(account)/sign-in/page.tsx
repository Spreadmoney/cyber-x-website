import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignInFlow } from "@/components/auth/SignInFlow";
import { Grid, Tile } from "@/components/kit/Kit";
import { WRAP } from "@/components/site/Panel";
import { safeNext } from "@/lib/auth/rules";
import { getMe } from "@/lib/auth/session";
import { readQuery } from "@/lib/content/query";
import { href } from "@/lib/site/routes";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to protect your Cyber X account from any browser.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** W2.1 and W2.2 (Figma Sign in). Signed in already: on to where they were going. */
export default async function SignInPage({ searchParams }: Props) {
  const next = safeNext(readQuery((await searchParams).next));
  if (await getMe()) redirect(next);
  return (
    <>
      <SignInFlow
        next={next}
        title="Sign in."
        sub="Protect your account from any browser. Your balance and payments stay in the app."
        checklist={[
          "Freeze your account if your phone is lost.",
          "See where you’re signed in, and sign out.",
          "Report a payment that went wrong.",
        ]}
        note="We’ll never ask for your Payment PIN on this website."
      />
      <div className={`${WRAP} pt-6 pb-10 lg:pt-8 lg:pb-16`}>
        <Grid cols={2}>
          <Tile
            level={2}
            title="New to Cyber X?"
            desc="Get the app on iPhone or Android and sign up in a few minutes."
            link={{ label: "Get the app", href: href("getTheApp") }}
          />
          <Tile
            level={2}
            title="No phone at all?"
            desc="Dial the Cyber X USSD code from any phone and choose Freeze."
            link={{ label: "Freeze my account", href: href("freeze") }}
          />
        </Grid>
      </div>
    </>
  );
}
