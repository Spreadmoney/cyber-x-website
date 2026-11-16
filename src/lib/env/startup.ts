import { readAddresses } from "./addresses";
import { EnvError, looksLikeLiveKey } from "./guards";

type Env = Readonly<Record<string, string | undefined>>;

/** Settings whose names mark them as keys. Vercel's own settings are left to Vercel. */
const KEY_NAME = /(_KEY|_SECRET|_TOKEN)$/;

/**
 * Refuses any key that looks live. Until Cyber X is licensed to move real
 * money, only test keys are accepted. The error names the setting, never
 * its value.
 */
export function refuseLiveKeys(env: Env): void {
  for (const [name, value] of Object.entries(env)) {
    if (name.startsWith("VERCEL_") || !KEY_NAME.test(name) || !value) continue;
    if (looksLikeLiveKey(value.trim())) {
      throw new EnvError(
        `${name} looks like a live key. The website only accepts test keys for now. Replace it with the test key.`,
      );
    }
  }
}

/** Run before the website builds or starts (next.config.ts). */
export function checkEnvironment(env: Env): void {
  readAddresses(env);
  refuseLiveKeys(env);
}
