import type { IconName } from "@/components/site/Icon";
import { href } from "@/lib/site/routes";

/** Blog topics (Figma: All · Safety · Product · Money · Inside Cyber X). */
export const BLOG_TOPICS = {
  safety: {
    name: "Safety",
    sub: "How scams work, and how to stay a step ahead of them.",
    cta: "Stay a step ahead.",
  },
  product: {
    name: "Product",
    sub: "What Cyber X can do today, and how to get the most from it.",
    cta: "Try it for yourself.",
  },
  money: {
    name: "Money",
    sub: "Fees, limits and the rules behind how money moves in Nigeria.",
    cta: "Put it into practice.",
  },
  "inside-cyber-x": {
    name: "Inside Cyber X",
    sub: "Why we build Cyber X the way we do.",
    cta: "Join us early.",
  },
} as const;

export type BlogTopic = keyof typeof BLOG_TOPICS;
export const BLOG_TOPIC_KEYS = Object.keys(BLOG_TOPICS) as BlogTopic[];

/** Help topics (Figma Help centre, "Browse by topic"). */
export const HELP_TOPICS = {
  "getting-started": {
    name: "Getting started",
    desc: "Sign up, verify and choose your alias.",
    icon: "phone",
  },
  paying: {
    name: "Paying and getting paid",
    desc: "Aliases, requests, splits and money that waits.",
    icon: "send",
  },
  "pay-me-safely": {
    name: "Pay me safely",
    desc: "Buying and selling with your money held.",
    icon: "check",
  },
  "add-and-withdraw": {
    name: "Add and withdraw",
    desc: "Your account number, cards, agents and banks.",
    icon: "bank",
  },
  security: {
    name: "Security and your account",
    desc: "Biometrics, your PIN, freezing and recovery.",
    icon: "lock",
  },
  "fees-and-limits": {
    name: "Fees and limits",
    desc: "What things cost and how much you can move.",
    icon: "card",
  },
} as const satisfies Record<string, { name: string; desc: string; icon: IconName }>;

export type HelpTopic = keyof typeof HELP_TOPICS;
export const HELP_TOPIC_KEYS = Object.keys(HELP_TOPICS) as HelpTopic[];

/** The buttons a post or article can end with. */
export const ACTIONS = {
  report: { label: "Report a scam", href: () => href("report") },
  check: { label: "Check a payment", href: () => href("check") },
  freeze: { label: "Freeze my account", href: () => href("freeze") },
} as const;

export type Action = keyof typeof ACTIONS;
export const ACTION_KEYS = Object.keys(ACTIONS) as Action[];

export const COVER_ICONS = [
  "flag",
  "id-card",
  "check",
  "freeze",
  "bank",
  "spark",
  "send",
  "lock",
  "card",
  "phone",
  "chat",
  "clock",
  "calendar",
  "settlements",
  "electricity",
  "stop",
  "add",
  "camera",
  "search",
] as const satisfies readonly (IconName | "spark")[];

export type CoverIcon = (typeof COVER_ICONS)[number];
export type CoverKind = "blue" | "deep" | "paper";
