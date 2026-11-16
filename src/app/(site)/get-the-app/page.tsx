import type { Metadata } from "next";
import { headers } from "next/headers";

import { ArrowLink, ButtonLink } from "@/components/site/Button";
import { Icon, type IconName } from "@/components/site/Icon";
import { Panel, Tag, WRAP } from "@/components/site/Panel";
import { StoreButton, StoreLink, type Store } from "@/components/site/StoreButton";
import { readAddresses } from "@/lib/env/addresses";
import { platformFrom, type Platform } from "@/lib/site/platform";
import { qrSvg } from "@/lib/site/qr";
import { href } from "@/lib/site/routes";

export const metadata: Metadata = {
  title: "Get the app",
  description: "Get Cyber X on iPhone and Android, or try the demo in your browser.",
};

/**
 * Get the app (Figma "Get the app"). An iPhone leads with the App Store, an
 * Android phone with Google Play; desktop shows a QR code and both. Sign-up
 * itself happens in the app; this page explains the steps.
 */
const WORDS: Record<Platform, { first: Store; biometrics: string; phone: string }> = {
  ios: {
    first: "apple",
    biometrics: "Turn on Face ID. A password backs it up.",
    phone: "iOS 16 or later for Face ID sign-in. Older iPhones use a password.",
  },
  android: {
    first: "google",
    biometrics: "Use your fingerprint or face. A password backs it up.",
    phone: "Android 9 or later for fingerprint sign-in. Older phones use a password.",
  },
  other: {
    first: "apple",
    biometrics: "Face ID or your fingerprint, with a password as backup.",
    phone:
      "iPhone with iOS 16 or later, or Android 9 or later, for biometric sign-in. Older phones use a password.",
  },
};

const NEEDS: readonly { icon: IconName; text: string }[] = [
  { icon: "phone", text: "Your phone number" },
  { icon: "id-card", text: "Your NIN" },
  { icon: "camera", text: "A selfie, taken in the app" },
  { icon: "calendar", text: "To be 18 or older" },
];

