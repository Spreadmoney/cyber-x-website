import Image from "next/image";
import { SiteLink as Link } from "@/components/site/SiteLink";

/** The Cyber X wordmark (Figma "Logo"), as exported. It links to Home. */
export function LogoLink() {
  return (
    <Link
      href="/"
      className="focus-visible:outline-accent flex shrink-0 items-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      <Image
        src="/brand/logo.svg"
        alt="Cyber X, Home"
        width={132}
        height={16}
        unoptimized
        priority
        className="h-[15.4px] w-[132px]"
      />
    </Link>
  );
}
