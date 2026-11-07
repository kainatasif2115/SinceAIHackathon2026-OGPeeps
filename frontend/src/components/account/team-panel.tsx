"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, Copy, LoaderCircle, LogOut, Mail, MailCheck, UserPlus, X } from "lucide-react";
import {
  cancelInvite,
  getTeam,
  inviteColleague,
  leaveTeam,
  removeMember,
  type Team,
} from "@/lib/account-api";
import { ApiError } from "@/lib/api";
import { Avatar } from "@/components/dashboard/avatar";

const FIELD =
  "border-input focus-visible:border-brand h-10 min-w-0 flex-1 rounded-full border bg-white px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--brand),transparent_75%)]";

// No email is sent from the prototype, so the owner passes the invite on: copy the link,
// or open their own mail app with it filled in. The link holds no personal data; the
// colleague joins by signing up with the invited address.
const inviteLink = () => `${location.origin}/signup?invited=1`;

function inviteMail(to: string, company: string) {
  const subject = `Join ${company} on DNA Security Assistant`;
  const body =
    `I've added you to ${company}'s team on DNA Security Assistant, so we can check ` +
    `suspicious messages, calls and invoices together.\n\n` +
    `Create your account with this email address (${to}) here:\n${inviteLink()}\n\n` +
    `If you already have an account, log in and accept the invite under Account.`;
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Copy the invite link, then say so for a moment. */
function CopyLink() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(inviteLink()).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="hover:bg-muted inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors duration-150"
    >
      {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
      <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
    </button>
  );
}

/** A business's team: members, invites and (for the owner) managing them. */
export function TeamPanel({ onLeft }: { onLeft: () => void }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justInvited, setJustInvited] = useState<string | null>(null);

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
    const address = email.trim().toLowerCase();
    setJustInvited(null);
    if (await run(() => inviteColleague(address))) {
      setEmail("");
      setJustInvited(address);
    }
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
            <span className="flex min-w-0 items-center gap-3">
              <Avatar name={m.name} you={m.role === "owner"} />
              <span className="min-w-0">
                <span className="font-semibold">{m.name}</span>{" "}
                {m.role === "owner" && (
                  <span className="bg-brand-soft text-accent-foreground ml-1 rounded-md px-1.5 py-0.5 text-xs font-semibold">
                    Owner
                  </span>
                )}
                <span className="text-muted-foreground block truncate text-xs">{m.email}</span>
              </span>
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
          <li
            key={invited}
            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5 text-sm"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden
                className="text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-[#e4cdd9]"
              >
                <Mail className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{invited}</span>
                <span className="text-muted-foreground text-xs">Invited · not joined yet</span>
              </span>
            </span>
            {owner && (
              <span className="flex items-center">
                <a
                  href={inviteMail(invited, team.name)}
                  className="hover:bg-muted inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors duration-150"
                >
                  <Mail aria-hidden className="size-4" />
                  Email<span className="sr-only"> the invite to {invited}</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    if (justInvited === invited) setJustInvited(null);
                    void run(() => cancelInvite(invited));
                  }}
                  aria-disabled={busy || undefined}
                  className="text-muted-foreground hover:bg-muted inline-flex h-9 items-center rounded-full px-3 text-sm font-semibold transition-colors duration-150"
                >
                  Cancel<span className="sr-only"> the invite for {invited}</span>
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>

      {owner && justInvited && team.invites.includes(justInvited) && (
        <div
          role="status"
          className="bg-brand-soft/60 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-start gap-2 text-sm">
            <MailCheck aria-hidden className="text-brand mt-0.5 size-5 shrink-0" />
            <span>
              <span className="font-semibold">{justInvited} is invited.</span> Send them the link:
              they join {team.name} when they sign up with this address.
            </span>
          </p>
          <span className="flex shrink-0 items-center gap-1">
            <CopyLink />
            <a
              href={inviteMail(justInvited, team.name)}
              className="bg-brand text-brand-foreground hover:bg-brand/90 inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors duration-150"
            >
              <Mail aria-hidden className="size-4" />
              Email it
            </a>
          </span>
        </div>
      )}

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
            You get a link to send them. They join when they sign up with this email, or accept
            under Account if they already have one. Remove people when they leave: old staff access
            is a common way in.
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
