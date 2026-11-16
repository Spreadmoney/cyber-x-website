import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/sign-in" }));
const actions = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signInWithCode: vi.fn(),
  resendSignInCode: vi.fn(),
  confirmSignInCode: vi.fn(),
  passkeyOptions: vi.fn(),
  passkeyFinish: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@/lib/auth/actions", () => actions);
const webauthn = vi.hoisted(() => ({ supported: true, start: vi.fn() }));
vi.mock("@simplewebauthn/browser", () => ({
  browserSupportsWebAuthn: () => webauthn.supported,
  startAuthentication: webauthn.start,
}));

import { MESSAGES } from "@/lib/auth/rules";

import { SiteHeader } from "../site/SiteHeader";
import { Field } from "./Fields";
import { SignInFlow } from "./SignInFlow";

const flow = (
  <SignInFlow
    next="/account"
    title="Sign in."
    sub="Protect your account."
    checklist={["Freeze your account if your phone is lost."]}
    note="We’ll never ask for your Payment PIN on this website."
  />
);
const codeState = {
  step: "code",
  number: "+234 801 •••• 678",
  testCode: "481207",
  expiresInMs: 60_000,
  resendInMs: 0,
};

async function submitDetails(who = "@ayora", password = "right password") {
  fireEvent.change(screen.getByLabelText("Cyber X ID, alias or phone number"), {
    target: { value: who },
  });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Continue" })));
}

beforeEach(() => {
  for (const fn of Object.values(actions)) fn.mockReset();
  webauthn.start.mockReset();
  webauthn.supported = true;
});
afterEach(() => vi.useRealTimers());

describe("the sign-in card (W2.1)", () => {
  it("shows what went wrong, and lets the password be seen", async () => {
    actions.signInWithPassword.mockResolvedValue({ step: "details", error: MESSAGES.wrong });
    render(flow);
    expect(screen.getByRole("heading", { level: 1, name: "Sign in." })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    await submitDetails("@ayora", "nope");
    expect(actions.signInWithPassword).toHaveBeenCalledWith("@ayora", "nope");
    expect(screen.getByRole("alert")).toHaveTextContent(MESSAGES.wrong);
  });

  it("asks for the code, then keeps the screen when the code is wrong", async () => {
    actions.signInWithPassword.mockResolvedValue(codeState);
    actions.confirmSignInCode.mockResolvedValue({ step: "code", error: MESSAGES.wrongCode(2) });
    render(flow);
    await submitDetails();
    expect(screen.getByRole("heading", { level: 1, name: "Check it’s you." })).toBeInTheDocument();
    expect(screen.getByText("We texted a 6-digit code to +234 801 •••• 678.")).toBeInTheDocument();
    expect(screen.getByText("481207")).toBeInTheDocument();
    const box = screen.getByRole("textbox", { name: "Enter the code" });
    fireEvent.change(box, { target: { value: "48a1207" } });
    expect(box).toHaveValue("481207");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Continue" })));
    expect(actions.confirmSignInCode).toHaveBeenCalledWith("/account", "481207");
    expect(screen.getByRole("alert")).toHaveTextContent("2 tries left");
    expect(screen.getByText("We texted a 6-digit code to +234 801 •••• 678.")).toBeInTheDocument();
  });

  it("resends a code, and goes back to the other ways", async () => {
    actions.signInWithCode.mockResolvedValue({ ...codeState, number: null, testCode: undefined });
    actions.resendSignInCode.mockResolvedValue({ step: "code", resendInMs: 30_000 });
    render(flow);
    fireEvent.change(screen.getByLabelText("Cyber X ID, alias or phone number"), {
      target: { value: "0801 234 5678" },
    });
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Get a code by text" })),
    );
    expect(actions.signInWithCode).toHaveBeenCalledWith("0801 234 5678");
    expect(
      screen.getByText("We texted a 6-digit code to the number on your account."),
    ).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Resend code" })));
    expect(actions.resendSignInCode).toHaveBeenCalled();
    expect(screen.getByText(/Resend code in 0:/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Use another way to sign in/ }));
    expect(screen.getByRole("heading", { level: 1, name: "Sign in." })).toBeInTheDocument();
  });

  it("pauses with a countdown, then lets them try again", async () => {
    vi.useFakeTimers();
    actions.signInWithPassword.mockResolvedValue({ step: "paused", untilMs: 2000 });
    render(flow);
    await submitDetails();
    expect(screen.getByRole("heading", { level: 1, name: "Too many tries." })).toBeInTheDocument();
    expect(
      screen.getByText("For your safety, signing in is paused for 1 minute."),
    ).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(3000));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByRole("heading", { level: 1, name: "Sign in." })).toBeInTheDocument();
  });

  it("stops, and starts again", async () => {
    actions.signInWithPassword.mockResolvedValue({ step: "stopped", message: MESSAGES.frozen });
    render(flow);
    await submitDetails();
    expect(screen.getByText(MESSAGES.frozen)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start again" }));
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });
});

describe("the passkey button (W2.2)", () => {
  const press = async () =>
    act(async () => fireEvent.click(screen.getByRole("button", { name: "Use a passkey instead" })));

  it("says when the browser can't, or the passkey didn't", async () => {
    webauthn.supported = false;
    render(flow);
    await press();
    expect(screen.getByRole("alert")).toHaveTextContent(MESSAGES.passkeyUnsupported);
    webauthn.supported = true;
    actions.passkeyOptions.mockResolvedValueOnce({ error: MESSAGES.cantReach });
    await press();
    expect(screen.getByRole("alert")).toHaveTextContent(MESSAGES.cantReach);
    actions.passkeyOptions.mockResolvedValue({ options: { challenge: "c" } });
    webauthn.start.mockRejectedValueOnce(new Error("NotAllowedError"));
    await press();
    expect(screen.getByRole("alert")).toHaveTextContent(MESSAGES.passkeyCancelled);
    webauthn.start.mockResolvedValue({ id: "cred" });
    actions.passkeyFinish.mockResolvedValueOnce({ error: MESSAGES.frozen });
    await press();
    expect(actions.passkeyFinish).toHaveBeenCalledWith("/account", { id: "cred" });
    expect(screen.getByRole("alert")).toHaveTextContent(MESSAGES.frozen);
  });

  it("pauses when the visitor is paused", async () => {
    actions.passkeyOptions.mockResolvedValueOnce({ pausedMs: 60_000 });
    const { unmount } = render(flow);
    await press();
    expect(screen.getByRole("heading", { level: 1, name: "Too many tries." })).toBeInTheDocument();
    unmount();
    actions.passkeyOptions.mockResolvedValueOnce({ options: { challenge: "c" } });
    webauthn.start.mockResolvedValueOnce({ id: "cred" });
    actions.passkeyFinish.mockResolvedValueOnce({ pausedMs: 60_000 });
    render(flow);
    await press();
    expect(screen.getByRole("heading", { level: 1, name: "Too many tries." })).toBeInTheDocument();
  });
});

describe("signed in", () => {
  it("shows the person in the menu bar, with Sign out", () => {
    render(<SiteHeader me={{ initials: "AO", firstName: "Ayora" }} />);
    expect(screen.getByRole("link", { name: /Your account: ?Ayora/ })).toHaveAttribute(
      "href",
      "/account",
    );
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const menu = document.getElementById("site-menu")!;
    expect(within(menu).getByRole("link", { name: "Your account" })).toBeInTheDocument();
    expect(within(menu).getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("labels every field", () => {
    render(<Field label="Name" defaultValue="Ayora" />);
    expect(screen.getByLabelText("Name")).toHaveValue("Ayora");
  });
});
