import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Note, PageHero, Steps, TYPE, Tile } from "@/components/kit/Kit";
import { ButtonLink } from "@/components/site/Button";
import { Icon } from "@/components/site/Icon";
import { WRAP } from "@/components/site/Panel";
import { getCountryPack } from "@/config/countries";
import { COOKIES, formatMoment, readFrozenNote } from "@/lib/auth/rules";
import { href } from "@/lib/site/routes";

export const metadata: Metadata = {
  title: "Your account is frozen",
  robots: { index: false },
};

/** W2.5 (Figma Frozen). Shown once the freeze is done; the website session has ended. */
export default async function FrozenPage() {
  const note = readFrozenNote((await cookies()).get(COOKIES.frozen)?.value);
  if (!note) redirect(href("freeze"));
  const when = formatMoment(new Date(note.at), getCountryPack().timeZone).replace(", ", " at ");
  return (
    <>
      <PageHero
        crumb={
          <span className="flex size-14 items-center justify-center rounded-full bg-[#fdecec] lg:size-[60px]">
            <Icon name="freeze" className="size-7" />
          </span>
        }
        title="Your account is frozen."
        sub={`Frozen on ${when}, from ${note.browser}. Nothing can leave your account. Money coming in still arrives.`}
        card={
          <div className="flex flex-col gap-4">
            <h2 className={TYPE.h4}>To unfreeze</h2>
            <Steps
              items={[
                ["Get a phone and install Cyber X."],
                ["Sign in, then do a short video check with our team."],
                ["Your account unfreezes when the check passes."],
              ]}
            />
            <Note tone="green">
              Test mode: no SMS is sent yet. Once it is, we’ll tell you by SMS, and by email if you
              added one.
            </Note>
            <ButtonLink href="/" variant="secondary">
              Done
            </ButtonLink>
          </div>
        }
      />
      <div className={`${WRAP} pt-6 pb-10 lg:pt-8 lg:pb-16`}>
        <ul className="flex flex-col">
          <Tile
            title="Paid someone you shouldn’t have?"
            desc="Report it now so we can act on it."
            link={{ label: "Report a scam", href: href("report") }}
          />
        </ul>
      </div>
    </>
  );
}
