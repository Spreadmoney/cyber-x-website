import Link from "next/link";
import type { ComponentProps } from "react";

import { isBuilt } from "@/lib/site/routes";

/**
 * next/link, except that pages from later stages are not fetched ahead of
 * time: until they are built there is nothing to fetch.
 */
export function SiteLink(props: ComponentProps<typeof Link>) {
  const target = typeof props.href === "string" ? props.href : (props.href.pathname ?? "/");
  return <Link {...props} prefetch={isBuilt(target) ? props.prefetch : false} />;
}
