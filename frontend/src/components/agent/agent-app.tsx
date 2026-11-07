"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Headset, Info, LoaderCircle, LockKeyhole } from "lucide-react";
import { getMe, signIn, signOut, type Agent } from "@/lib/agent-api";
import { ApiError } from "@/lib/api";
import { AgentConsole } from "./agent-console";
import { AgentHeader, type AgentView } from "./agent-header";
import { CasesView } from "./cases-view";
import { ResultsView } from "./results-view";

type Session = { status: "checking" } | { status: "signed-out" } | { status: "in"; agent: Agent };

/** Staff sign-in in front of the support console (one demo account in the prototype). */
export function AgentApp({ view = "board" }: { view?: AgentView }) {
  const [session, setSession] = useState<Session>({ status: "checking" });

  useEffect(() => {
    getMe()
      .then((agent) => setSession(agent ? { status: "in", agent } : { status: "signed-out" }))
      .catch(() => setSession({ status: "signed-out" }));
  }, []);

  if (session.status === "checking") {
    return (
      <div className="theme-dna flex min-h-full flex-1 items-center justify-center bg-white">
        <LoaderCircle aria-label="Loading" className="text-brand size-6 animate-spin" />
      </div>
    );
  }

  if (session.status === "signed-out") {
    return <SignIn onSignedIn={(agent) => setSession({ status: "in", agent })} />;
  }

  const header = (
    <AgentHeader
      active={view}
      agentName={session.agent.name}
      onSignOut={() => {
        void signOut();
        setSession({ status: "signed-out" });
      }}
    />
  );
  const expire = () => setSession({ status: "signed-out" });

  if (view === "cases") {
    return (
      <div className="theme-dna flex min-h-full flex-1 flex-col bg-white">
        {header}
        <main className="flex flex-1 flex-col">
          <CasesView onSessionExpired={expire} />
        </main>
      </div>
    );
  }

  if (view === "results") {
    return (
      <div className="theme-dna flex min-h-full flex-1 flex-col bg-white">
        {header}
        <main className="flex-1">
          <ResultsView onSessionExpired={expire} />
        </main>
      </div>
    );
  }
  return <AgentConsole header={header} onSessionExpired={expire} />;
}

function SignIn({ onSignedIn }: { onSignedIn: (agent: Agent) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      onSignedIn(await signIn(username, password));
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "Wrong username or password."
          : err instanceof ApiError && err.status === 503
            ? "The demo login is not set up on this server (AGENT_DEMO_PASSWORD in backend/.env)."
            : "Can't reach the server. Try again.",
      );
      setBusy(false);
    }
  }

  const field =
    "border-input focus-visible:border-brand h-11 w-full rounded-xl border bg-white px-3.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--brand),transparent_75%)]";

  return (
    <div className="theme-dna flex min-h-full flex-1 flex-col bg-[#fdf6fa]">
      <header className="border-border border-b bg-white">
        <div className="flex h-16 items-center gap-2.5 px-4 sm:px-6">
          <span className="font-heading text-brand text-2xl leading-none font-bold tracking-tight">
            DNA
          </span>
          <span className="bg-border h-6 w-px" aria-hidden />
          <span className="font-heading flex items-center gap-1.5 text-base font-semibold">
            <Headset aria-hidden className="text-brand size-4.5" />
            Support console
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <form
          onSubmit={submit}
          className="flex w-full max-w-sm flex-col gap-5 rounded-3xl border border-[#f3e4ec] bg-white p-6 shadow-[0_16px_48px_rgb(218_0_112/0.10)] sm:p-8"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="bg-brand-soft text-brand flex size-12 items-center justify-center rounded-full">
              <LockKeyhole aria-hidden className="size-5.5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Staff sign-in</h1>
            <p className="text-muted-foreground text-sm">
              Handoffs from the security assistant, for DNA support agents.
            </p>
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className={field}
            />
          </label>

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
            Sign in
          </button>

          <p className="text-muted-foreground flex items-start gap-2 text-xs">
            <Info aria-hidden className="mt-px size-3.5 shrink-0" />
            Prototype with one demo staff account. In production this would be DNA’s own staff
            single sign-on.
          </p>
        </form>
      </main>
    </div>
  );
}
