"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { TeamPanel } from "@/components/account/team-panel";
import { useAccount } from "./account-context";
import { Card, Section } from "./section";

/** The company's team: members, invites, and managing them for the owner. */
export function TeamSection() {
  const { account, reload } = useAccount();
  const router = useRouter();

  if (!account.company) {
    return (
      <Section title="Team">
        <Card>
          <p className="text-sm">
            Teams are for business accounts. You have a private account
            {account.pending_invite ? (
              <>
                , and {account.pending_invite} has invited you:{" "}
                <Link href="/dashboard/account" className="text-brand font-semibold underline">
                  see the invite
                </Link>
                .
              </>
            ) : (
              "."
            )}
          </p>
        </Card>
      </Section>
    );
  }

  return (
    <Section
      title={`Team · ${account.company}`}
      intro={
        account.role === "owner"
          ? "Checks your colleagues make in Business mode are shared with you."
          : `Checks you make here are shared with ${account.company}'s owner, so keep personal matters out of them.`
      }
    >
      <Card>
        <TeamPanel
          onLeft={() => {
            reload();
            router.push("/dashboard");
          }}
        />
      </Card>
    </Section>
  );
}
