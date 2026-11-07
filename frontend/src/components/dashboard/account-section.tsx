"use client";

import { useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, LoaderCircle, LogOut, Trash2, UserRound, Users } from "lucide-react";
import { deleteAccount, joinTeam } from "@/lib/account-api";
import { useAccount } from "./account-context";
import { Avatar } from "./avatar";
import { Card, Section } from "./section";

/** Who you are, a pending team invite, and the account controls. */
export function AccountSection() {
  const { account, reload, signOut } = useAccount();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const owner = account.role === "owner";

  // A half-finished "delete my account" must not be waiting when you come back.
  useLayoutEffect(
    () => () => {
      setConfirmDelete(false);
      setBusy(false);
      setFailed(false);
    },
    [],
  );

  async function join() {
    setBusy(true);
    await joinTeam().catch(() => undefined);
    setBusy(false);
    reload();
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteAccount();
      router.push("/");
    } catch {
      setBusy(false);
      setFailed(true);
    }
  }

  return (
    <Section title="Account">
      <Card labelledBy="profile">
        <div className="flex items-center gap-4">
          <Avatar name={account.name} you size="lg" />
          <div className="min-w-0">
            <h2 id="profile" className="text-xl font-bold">
              {account.name}
            </h2>
            <p className="text-muted-foreground mt-0.5 truncate text-sm">{account.email}</p>
          </div>
        </div>
        <p className="bg-brand-soft text-accent-foreground mt-3 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold">
          {account.company ? (
            <>
              <Building2 aria-hidden className="size-3.5" />
              Business · {account.company} · {owner ? "owner" : "member"}
            </>
          ) : (
            <>
              <UserRound aria-hidden className="size-3.5" />
              Private account
            </>
          )}
        </p>
      </Card>

      {account.pending_invite && !account.company && (
        <section
          aria-labelledby="invite"
          className="border-brand bg-brand-soft rounded-3xl border-2 p-5 sm:p-6"
        >
          <h2 id="invite" className="text-lg font-bold">
            {account.pending_invite} invited you to their team
          </h2>
          <p className="mt-1 text-sm">
            Checks you make in Business mode will be shared with the company&apos;s owner. Checks in
            Private mode stay yours.
          </p>
          <button
            type="button"
            onClick={join}
            aria-disabled={busy || undefined}
            className="bg-brand text-brand-foreground hover:bg-brand/90 mt-3 inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors duration-150"
          >
            <Users aria-hidden className="size-4" />
            Join {account.pending_invite}
          </button>
        </section>
      )}

      <Card labelledBy="controls">
        <h2 id="controls" className="text-lg font-bold">
          Sign-in and data
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void signOut()}
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
              This deletes your account and your conversations right now. It can&apos;t be undone.{" "}
              {owner &&
                `It also closes ${account.company}'s team; your colleagues keep their accounts as private ones. `}
              A handoff a support agent is already working on keeps its own copy for 24 hours.
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
        {failed && (
          <p role="alert" className="text-destructive mt-3 text-sm">
            Can&apos;t delete the account right now. Try again.
          </p>
        )}
      </Card>
    </Section>
  );
}
