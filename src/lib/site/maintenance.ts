/**
 * The maintenance switch. When MAINTENANCE_MODE is "on" (in Vercel's
 * settings), every page shows "We're making Cyber X better" instead. The
 * app is not affected: it is a separate site.
 *
 * MAINTENANCE_BACK_BY is the time to show, in words, for example
 * "02:00, 17 November (Lagos time)". Without it the page says "soon".
 */
type Env = Readonly<Record<string, string | undefined>>;

export const MAINTENANCE_PATH = "/maintenance";

export function maintenanceOn(env: Env = process.env): boolean {
  return env.MAINTENANCE_MODE?.trim().toLowerCase() === "on";
}

/** The page to show instead, or null to carry on as normal. */
export function maintenanceRewrite(pathname: string, env: Env = process.env): string | null {
  if (!maintenanceOn(env) || pathname === MAINTENANCE_PATH) return null;
  return MAINTENANCE_PATH;
}

export function maintenanceBackBy(env: Env = process.env): string | null {
  const text = env.MAINTENANCE_BACK_BY?.trim();
  return text ? text.slice(0, 80) : null;
}
