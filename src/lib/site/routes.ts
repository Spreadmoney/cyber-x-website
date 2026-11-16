/**
 * Every page of the website, by name. Links are written from this list, so a
 * page's address is typed in one place only.
 *
 * `built` says whether the page exists yet. Pages that come in later stages
 * (W2 to W8) are linked already; until they are built, their links lead to
 * the "This page isn't here" page.
 */
export const PAGES = {
  home: { href: "/", built: true },
  getTheApp: { href: "/get-the-app", built: true },
  signIn: { href: "/sign-in", built: false },
  freeze: { href: "/freeze", built: false },
  check: { href: "/check", built: false },
  report: { href: "/report", built: false },
  features: { href: "/features", built: false },
  howItWorks: { href: "/how-it-works", built: false },
  security: { href: "/security", built: false },
  about: { href: "/about", built: false },
  team: { href: "/about#team", built: false },
  sendAndReceive: { href: "/send-and-receive", built: false },
  billsAndAirtime: { href: "/bills-and-airtime", built: false },
  onlinePayments: { href: "/online-payments", built: false },
  addAndWithdraw: { href: "/add-and-withdraw", built: false },
  askX: { href: "/ask-x", built: false },
  feesAndLimits: { href: "/fees-and-limits", built: false },
  blog: { href: "/blog", built: false },
  help: { href: "/help", built: false },
  contact: { href: "/contact", built: false },
  careers: { href: "/careers", built: false },
  privacy: { href: "/privacy", built: false },
  terms: { href: "/terms", built: false },
  cookies: { href: "/cookies", built: false },
  complaints: { href: "/complaints", built: false },
  licences: { href: "/licences", built: false },
} as const;

export type PageName = keyof typeof PAGES;

export const href = (name: PageName): string => PAGES[name].href;

export interface NavLink {
  label: string;
  page: PageName;
}

/** The menu bar's links (RS/Nav · desktop), in order. */
export const NAV: readonly NavLink[] = [
  { label: "Features", page: "features" },
  { label: "How it works", page: "howItWorks" },
  { label: "Security", page: "security" },
  { label: "Help", page: "help" },
  { label: "About", page: "about" },
  { label: "Blog", page: "blog" },
];

/** The footer's link columns (RS/Footer), in order. */
export const FOOTER: readonly { title: string; links: readonly NavLink[] }[] = [
  {
    title: "Individual",
    links: [
      { label: "Features", page: "features" },
      { label: "Send and receive", page: "sendAndReceive" },
      { label: "Bills and airtime", page: "billsAndAirtime" },
      { label: "Online payments", page: "onlinePayments" },
      { label: "Add and withdraw", page: "addAndWithdraw" },
      { label: "Ask X", page: "askX" },
      { label: "Fees and limits", page: "feesAndLimits" },
    ],
  },
  {
    title: "Security",
    links: [
      { label: "How Cyber X checks payments", page: "security" },
      { label: "Report a scam", page: "report" },
      { label: "Freeze my account", page: "freeze" },
      { label: "Check a payment", page: "check" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Help centre", page: "help" },
      { label: "Contact us", page: "contact" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", page: "about" },
      { label: "Blog", page: "blog" },
      { label: "Careers", page: "careers" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", page: "privacy" },
      { label: "Terms", page: "terms" },
      { label: "Cookies", page: "cookies" },
      { label: "Complaints", page: "complaints" },
      { label: "Licences", page: "licences" },
    ],
  },
];

/** Whether the page at this address exists yet (addresses outside the list count as built). */
export function isBuilt(address: string): boolean {
  const path = address.split(/[?#]/)[0] || "/";
  const page = Object.values(PAGES).find((candidate) => candidate.href.split("#")[0] === path);
  return page ? page.built : true;
}
