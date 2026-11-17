"use client";

import { useEffect, useState } from "react";

import { Button, ButtonLink } from "@/components/site/Button";
import { CardItem, SystemPage } from "@/components/site/SystemPage";
import { errorReference } from "@/lib/site/errorReference";

/**
 * Something went wrong (Figma "Something went wrong"). It says what to do
 * now, reassures that this website can't move money, and gives a reference
 * that matches the server's log.
 */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;
  const [reference] = useState(() => errorReference(digest));

  useEffect(() => {
    console.error(`Cyber X website error ${reference}`, error);
  }, [error, reference]);

  return (
    <SystemPage
      status={
        <span
          aria-hidden="true"
          className="bg-warn-bg text-warn-fg flex size-14 items-center justify-center rounded-full text-[21px] leading-[1.3] font-medium"
        >
          !
        </span>
      }
      title="Something went wrong on our side."
      text="It’s not you. Try again in a moment. Your money is safe: this website can’t move it."
      actions={
        <>
          <Button onClick={() => retry()} className="w-full lg:w-auto">
            Try again
          </Button>
          <ButtonLink href="/" variant="soft" className="w-full lg:w-auto">
            Go to Home
          </ButtonLink>
        </>
      }
      card={
        <>
          <h2 className="text-[17px] leading-[1.2] font-medium lg:text-[21px] lg:leading-[1.3]">
            Need to act now?
          </h2>
          <div>
            <CardItem title="Freeze by USSD">
              Dial the Cyber X USSD code from any phone and choose Freeze.
            </CardItem>
            <CardItem title="Freeze in the app">Your account settings work as normal.</CardItem>
          </div>
          <div className="flex items-center gap-3 border-t border-[rgb(10_19_56/0.08)] py-2.5 text-[15px]">
            <span className="text-muted-fg leading-[1.5]">Error reference</span>
            <span data-error-reference className="flex-1 text-right font-mono leading-[1.4]">
              {reference}
            </span>
          </div>
        </>
      }
    />
  );
}
