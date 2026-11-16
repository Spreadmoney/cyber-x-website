import { EnvError } from "./guards";

/**
 * The two Cyber X addresses. There is no domain for the demo, so the app and
 * the website each live on their own vercel.app address, and each needs to
 * know the other's: the website sends people to the app ("Try the demo"),
 * and the app lists the website so a passkey made in the app works here.
 *
 *   APP_URL      the app, e.g. https://cyber-x-eosin.vercel.app
 *   WEBSITE_URL  this website
 *
 * On Vercel both must be set (in both projects). On a laptop or a test
 * machine they default to the two local previews.
 */
export interface Addresses {
  appUrl: string;
  websiteUrl: string;
}

type Env = Readonly<Record<string, string | undefined>>;

const LOCAL = { APP_URL: "http://localhost:3000", WEBSITE_URL: "http://localhost:3001" } as const;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

function readOrigin(name: keyof typeof LOCAL, env: Env, onVercel: boolean): string {
  const raw = env[name]?.trim();
  if (!raw) {
    if (onVercel) {
      throw new EnvError(
        `${name} is not set. Add it to this project's Environment Variables on Vercel, as a full https:// address.`,
      );
    }
    return LOCAL[name];
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new EnvError(`${name} must be a full web address, such as https://example.vercel.app.`);
  }

  const local = LOCAL_HOSTS.has(url.hostname);
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new EnvError(`${name} must start with https:// (plain http is only for localhost).`);
  }
  if (onVercel && local) {
    throw new EnvError(`${name} points at localhost, which visitors can't reach.`);
  }
  if ((url.pathname !== "/" && url.pathname !== "") || url.search || url.hash || url.username) {
    throw new EnvError(`${name} must be the address alone, with nothing after the name.`);
  }
  return url.origin;
}

export function readAddresses(env: Env = process.env): Addresses {
  const onVercel = env.VERCEL === "1";
  const appUrl = readOrigin("APP_URL", env, onVercel);
  const websiteUrl = readOrigin("WEBSITE_URL", env, onVercel);
  if (appUrl === websiteUrl) {
    throw new EnvError("APP_URL and WEBSITE_URL must be two different addresses.");
  }
  return { appUrl, websiteUrl };
}
