"use client";

import { browserSupportsWebAuthn, startAuthentication } from "@simplewebauthn/browser";
import { useEffect, useState, useTransition, type ReactNode } from "react";

import { Note, PageHero, TYPE } from "@/components/kit/Kit";
import { ArrowLink, Button } from "@/components/site/Button";
import { Icon } from "@/components/site/Icon";
import { SiteLink } from "@/components/site/SiteLink";
import {
  confirmSignInCode,
  passkeyFinish,
  passkeyOptions,
  resendSignInCode,
  signInWithCode,
  signInWithPassword,
  type SignInState,
} from "@/lib/auth/actions";
import { MESSAGES, type NextPage } from "@/lib/auth/rules";

import { Field, PasswordField } from "./Fields";

type CodeStep = Extract<SignInState, { step: "code" }> & { number: string | null };

/** A clock that counts down to zero, a second at a time. */
function useCountdown(ms: number) {
  const [end, setEnd] = useState(() => Date.now() + ms);
  const [left, setLeft] = useState(ms);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [end]);
  return { left, restart: (next: number) => setEnd(Date.now() + next) };
}

const clock = (ms: number) => {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

function Checklist({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-2.5 pt-1">
      {items.map((item) => (
        <li key={item} className={`flex items-center gap-2.5 ${TYPE.p} text-white`}>
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white">
            <Icon name="check-small" className="size-3.5" />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * Signing in on the website (W2.1, W2.2; Figma Sign in, Check it's you,
 * Wrong details and Too many tries). The same card opens Your account and
 * Freeze my account: `next` says where a finished sign-in goes.
 */
export function SignInFlow({
  next,
  crumb,
  title,
  sub,
  checklist,
  note,
}: {
  next: NextPage;
  crumb?: ReactNode;
  title: string;
  sub: string;
  checklist: readonly string[];
  note: string;
}) {
  const [state, setState] = useState<SignInState>({ step: "details" });
  const [code, setCode] = useState<CodeStep | null>(null);
  const [pending, start] = useTransition();
  const [who, setWho] = useState("");
  const [password, setPassword] = useState("");
  const [digits, setDigits] = useState("");

  const show = (result: SignInState) => {
    if (result.step === "code") {
      if (result.number !== undefined) {
        setCode({ ...result, number: result.number });
        setDigits("");
      } else if (code) {
        setCode({ ...code, error: result.error, resendInMs: result.resendInMs ?? 0 });
      }
    }
    setState(result);
  };
  const run = (work: () => Promise<SignInState>) => start(async () => show(await work()));

  const usePasskey = () =>
    start(async () => {
      if (!browserSupportsWebAuthn()) {
        setState({ step: "details", error: MESSAGES.passkeyUnsupported });
        return;
      }
      const ask = await passkeyOptions();
      if ("error" in ask) return setState({ step: "details", error: ask.error });
      if ("pausedMs" in ask) return setState({ step: "paused", untilMs: ask.pausedMs });
      let answer;
      try {
        answer = await startAuthentication({ optionsJSON: ask.options });
      } catch {
        return setState({ step: "details", error: MESSAGES.passkeyCancelled });
      }
      const result = await passkeyFinish(next, answer);
      if ("pausedMs" in result) return setState({ step: "paused", untilMs: result.pausedMs });
      setState({ step: "details", error: result.error });
    });

  if (state.step === "paused") {
    return <Paused untilMs={state.untilMs} onAgain={() => setState({ step: "details" })} />;
  }

  if (state.step === "stopped") {
    return (
      <PageHero
        title="Start again."
        sub={state.message}
        card={
          <div className="flex flex-col gap-4">
            <Button variant="primary" onClick={() => setState({ step: "details" })}>
              Start again
            </Button>
            <ArrowLink href="/contact">Contact us</ArrowLink>
          </div>
        }
      />
    );
  }

  if (state.step === "code" && code) {
    return (
      <PageHero
        title="Check it’s you."
        sub={`We texted a 6-digit code to ${code.number ?? "the number on your account"}.`}
        card={
          <CodeCard
            key={code.testCode ?? "code"}
            code={code}
            error={state.error}
            digits={digits}
            setDigits={setDigits}
            pending={pending}
            onSubmit={() => run(() => confirmSignInCode(next, digits))}
            onResend={() => run(resendSignInCode)}
            onBack={() => setState({ step: "details" })}
          />
        }
      />
    );
  }

  return (
    <PageHero
      crumb={crumb}
      title={title}
      sub={sub}
      after={<Checklist items={checklist} />}
      card={
        <form
          className="flex flex-col gap-4"
          aria-label="Sign in"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => signInWithPassword(who, password));
          }}
        >
          {state.error ? (
            <div role="alert">
              <Note tone="red">{state.error}</Note>
            </div>
          ) : null}
          <Field
            label="Cyber X ID, alias or phone number"
            name="who"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={who}
            onChange={(event) => setWho(event.target.value)}
          />
          <PasswordField
            label="Password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <SiteLink
            href="/help/i-forgot-my-password"
            className={`${TYPE.p} text-accent self-end font-medium hover:underline`}
          >
            Forgot password?
          </SiteLink>
          <Button type="submit" variant="primary" disabled={pending} aria-busy={pending}>
            Continue
          </Button>
          <p className={`${TYPE.cap} text-muted-fg text-center`}>or</p>
          <Button variant="secondary" disabled={pending} onClick={usePasskey}>
            Use a passkey instead
          </Button>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => run(() => signInWithCode(who))}
          >
            Get a code by text
          </Button>
          <Note tone="grey" icon="lock">
            {note}
          </Note>
        </form>
      }
    />
  );
}

function CodeCard({
  code,
  error,
  digits,
  setDigits,
  pending,
  onSubmit,
  onResend,
  onBack,
}: {
  code: CodeStep;
  error?: string;
  digits: string;
  setDigits: (value: string) => void;
  pending: boolean;
  onSubmit: () => void;
  onResend: () => void;
  onBack: () => void;
}) {
  const resend = useCountdown(code.resendInMs ?? 0);
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="sign-in-code" className={TYPE.h4}>
        Enter the code
      </label>
      {error ? (
        <div role="alert">
          <Note tone="red">{error}</Note>
        </div>
      ) : null}
      <input
        id="sign-in-code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        value={digits}
        onChange={(event) => setDigits(event.target.value.replace(/\D/g, "").slice(0, 6))}
        className="focus-visible:border-accent focus-visible:outline-accent h-14 w-full rounded-[14px] border border-[#d5dce8] bg-white text-center font-mono text-[28px] tracking-[0.5em] outline-none focus-visible:outline-2 lg:h-16"
      />
      {code.testCode ? (
        <Note tone="blue">
          Test mode: no text is sent yet. Your code is{" "}
          <strong className="font-mono font-medium">{code.testCode}</strong>.
        </Note>
      ) : null}
      {resend.left > 0 ? (
        <p className={`${TYPE.cap} text-muted-fg`}>Resend code in {clock(resend.left)}</p>
      ) : (
        <button
          type="button"
          onClick={() => {
            resend.restart(30_000);
            onResend();
          }}
          disabled={pending}
          className={`${TYPE.p} text-accent self-start font-medium hover:underline`}
        >
          Resend code
        </button>
      )}
      <Button
        type="submit"
        variant="primary"
        disabled={pending || digits.length !== 6}
        aria-busy={pending}
      >
        Continue
      </Button>
      <button
        type="button"
        onClick={onBack}
        className={`${TYPE.p} text-accent self-start font-medium hover:underline`}
      >
        Use another way to sign in ›
      </button>
      <Note tone="grey" icon="lock">
        Only you should see this code. Cyber X will never call or message you to ask for it.
      </Note>
    </form>
  );
}

/** Figma Too many tries. */
function Paused({ untilMs, onAgain }: { untilMs: number; onAgain: () => void }) {
  const { left } = useCountdown(untilMs);
  const minutes = Math.max(1, Math.round(untilMs / 60_000));
  return (
    <PageHero
      title="Too many tries."
      sub={`For your safety, signing in is paused for ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`}
      card={
        <div className="flex flex-col gap-3">
          <span
            aria-hidden="true"
            className="bg-warn-bg text-warn-fg flex size-11 items-center justify-center rounded-full text-[21px]"
          >
            !
          </span>
          <p className={`${TYPE.cap} text-muted-fg`}>Try again in</p>
          <p className="font-mono text-[44px] leading-none font-medium tabular-nums lg:text-[48px]">
            {clock(left)}
          </p>
          <Note tone="amber">
            Wasn’t you? Someone may know your alias or password. You can still freeze your account
            in the app.
          </Note>
          {left === 0 ? (
            <Button variant="primary" onClick={onAgain}>
              Try again
            </Button>
          ) : null}
          <ArrowLink href="/contact">Contact us</ArrowLink>
        </div>
      }
    />
  );
}
