// Copied from Codebase (src/config/countries/types.ts) by `npm run sync:shared`. Change it there, then sync. Never edit it here.

import type { Currency, MinorUnits } from "@/lib/money";

/**
 * A country pack holds everything that changes from one country to the next:
 * currency, ID checks, verification levels and limits, phone format and the
 * regulator. The core of Cyber X (IDs, ledger, fraud checks, design system)
 * reads these values and never hard-codes naira, NIN, BVN or the CBN.
 */
export interface CountryPack {
  /** ISO 3166-1 alpha-2 code, for example "NG". */
  readonly code: string;
  readonly name: string;
  readonly currency: Currency;
  /** The IANA time zone times are shown in, for example "Africa/Lagos". */
  readonly timeZone: string;
  readonly phone: PhoneFormat;
  readonly regulator: Regulator;
  readonly identity: IdentityNumbers;
  /** Verification levels, lowest first. */
  readonly tiers: readonly Tier[];
  /** The cap on sending from a newly activated phone. */
  readonly newDeviceCap: NewDeviceCap;
}

export interface PhoneFormat {
  /** International dialling code with the plus sign, for example "+234". */
  readonly dialCode: string;
  /** Digits in the number after the dialling code, without a leading zero. */
  readonly nationalNumberLength: number;
  /** How the number is spaced for reading, for example [3, 3, 4] → 801 234 5678. */
  readonly groups: readonly number[];
  /** The first digits of a mobile number (after the dialling code). */
  readonly mobilePrefixes: readonly string[];
  /** A made-up number shown as the placeholder, digits only. */
  readonly example: string;
}

export interface Regulator {
  readonly name: string;
  readonly shortName: string;
}

/** The ID numbers this country checks, under the names people know them by. */
export interface IdentityNumbers {
  readonly nationalIdNumber: IdNumber;
  readonly bankIdNumber: IdNumber;
}

export interface IdNumber {
  readonly name: string;
  readonly digits: number;
}

export type TierId = 1 | 2 | 3;

export interface Tier {
  readonly id: TierId;
  /** The name people see, for example "Tier 2". */
  readonly name: string;
  /** The one-line summary shown on the Verification level screen. */
  readonly summary: string;
  /** The checks a person passes to reach this level, in order. */
  readonly requirements: readonly Requirement[];
  /** The most that can leave the wallet in one day. */
  readonly dailyLimit: MinorUnits;
  /** The most the wallet can hold, or null when there is no limit. */
  readonly maxBalance: MinorUnits | null;
}

/**
 * A check a person passes. Each country names its own ID numbers (NIN and BVN
 * in Nigeria); the other checks are shared.
 */
export type Requirement =
  | "national_id_number"
  | "selfie"
  | "bank_id_number"
  | "account_questions"
  | "id_document"
  | "proof_of_address"
  | "source_of_funds";

export interface NewDeviceCap {
  readonly amount: MinorUnits;
  readonly hours: number;
}
