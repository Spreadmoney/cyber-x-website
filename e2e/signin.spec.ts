import { generateKeyPairSync, randomBytes } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import {
  PASSWORD,
  accountStatus,
  createAccount,
  db,
  hasDatabase,
  liveAppSessions,
  type TestAccount,
} from "./helpers/accounts";
import { noViolations } from "./helpers/axe";
import { expectNoSidewaysScroll } from "./helpers/site";

/**
 * W2 · Sign in and freeze, both sides together: the website's pages, the
 * website's web functions and the app's own records, in a throwaway
 * database (scripts/db/test-db.mjs).
 */
test.skip(!hasDatabase, "Needs the throwaway test database (E2E_DATABASE_URL).");

const card = (page: Page) => page.locator("main");

// Every test is its own visitor, so one test's wrong answers never pause
// another's sign-in (the website counts them per visitor, by address).
test.beforeEach(async ({ page }) => {
  const part = () => Math.floor(Math.random() * 250) + 1;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `10.${part()}.${part()}.${part()}` });
});

async function fillDetails(page: Page, who: string, password = PASSWORD) {
  await page.getByLabel("Cyber X ID, alias or phone number").fill(who);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
}

/** The code shown in test mode on Check it's you. */
async function testCode(page: Page): Promise<string> {
  const note = page.getByText(/Test mode: no text is sent yet/);
  await expect(note).toBeVisible();
  return (await note.textContent())!.match(/(\d{6})/)![1]!;
}

async function signIn(page: Page, account: TestAccount, from = "/sign-in") {
  await page.goto(from);
  await fillDetails(page, `@${account.alias}`);
  await expect(page.getByRole("heading", { level: 1, name: "Check it’s you." })).toBeVisible();
  await page.getByRole("textbox", { name: "Enter the code" }).fill(await testCode(page));
  await page.getByRole("button", { name: "Continue" }).click();
}

test.describe("Sign in (W2.1)", () => {
  test("a password, then a texted code, opens Your account (never a balance)", async ({ page }) => {
    const ada = await createAccount();
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { level: 1, name: "Sign in." })).toBeVisible();
    await noViolations(page);
    await fillDetails(page, `@${ada.alias}`);
    await expect(
      page.getByText(/We texted a 6-digit code to \+234 80\d •••• \d{3}\./),
    ).toBeVisible();
    await noViolations(page);
    await page.getByRole("textbox", { name: "Enter the code" }).fill(await testCode(page));
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole("heading", { level: 1, name: "Your account." })).toBeVisible();
    await expect(page.getByText(ada.cyberxId)).toBeVisible();
    await expect(card(page)).not.toContainText("₦");
    await expectNoSidewaysScroll(page);
    await noViolations(page);
    // Signing in on the website made no app session (the app's was there already).
    expect(await liveAppSessions(ada.userId)).toBe(1);
  });

  test("a wrong password and an unknown alias get the same answer", async ({ page }) => {
    const ada = await createAccount();
    await page.goto("/sign-in");
    await fillDetails(page, `@${ada.alias}`, "not the right password at all");
    await expect(card(page).getByRole("alert")).toHaveText(
      "That alias or password isn’t right. Check both and try again.",
    );
    await fillDetails(page, "@nobody.has.this");
    await expect(card(page).getByRole("alert")).toHaveText(
      "That alias or password isn’t right. Check both and try again.",
    );
    await noViolations(page);
  });

  test("5 wrong passwords pause sign-in, for the app too", async ({ page }) => {
    const ada = await createAccount();
    await page.goto("/sign-in");
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await fillDetails(page, ada.cyberxId.toLowerCase(), `wrong password number ${attempt}`);
      if (attempt < 4) await expect(card(page).getByRole("alert")).toBeVisible();
    }
    await expect(page.getByRole("heading", { level: 1, name: "Too many tries." })).toBeVisible();
    await expect(page.getByText(/^1[45]:\d\d$/)).toBeVisible();
    await noViolations(page);
    const [guard] =
      await db()`select locked_until > now() as locked from public.signin_guards where user_id = ${ada.userId}`;
    expect(guard!.locked).toBe(true);
  });

  test("a code by text alone, with the number shown back", async ({ page }) => {
    const ada = await createAccount();
    await page.goto("/sign-in");
    await page.getByLabel("Cyber X ID, alias or phone number").fill(ada.localPhone);
    await page.getByRole("button", { name: "Get a code by text" }).click();
    const masked = `+234 ${ada.phone.slice(4, 7)} •••• ${ada.phone.slice(-3)}`;
    await expect(page.getByText(`We texted a 6-digit code to ${masked}.`)).toBeVisible();
    await page.getByRole("textbox", { name: "Enter the code" }).fill("000000");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(card(page).getByRole("alert")).toContainText("That code isn’t right.");
    await page.getByRole("textbox", { name: "Enter the code" }).fill(await testCode(page));
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/account$/);
  });

  test("New to Cyber X? goes to Get the app (W2.6)", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("link", { name: /^Get the app/ }).last()).toHaveAttribute(
      "href",
      "/get-the-app",
    );
  });
});

