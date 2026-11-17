import type { Metadata } from "next";

import { ArrowLink, ButtonLink } from "@/components/site/Button";
import { Tag } from "@/components/site/Panel";
import { SystemPage } from "@/components/site/SystemPage";
import { href } from "@/lib/site/routes";

export const metadata: Metadata = { title: "Page not found" };

/** Error 404 (Figma "Page not found"). Warns not to pay a link that led here. */
export default function NotFound() {
  return (
    <SystemPage
      status={<Tag tone="paper">Error 404</Tag>}
      title="This page isn’t here."
      text="It may have moved, or the link may be wrong. If a payment link brought you here, don’t pay it."
      card={
        <>
          <h2 className="text-[17px] leading-[1.2] font-medium lg:text-[21px] lg:leading-[1.3]">
            Looking for something?
          </h2>
          <ButtonLink href={href("help")} variant="soft" className="w-full">
            Search Help
          </ButtonLink>
          <div className="flex flex-col gap-3 border-t border-[rgb(10_19_56/0.1)] pt-4">
            <ArrowLink href={href("freeze")}>Freeze my account</ArrowLink>
            <ArrowLink href={href("check")}>Check a payment</ArrowLink>
            <ArrowLink href={href("report")}>Report a scam</ArrowLink>
          </div>
        </>
      }
    />
  );
}
