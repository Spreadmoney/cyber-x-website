// Copied from Codebase (src/config/countries/ng.ts) by `npm run sync:shared`. Change it there, then sync. Never edit it here.

import type { CountryPack } from "./types";

/** Naira amounts below are written in naira and stored in kobo. */
const naira = (amount: number) => amount * 100;

/**
 * Nigeria, the first country pack.
 *
 * Tier limits are the Central Bank of Nigeria's limits for mobile money
 * wallets: circular BPS/DIR/GEN/CIR/04/007 (September 2017), repeated in the
 * Guidelines on Mobile Money Services in Nigeria (July 2021), section 16.
 * The CBN can change them, so the partner bank confirms them before launch.
 *
 * The new-phone cap is the CBN instant-payment rule in force from 1 July 2026.
 */
export const NG: CountryPack = {
  code: "NG",
  name: "Nigeria",
  currency: {
    code: "NGN",
    symbol: "₦",
    decimals: 2,
    groupSeparator: ",",
    decimalSeparator: ".",
  },
  timeZone: "Africa/Lagos",
  phone: {
    dialCode: "+234",
    nationalNumberLength: 10,
    groups: [3, 3, 4],
    // Every Nigerian mobile network: 070x, 080x, 081x, 090x, 091x.
    mobilePrefixes: ["70", "80", "81", "90", "91"],
    example: "8012345678",
  },
  regulator: {
    name: "Central Bank of Nigeria",
    shortName: "CBN",
  },
  identity: {
    nationalIdNumber: { name: "NIN", digits: 11 },
    bankIdNumber: { name: "BVN", digits: 11 },
  },
  tiers: [
    {
      id: 1,
      name: "Tier 1",
      summary: "NIN and a selfie",
      requirements: ["national_id_number", "selfie"],
      dailyLimit: naira(50_000),
      maxBalance: naira(300_000),
    },
    {
      id: 2,
      name: "Tier 2",
      summary: "BVN and a few questions",
      requirements: ["bank_id_number", "account_questions"],
      dailyLimit: naira(200_000),
      maxBalance: naira(500_000),
    },
    {
      id: 3,
      name: "Tier 3",
      summary: "ID and proof of address",
      requirements: ["id_document", "proof_of_address", "source_of_funds"],
      dailyLimit: naira(5_000_000),
      maxBalance: null,
    },
  ],
  newDeviceCap: {
    amount: naira(20_000),
    hours: 24,
  },
};
