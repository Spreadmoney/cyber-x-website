import "server-only";

/**
 * Texting the sign-in code. SIMULATED for the demo, as in the app (M1,
 * decided 14 Nov 2026): no message is sent, and the code is shown on the
 * screen under a "Test mode" label. When real SMS (Termii) is switched on in
 * the app, the same switch is made here.
 */
export const SMS_SIMULATED = true;

export async function deliverCode(
  _phone: string,
  code: string,
): Promise<{ showOnScreen?: string }> {
  return SMS_SIMULATED ? { showOnScreen: code } : {};
}