export default async function GetTheAppPage() {
  const platform = platformFrom((await headers()).get("user-agent"));
  const words = WORDS[platform];
  const { appUrl, websiteUrl } = readAddresses();
  const qr = await qrSvg(`${websiteUrl}${href("getTheApp")}`);
  const other: Store = words.first === "apple" ? "google" : "apple";

  const steps = [
    { title: "Confirm your phone number", text: "We text you a code." },
    { title: "Sign in with biometrics", text: words.biometrics },
    {
      title: "Choose your alias",
      text: "The name people pay, like @kemi.fabrics. You can change it later in Profile.",
    },
    { title: "Verify who you are", text: "Your NIN and a selfie. Then you can send and receive." },
  ];

  return (
    <>
      {/* Get Cyber X (blue) */}
      <Panel
        tone="blue"
        labelledBy="get-title"
        rosette={{ size: 520, x: -73, y: 247 }}
        rosetteDesktop={{ size: 900, x: -172, y: -234, from: "right" }}
      >
        <div
          className={`${WRAP} flex flex-col gap-6 pt-8 pb-7 lg:min-h-[555px] lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:py-20`}
        >
          <div className="flex max-w-[592px] flex-col items-start gap-3 lg:gap-5">
            <span className="inline-flex rounded-full bg-white/16 px-3.5 py-1.5 text-[13px] leading-[1.2] font-medium">
              Get the app
            </span>
            <h1
              id="get-title"
              className="text-[44px] leading-[1.18] font-medium tracking-[-0.44px] lg:text-[64px] lg:leading-[1.05] lg:tracking-[-0.64px]"
            >
              Get Cyber X.
            </h1>
            <p className="text-[17px] leading-[1.5] text-white/82 lg:text-[19px]">
              On iPhone and Android. Sign up in minutes with your NIN and a selfie.
            </p>
            {/* Phones: the right store first, the other as a line of text */}
            <div className="flex w-full flex-col gap-3 lg:hidden">
              <StoreButton store={words.first} demoUrl={appUrl} className="w-full" />
              <StoreLink store={other} demoUrl={appUrl} />
            </div>
            {/* Desktop: both stores */}
            <div className="hidden gap-3 pt-2 lg:flex">
              <StoreButton store="apple" demoUrl={appUrl} />
              <StoreButton store="google" demoUrl={appUrl} />
            </div>
          </div>

          {/* Phones: try the demo here */}
          <div className="shadow-glass-soft text-fg flex flex-col gap-4 rounded-[24px] border border-white/95 bg-white/78 p-5 lg:hidden">
            <h2 className="text-[17px] leading-[1.2] font-medium">Try it first</h2>
            <p className="text-muted-fg text-[15px] leading-[1.5]">
              See Cyber X before you install. The demo runs in your browser with test money.
            </p>
            <ButtonLink href={appUrl} className="w-full">
              Try the demo
            </ButtonLink>
            <p className="bg-soft text-muted-fg rounded-[14px] px-3.5 py-3 text-[15px] leading-[1.5]">
              Demo only. No real money moves.
            </p>
          </div>

          {/* Desktop: scan with your phone */}
          <figure className="shadow-glass-soft text-fg hidden w-[480px] shrink-0 flex-col items-center gap-6 rounded-[24px] border border-white/95 bg-white/78 p-8 lg:flex">
            <figcaption className="w-full text-[21px] leading-[1.3] font-medium">
              Scan to get the app
            </figcaption>
            <div
              role="img"
              aria-label="QR code that opens this page on your phone"
              className="size-[184px] rounded-[16px] bg-white p-4 [&>svg]:size-full"
              dangerouslySetInnerHTML={{ __html: qr }}
            />
            <p className="text-muted-fg text-center text-[17px] leading-[1.5]">
              Point your phone’s camera at the code.
            </p>
          </figure>
        </div>
      </Panel>

      {/* How sign-up works (white) */}
      <section
        aria-labelledby="signup-title"
        className={`${WRAP} flex flex-col gap-6 py-9 lg:gap-12 lg:py-20`}
      >
        <div className="flex flex-col items-start gap-2.5 lg:gap-5">
          <Tag tone="paper">Sign up</Tag>
          <h2
            id="signup-title"
            className="text-[28px] leading-[1.25] font-medium tracking-[-0.14px] lg:text-[48px] lg:leading-[1.1] lg:tracking-[-0.48px]"
          >
            How sign-up works.
          </h2>
        </div>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
          <ol className="flex max-w-[520px] flex-col gap-3.5 lg:gap-6">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-3.5">
                <span className="bg-icon-bg text-deep flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] leading-[1.2] font-medium">
                  {index + 1}
                </span>
                <span className="flex flex-col gap-0.5 pt-[3px]">
                  <span className="text-[17px] leading-[1.2] font-medium lg:text-[21px] lg:leading-[1.3]">
                    {step.title}
                  </span>
                  <span className="text-muted-fg text-[15px] leading-[1.5] lg:text-[17px]">
                    {step.text}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <div className="shadow-glass-soft flex w-full flex-col gap-3 rounded-[22px] border border-white/95 bg-white/78 p-5 lg:w-[500px] lg:shrink-0 lg:p-7">
            <h3 className="text-[17px] leading-[1.2] font-medium lg:text-[21px] lg:leading-[1.3]">
              What you’ll need
            </h3>
            <ul className="flex flex-col gap-3">
              {NEEDS.map((need) => (
                <li key={need.text} className="flex items-center gap-3">
                  <span className="bg-icon-bg flex size-9 shrink-0 items-center justify-center rounded-full">
                    <Icon name={need.icon} className="size-[19.8px]" />
                  </span>
                  <span className="text-[15px] leading-[1.5] lg:text-[17px]">{need.text}</span>
                </li>
              ))}
            </ul>
            <p className="bg-info-bg text-deep rounded-[14px] px-3.5 py-3 text-[15px] leading-[1.5]">
              You start at Tier 1: send up to ₦50,000 a day and keep up to ₦300,000. Add your BVN
              later to raise your limits.
            </p>
          </div>
        </div>
      </section>

      {/* Before you install (paper) */}
      <Panel
        tone="paper"
        labelledBy="before-title"
        rosette={{ size: 520, x: 77, y: -88 }}
        rosetteDesktop={{ size: 900, x: -287, y: -178, from: "right" }}
      >
        <div className={`${WRAP} flex flex-col gap-6 py-10 lg:gap-12 lg:py-[72px]`}>
          <div className="flex flex-col items-start gap-2.5 lg:gap-5">
            <Tag tone="paper">Good to know</Tag>
            <h2
              id="before-title"
              className="text-[28px] leading-[1.25] font-medium tracking-[-0.14px] lg:text-[48px] lg:leading-[1.1] lg:tracking-[-0.48px]"
            >
              <span className="lg:hidden">Before you install.</span>
              <span className="hidden lg:inline">Try it before you install.</span>
            </h2>
            <p className="text-muted-fg hidden text-[19px] leading-[1.5] lg:block">
              The demo runs in your browser with test money. No real money moves.
            </p>
            <div className="hidden pt-5 lg:block">
              <ButtonLink href={appUrl}>Try the demo</ButtonLink>
            </div>
          </div>
          <dl>
            {[
              ["Your phone", words.phone],
              [
                "Already have Cyber X?",
                "Sign in on this website to protect your account from any browser.",
              ],
            ].map(([title, text]) => (
              <div
                key={title}
                className="flex flex-col gap-1.5 border-t border-[rgb(10_19_56/0.1)] py-4 lg:flex-row lg:gap-10 lg:py-6"
              >
                <dt className="text-[17px] leading-[1.2] font-medium lg:w-[400px] lg:shrink-0 lg:text-[21px] lg:leading-[1.3]">
                  {title}
                </dt>
                <dd className="text-muted-fg text-[15px] leading-[1.5] lg:text-[17px]">{text}</dd>
              </div>
            ))}
          </dl>
          <ArrowLink href={href("signIn")} className="self-start">
            Sign in
          </ArrowLink>
        </div>
      </Panel>
    </>
  );
}
