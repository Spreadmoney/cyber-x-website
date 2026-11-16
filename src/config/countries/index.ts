// Copied from Codebase (src/config/countries/index.ts) by `npm run sync:shared`. Change it there, then sync. Never edit it here.

import { NG } from "./ng";
import type { CountryPack, Tier, TierId } from "./types";

export type {
  CountryPack,
  IdentityNumbers,
  IdNumber,
  NewDeviceCap,
  PhoneFormat,
  Regulator,
  Requirement,
  Tier,
  TierId,
} from "./types";

const PACKS = { NG } as const satisfies Record<string, CountryPack>;

export type CountryCode = keyof typeof PACKS;

/** Cyber X launches in Nigeria; other countries are added as new packs. */
export const DEFAULT_COUNTRY: CountryCode = "NG";

export const SUPPORTED_COUNTRIES = Object.keys(PACKS) as CountryCode[];

export function isCountryCode(code: string): code is CountryCode {
  return Object.hasOwn(PACKS, code);
}

export function getCountryPack(code: CountryCode = DEFAULT_COUNTRY): CountryPack {
  return PACKS[code];
}

export function getTier(pack: CountryPack, id: TierId): Tier {
  const tier = pack.tiers.find((candidate) => candidate.id === id);
  if (!tier) {
    throw new Error(`${pack.name} has no verification level ${id}.`);
  }
  return tier;
}