test.describe("The website's own session (W2.3)", () => {
  test("signing out of the website leaves the app signed in", async ({ page, isMobile }) => {
    const ada = await createAccount();
    await signIn(page, ada);
    await expect(page).toHaveURL(/\/account$/);
    if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("button", { name: "Sign out" }).first().click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/account");
    await expect(page).toHaveURL(/\/sign-in\?next=\/account$/);
    expect(await liveAppSessions(ada.userId)).toBe(1);
  });

  test("Your account can sign the app out on the phone", async ({ page }) => {
    const ada = await createAccount();
    await signIn(page, ada);
    const phone = page.getByRole("listitem").filter({ hasText: "App · Signed in" });
    await phone.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByText("App · Signed out")).toBeVisible();
    expect(await liveAppSessions(ada.userId)).toBe(0);
  });
});

test.describe("Freeze my account (W2.5)", () => {
  test("sign in, confirm, frozen: the app stops, and the website signs out", async ({ page }) => {
    const ada = await createAccount();
    await signIn(page, ada, "/freeze");
    await expect(
      page.getByRole("heading", { level: 1, name: "Freeze your account?" }),
    ).toBeVisible();
    await noViolations(page);
    await page.getByRole("button", { name: "Freeze my account" }).click();
    await expect(page).toHaveURL(/\/freeze\/frozen$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Your account is frozen." }),
    ).toBeVisible();
    await noViolations(page);
    expect(await accountStatus(ada.userId)).toBe("frozen_by_user");
    expect(await liveAppSessions(ada.userId)).toBe(0);
    const [freeze] =
      await db()`select source from public.account_freezes where user_id = ${ada.userId}`;
    expect(freeze!.source).toBe("website");

    await page.goto("/account");
    await expect(page).toHaveURL(/\/sign-in/);
    await fillDetails(page, `@${ada.alias}`);
    await expect(page.getByText(/This account is frozen/).first()).toBeVisible();
  });
});

test.describe("Passkey from the app (W2.2)", () => {
  test("a passkey made for the app signs in on the website", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Chrome's stand-in passkey is a Chromium tool.");
    const ada = await createAccount();
    // A passkey as the app makes one: P-256, kept on the device, for the app's address.
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const jwk = publicKey.export({ format: "jwk" });
    const x = Buffer.from(jwk.x!, "base64url");
    const y = Buffer.from(jwk.y!, "base64url");
    // COSE_Key: {1: 2 (EC2), 3: -7 (ES256), -1: 1 (P-256), -2: x, -3: y}
    const cose = Buffer.concat([
      Buffer.from([0xa5, 0x01, 0x02, 0x03, 0x26, 0x20, 0x01, 0x21, 0x58, 0x20]),
      x,
      Buffer.from([0x22, 0x58, 0x20]),
      y,
    ]);
    const credentialId = randomBytes(16);
    await db()`insert into public.passkeys (user_id, device_id, credential_id, public_key, sign_count)
               values (${ada.userId}, ${ada.deviceId}, ${credentialId.toString("base64url")}, ${cose}, 0)`;

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("WebAuthn.enable");
    const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
      options: {
        protocol: "ctap2",
        transport: "internal",
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
      },
    });
    await cdp.send("WebAuthn.addCredential", {
      authenticatorId,
      credential: {
        credentialId: credentialId.toString("base64"),
        isResidentCredential: true,
        rpId: "localhost",
        privateKey: privateKey.export({ format: "der", type: "pkcs8" }).toString("base64"),
        userHandle: Buffer.from(ada.userId).toString("base64"),
        signCount: 0,
      },
    });

    await page.goto("/sign-in");
    await page.getByRole("button", { name: "Use a passkey instead" }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByText(ada.cyberxId)).toBeVisible();
    const [key] =
      await db()`select sign_count from public.passkeys where credential_id = ${credentialId.toString("base64url")}`;
    expect(Number(key!.sign_count)).toBeGreaterThan(0);
  });
});
