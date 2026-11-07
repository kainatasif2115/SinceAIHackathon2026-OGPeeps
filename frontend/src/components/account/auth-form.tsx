"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Eye, EyeOff, Info, LoaderCircle, UserRound } from "lucide-react";
import { getDemoStatus, logIn, signUp, startDemo, type AccountKind } from "@/lib/account-api";
import { ApiError } from "@/lib/api";
import { AccountShell } from "./account-shell";

type Mode = "signup" | "login";

const COPY = {
  signup: {
    title: "Create an account",
    intro: "Optional. You can check messages without an account.",
    submit: "Create account",
    switchText: "Already have an account?",
    switchLink: "Log in",
    switchHref: "/login",
  },
  login: {
    title: "Log in",
    intro: "See your recent checks and the status of any handoff.",
    submit: "Log in",
    switchText: "No account yet?",
    switchLink: "Create one",
    switchHref: "/signup",
  },
} as const;

const KINDS = [
  {
    value: "private",
    label: "Private person",
    hint: "Your own phone, email and bank",
    icon: UserRound,
  },
  { value: "business", label: "Business", hint: "You and your staff", icon: Building2 },
] as const;

const FIELD =
  "border-input focus-visible:border-brand h-11 w-full rounded-xl border bg-white px-3.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--brand),transparent_75%)]";

const noSubscribe = () => () => {};

