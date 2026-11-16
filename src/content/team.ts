/**
 * The team shown on About and as blog authors. The pictures are AI samples
 * Ayora approved for the demo (15 Nov 2026), and four of the five names are
 * made up. The pages say so, and they are replaced before launch.
 */
export const TEAM = {
  ayora: { name: "Ayora Okafor", role: "Founder" },
  emeka: { name: "Emeka Obi", role: "Head of Engineering" },
  ifeoma: { name: "Ifeoma Nwankwo", role: "Head of Risk and Compliance" },
  zainab: { name: "Zainab Bello", role: "Head of Design" },
  seun: { name: "Seun Ogunleye", role: "Head of Partnerships" },
} as const;

export type TeamKey = keyof typeof TEAM;

export const TEAM_KEYS = Object.keys(TEAM) as TeamKey[];

export const photoOf = (key: TeamKey) => `/team/sample-${key}.jpg`;
