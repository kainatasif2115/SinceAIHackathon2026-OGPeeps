"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Headset, LoaderCircle, LogOut, MessageCircle, Trash2 } from "lucide-react";
import {
  deleteAccount,
  getAccount,
  listConversations,
  logOut,
  type Account,
  type AccountConversation,
} from "@/lib/account-api";
import type { RiskLevel } from "@/lib/api";
import { RISK_STYLES } from "@/components/assistant/risk";
import { cn } from "@/lib/utils";
import { AccountShell } from "./account-shell";

const RISK_LABELS: Record<RiskLevel, string> = {
  none: "No risk found",
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk",
  critical: "Critical risk",
};

const HANDOFF_LABELS: Record<NonNullable<AccountConversation["handoff_status"]>, string> = {
  backlog: "Waiting for a support agent",
  in_progress: "A support agent is on it",
  blocked: "On hold, we may contact you",
  done: "Resolved",
};

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; account: Account; conversations: AccountConversation[] };

const time = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/** The signed-in customer's page: recent checks (kept 24 hours), handoff status, account controls. */
export function AccountView() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  // Next keeps the page's state after you leave it (React Activity). Reset on the way out,
  // so a half-finished "delete my account" or another person's data never reappears.
  useLayoutEffect(
    () => () => {
      setState({ status: "loading" });
      setConfirmDelete(false);
      setBusy(false);
    },
    [],
  );

  useEffect(() => {
    getAccount()
      .then(async (account) => {
        if (!account) return router.replace("/login");
        setState({ status: "ready", account, conversations: await listConversations() });
      })
      .catch(() => setState({ status: "error" }));
  }, [router]);

  async function signOut() {
    setBusy(true);
    await logOut().catch(() => undefined);
    router.push("/");
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteAccount();
      router.push("/");
    } catch {
      setBusy(false);
      setState({ status: "error" });
    }
  }

  if (state.status !== "ready") {
    return (
      <AccountShell>
        {state.status === "loading" ? (
          <LoaderCircle aria-label="Loading" className="text-brand mt-10 size-6 animate-spin" />
        ) : (
          <p role="alert" className="text-destructive mt-10 text-sm">
            Can&apos;t load your account right now. Reload the page to try again.
          </p>
        )}
      </AccountShell>
    );
  }

  const { account, conversations } = state;
  return (
    <AccountShell>
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Hi, {account.name}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{account.email}</p>
          </div>
          <Link
            href="/"
            className="bg-brand text-brand-foreground hover:bg-brand/90 inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors duration-150"
          >
            <MessageCircle aria-hidden className="size-4" />
            Check a message
          </Link>
        </div>

        <section
          aria-labelledby="recent"
          className="rounded-3xl border border-[#f3e4ec] bg-white p-5 sm:p-6"
        >
          <h2 id="recent" className="text-lg font-bold">
            Your recent checks
          </h2>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
            <Clock aria-hidden className="size-3.5" />
            Each conversation is deleted automatically 24 hours after your last message.
          </p>

          {conversations.length === 0 ? (
            <p className="text-muted-foreground mt-5 text-sm">
              Nothing here yet. Checks you start while logged in show up here.
            </p>
          ) : (
            <ul className="divide-border mt-4 divide-y">
              {conversations.map((c) => (
                <ConversationRow key={c.session_id} conversation={c} />
              ))}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="settings"
          className="rounded-3xl border border-[#f3e4ec] bg-white p-5 sm:p-6"
        >
          <h2 id="settings" className="text-lg font-bold">
            Account
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={signOut}
              aria-disabled={busy || undefined}
              className="border-border hover:bg-muted inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors duration-150"
            >
              <LogOut aria-hidden className="size-4" />
              Log out
            </button>
            {!confirmDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-destructive hover:bg-destructive/10 inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors duration-150"
              >
                <Trash2 aria-hidden className="size-4" />
                Delete my account
              </button>
            )}
          </div>
          {confirmDelete && (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/5 mt-4 rounded-2xl border p-4"
            >
              <p className="text-sm">
                This deletes your account and the conversations above right now. It can&apos;t be
                undone. A handoff a support agent is already working on keeps its own copy for 24
                hours.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={remove}
                  aria-disabled={busy || undefined}
                  className="bg-destructive inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white transition-colors duration-150 hover:opacity-90"
                >
                  {busy && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
                  Yes, delete my account
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="border-border hover:bg-muted inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold transition-colors duration-150"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AccountShell>
  );
}

function ConversationRow({ conversation: c }: { conversation: AccountConversation }) {
  const risk = c.risk_level && c.risk_level in RISK_STYLES ? (c.risk_level as RiskLevel) : null;
  const Icon = risk ? RISK_STYLES[risk].icon : null;
  return (
    <li className="flex flex-col gap-2 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-semibold" lang={c.language}>
          {c.title}
        </p>
        <p className="text-muted-foreground text-xs whitespace-nowrap">{time(c.started_at)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {risk && Icon && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold",
              RISK_STYLES[risk].surface,
            )}
          >
            <Icon aria-hidden className="size-3.5" />
            {RISK_LABELS[risk]}
          </span>
        )}
        <span>{c.state === "answered" ? c.action_label : "Not finished"}</span>
      </div>
      {c.handoff_reference && (
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <Headset aria-hidden className="text-brand size-4" />
          Handoff {c.handoff_reference}:{" "}
          <span className="text-foreground font-medium">
            {c.handoff_status ? HANDOFF_LABELS[c.handoff_status] : "Closed"}
          </span>
        </p>
      )}
    </li>
  );
}
