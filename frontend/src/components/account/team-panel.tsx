"use client";

import { useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, LogOut, UserPlus, X } from "lucide-react";
import {
  cancelInvite,
  getTeam,
  inviteColleague,
  leaveTeam,
  removeMember,
  type Team,
} from "@/lib/account-api";
import { ApiError } from "@/lib/api";

const FIELD =
  "border-input focus-visible:border-brand h-10 min-w-0 flex-1 rounded-full border bg-white px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--brand),transparent_75%)]";

/** A business's team: members, invites and (for the owner) managing them. */
export function TeamPanel({ onLeft }: { onLeft: () => void }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTeam()
      .then(setTeam)
      .catch(() => setError("Can't load your team right now."));
  }, []);

  async function run(action: () => Promise<Team>) {
    setBusy(true);
    setError(null);
    try {
      setTeam(await action());
      return true;
    } catch (err) {
      setError(err instanceof ApiError && err.status > 0 ? err.detail : "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function invite(event: FormEvent) {
    event.preventDefault();
    if (busy || !email.trim()) return;
    if (await run(() => inviteColleague(email))) setEmail("");
  }

  async function leave() {
    setBusy(true);
    await leaveTeam().catch(() => undefined);
    onLeft();
  }

  if (!team) {
    return error ? (
      <p role="alert" className="text-destructive mt-4 text-sm">
        {error}
      </p>
    ) : (
      <LoaderCircle aria-label="Loading team" className="text-brand mt-4 size-5 animate-spin" />
    );
  }

  const owner = team.role === "owner";
  return (
    <div className="mt-4 flex flex-col gap-4">
      <ul className="divide-border divide-y">
        {team.members.map((m) => (
          <li key={m.email} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span>
              <span className="font-medium">{m.name}</span>{" "}
              {m.role === "owner" && <span className="text-muted-foreground">(owner)</span>}
              <span className="text-muted-foreground block text-xs">{m.email}</span>
            </span>
            {owner && m.role !== "owner" && (
              <button
                type="button"
                onClick={() => run(() => removeMember(m.email))}
                aria-disabled={busy || undefined}
                className="text-destructive hover:bg-destructive/10 inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm font-semibold transition-colors duration-150"
              >
                <X aria-hidden className="size-4" />
                Remove<span className="sr-only"> {m.name}</span>
              </button>
            )}
          </li>
        ))}
        {team.invites.map((invited) => (
          <li key={invited} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="text-muted-foreground">
              {invited} <span className="text-xs">(invited)</span>
            </span>
            <button
              type="button"
              onClick={() => run(() => cancelInvite(invited))}
              aria-disabled={busy || undefined}
              className="hover:bg-muted inline-flex h-9 items-center rounded-full px-3 text-sm font-semibold transition-colors duration-150"
            >
              Cancel invite<span className="sr-only"> for {invited}</span>
            </button>
          </li>
        ))}
      </ul>

      {owner ? (
        <form onSubmit={invite} className="flex flex-col gap-2">
          <label htmlFor="invite-email" className="text-sm font-medium">
            Invite a colleague
          </label>
          <div className="flex gap-2">
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="anna@yourcompany.fi"
              autoComplete="off"
              className={FIELD}
            />
            <button
              type="submit"
              aria-disabled={busy || undefined}
              className="bg-brand text-brand-foreground hover:bg-brand/90 inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors duration-150"
            >
              <UserPlus aria-hidden className="size-4" />
              Invite
            </button>
          </div>
          <p className="text-muted-foreground text-xs">
            They join when they create a business account with this email, or accept in their
            Account section. Remove people when they leave: old staff access is a common way in.
          </p>
        </form>
      ) : (
        <button
          type="button"
          onClick={leave}
          aria-disabled={busy || undefined}
          className="border-border hover:bg-muted inline-flex h-10 w-fit items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors duration-150"
        >
          <LogOut aria-hidden className="size-4" />
          Leave {team.name}
        </button>
      )}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
