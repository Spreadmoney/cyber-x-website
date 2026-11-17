"use client";

import { useState } from "react";

import { Button } from "@/components/site/Button";
import { SiteLink } from "@/components/site/SiteLink";

/** "Share · Copy link" under a post. */
export function CopyLink() {
  const [status, setStatus] = useState("");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus("Link copied.");
    } catch {
      setStatus("Copy the address from your browser’s address bar.");
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <span className="text-muted-fg text-[13px] leading-[1.2] font-medium">Share</span>
      <button
        type="button"
        onClick={copy}
        className="text-accent focus-visible:outline-accent rounded-sm py-1 text-[15px] leading-[1.5] font-medium hover:underline focus-visible:outline-2 lg:text-[17px]"
      >
        Copy link
      </button>
      <span role="status" className="text-success text-[13px] leading-[1.4]">
        {status}
      </span>
    </div>
  );
}

/**
 * "Was this helpful?" (Figma Help article). The answer isn't sent anywhere
 * yet, so the reply only points to more help.
 */
export function Helpful({ contactHref }: { contactHref: string }) {
  const [answer, setAnswer] = useState<"yes" | "no" | null>(null);
  return (
    <div className="shadow-tile border-line flex flex-col gap-3 rounded-[20px] border bg-white p-5 lg:rounded-[24px] lg:p-6">
      <h2 className="text-[17px] leading-[1.2] font-medium lg:text-[21px] lg:leading-[1.3]">
        Was this helpful?
      </h2>
      {answer === null ? (
        <div className="flex gap-2.5">
          <Button variant="soft" size="S" onClick={() => setAnswer("yes")}>
            Yes
          </Button>
          <Button variant="soft" size="S" onClick={() => setAnswer("no")}>
            No
          </Button>
        </div>
      ) : null}
      <p role="status" className="text-[15px] leading-[1.5]">
        {answer === "yes" ? "Glad it helped." : null}
        {answer === "no" ? (
          <>
            Sorry it didn’t. Ask X in the app, or{" "}
            <SiteLink href={contactHref} className="text-accent underline underline-offset-2">
              contact us
            </SiteLink>
            .
          </>
        ) : null}
      </p>
    </div>
  );
}
