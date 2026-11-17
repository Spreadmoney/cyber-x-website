import "server-only";

import { readWho } from "./identity";

/**
 * Texting the sign-in code. SIMULATED for the demo, as in the app (M1,
 * decided 14 Nov 2026): no message is sent. When real SMS (Termii) is
 * switched on in the app, the same switch is made here.
 */
export const SMS_SIMULATED = true;

/**
 * The test numbers (Ayora, 17 Nov 2026): while texts are off, a code is shown
 * on the screen only for these, so a stranger who knows someone's alias or
 * number can't sign in as them. Set in Vercel as SMS_TEST_NUMBERS: numbers
 * written any way the sign-in box accepts, with commas between. A number
 * start followed by * covers every number that begins with it ("+23480*").
 */
export interface TestNumbers {
  exact: Set<string>;
  prefixes: string[];
}

const PREFIX = /^\+\d{4,14}\*$/;

export function readTestNumbers(list: string | undefined): TestNumbers {
  const numbers: TestNumbers = { exact: new Set(), prefixes: [] };
  for (const raw of (list ?? "").split(/[,;\n]/)) {
    const entry = raw.trim().replace(/[\s().-]/g, "");
    if (!entry) continue;
    if (PREFIX.test(entry)) {
      numbers.prefixes.push(entry.slice(0, -1));
      continue;
    }
    const who = readWho(entry);
    if (who?.kind === "phone") numbers.exact.add(who.value);
  }
  return numbers;
}

export function isTestNumber(phone: string, numbers: TestNumbers): boolean {
  return numbers.exact.has(phone) || numbers.prefixes.some((start) => phone.startsWith(start));
}

export async function deliverCode(phone: string, code: string): Promise<{ showOnScreen?: string }> {
  if (!SMS_SIMULATED) return {};
  return isTestNumber(phone, readTestNumbers(process.env.SMS_TEST_NUMBERS))
    ? { showOnScreen: code }
    : {};
}