/** Sign-up and login share one form; sign-up adds the name field and the privacy note. */
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const copy = COPY[mode];
  // Hidden pages stay in the document, so ids must be unique across them.
  const passwordId = useId();
  const rulesId = useId();
  // Opened from a colleague's invite link (/signup?invited=1): a business account that
  // joins the inviting company, so there is no company name to type.
  const invited = useSyncExternalStore(
    noSubscribe,
    () => mode === "signup" && new URLSearchParams(location.search).get("invited") === "1",
    () => false,
  );
  const [kindChoice, setKind] = useState<AccountKind | null>(null);
  const kind: AccountKind = kindChoice ?? (invited ? "business" : "private");
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The "explore" buttons are only offered where the service has demo accounts switched on.
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [demoBusy, setDemoBusy] = useState<"individual" | "organization" | null>(null);

  useEffect(() => {
    if (mode !== "login") return;
    getDemoStatus()
      .then(setDemoEnabled)
      .catch(() => setDemoEnabled(false));
  }, [mode]);

  async function explore(kind: "individual" | "organization") {
    if (busy || demoBusy) return;
    setDemoBusy(kind);
    setError(null);
    try {
      await startDemo(kind);
      router.push("/dashboard");
    } catch {
      setError("Couldn't open the demo right now. Please try again.");
      setDemoBusy(null);
    }
  }

  // Next keeps a page's state when you navigate away (React Activity). Start clean every
  // time: no stuck spinner, old error, or typed password left in the page.
  useLayoutEffect(
    () => () => {
      setKind(null);
      setCompany("");
      setName("");
      setEmail("");
      setPassword("");
      setShowPassword(false);
      setBusy(false);
      setError(null);
      setDemoBusy(null);
    },
    [],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") await signUp({ email, name, password, kind, company });
      else await logIn(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError && err.status > 0
          ? err.detail
          : "Can't reach the service. Check your connection and try again.",
      );
      setBusy(false);
    }
  }

  return (
    <AccountShell>
      <form
        onSubmit={submit}
        className="flex h-fit w-full max-w-sm flex-col gap-5 rounded-3xl border border-[#f3e4ec] bg-white p-6 shadow-[0_16px_48px_rgb(218_0_112/0.10)] sm:p-8"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="bg-brand-soft text-brand flex size-12 items-center justify-center rounded-full">
            <UserRound aria-hidden className="size-5.5" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">{copy.title}</h1>
          <p className="text-muted-foreground text-sm">{copy.intro}</p>
        </div>

        {mode === "signup" && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Who is this account for?</legend>
            <div className="grid grid-cols-2 gap-2">
              {KINDS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 text-sm transition-colors duration-150 has-focus-visible:ring-2 has-focus-visible:ring-[color-mix(in_oklch,var(--brand),transparent_60%)] ${
                    kind === option.value
                      ? "border-brand bg-brand-soft text-accent-foreground border-2"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="kind"
                    value={option.value}
                    checked={kind === option.value}
                    onChange={() => setKind(option.value)}
                    className="sr-only"
                  />
                  <span className="flex items-center gap-1.5 font-semibold">
                    <option.icon aria-hidden className="size-4" />
                    {option.label}
                  </span>
                  <span className="text-muted-foreground text-xs">{option.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {mode === "signup" && invited && kind === "business" && (
          <p className="bg-brand-soft text-accent-foreground rounded-xl px-3.5 py-3 text-sm">
            A colleague invited you to their company&apos;s team. Sign up with the email address
            they invited and you&apos;ll join it straight away.
          </p>
        )}
        {mode === "signup" && !invited && kind === "business" && (
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Company name
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              autoComplete="organization"
              maxLength={100}
              className={FIELD}
            />
            <span className="text-muted-foreground text-xs font-normal">
              Invited by a colleague? Leave this empty and use the email they invited: you&apos;ll
              join their company.
            </span>
          </label>
        )}
        {mode === "signup" && (
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              maxLength={100}
              required
              className={FIELD}
            />
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={254}
            required
            className={FIELD}
          />
        </label>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={passwordId} className="text-sm font-medium">
            Password
          </label>
          <div className="relative">
            <input
              id={passwordId}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              aria-describedby={mode === "signup" ? rulesId : undefined}
              maxLength={200}
              required
              className={`${FIELD} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="text-muted-foreground hover:text-foreground focus-visible:outline-brand absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg focus-visible:outline-2"
            >
              {showPassword ? (
                <EyeOff aria-hidden className="size-4.5" />
              ) : (
                <Eye aria-hidden className="size-4.5" />
              )}
            </button>
          </div>
          {mode === "signup" && (
            <p id={rulesId} className="text-muted-foreground text-xs">
              At least 8 characters, not only numbers, and not a common password.
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}

        <button
          type="submit"
          aria-disabled={busy || undefined}
          className="bg-brand text-brand-foreground hover:bg-brand/90 inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors duration-150"
        >
          {busy && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
          {copy.submit}
        </button>

        <p className="text-center text-sm">
          {copy.switchText}{" "}
          <Link
            href={copy.switchHref}
            className="text-brand font-semibold underline-offset-4 hover:underline"
          >
            {copy.switchLink}
          </Link>
        </p>

        {mode === "login" && demoEnabled && (
          <div className="border-border flex flex-col gap-2.5 border-t pt-5">
            <p className="text-muted-foreground text-center text-xs">
              Just looking around? Skip the sign-up: these open a ready-made demo with chats,
              handoffs and a team already in place.
            </p>
            {(
              [
                ["individual", "Explore as an individual", UserRound],
                ["organization", "Explore as part of an organization", Building2],
              ] as const
            ).map(([demoKind, label, Icon]) => (
              <button
                key={demoKind}
                type="button"
                onClick={() => void explore(demoKind)}
                aria-disabled={demoBusy !== null || undefined}
                className="border-brand/40 text-brand hover:bg-brand-soft inline-flex h-11 items-center justify-center gap-2 rounded-full border text-sm font-semibold transition-colors duration-150"
              >
                {demoBusy === demoKind ? (
                  <LoaderCircle aria-hidden className="size-4 animate-spin" />
                ) : (
                  <Icon aria-hidden className="size-4" />
                )}
                {label}
              </button>
            ))}
          </div>
        )}

        {mode === "signup" && (
          <p className="text-muted-foreground flex items-start gap-2 text-xs">
            <Info aria-hidden className="mt-px size-3.5 shrink-0" />
            We keep only your name, email, company if any, and a scrambled form of your password.
            Conversations are still deleted after 24 hours, and you can delete your account at any
            time.
          </p>
        )}
      </form>
    </AccountShell>
  );
}
