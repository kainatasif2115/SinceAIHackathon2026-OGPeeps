"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { Clock, LoaderCircle } from "lucide-react";
import {
  listConversations,
  listTeamConversations,
  type AccountConversation,
  type TeamConversation,
} from "@/lib/account-api";
import { useAccount } from "./account-context";
import { ConversationRow } from "./conversation-row";
import { HandoffCard } from "./handoff-card";
import { Card, Section } from "./section";

type Lists = { mine: AccountConversation[]; team: TeamConversation[] | null };

// How often the tab refreshes while it is open, so an agent picking a case up shows.
const REFRESH_MS = 15_000;

const ORDER = { in_progress: 0, blocked: 1, backlog: 2, done: 3 } as const;

/** Your recent checks and, for a company's owner, the team's business checks. */
export function ChecksSection() {
  const { account } = useAccount();
  const owner = account.role === "owner";
  const [lists, setLists] = useState<Lists | null>(null);
  const [failed, setFailed] = useState(false);

  // Fetched each time the section is shown, so new checks appear after a chat.
  useLayoutEffect(() => () => setLists(null), []);
  useEffect(() => {
    const load = () =>
      Promise.all([listConversations(), owner ? listTeamConversations() : Promise.resolve(null)])
        .then(([mine, team]) => {
          setLists({ mine, team });
          setFailed(false);
        })
        .catch(() => setFailed(true));
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [owner]);

  const handoffs = (lists?.mine ?? [])
    .filter((c) => c.handoff)
    .sort((a, b) => ORDER[a.handoff!.status] - ORDER[b.handoff!.status]);
  const others = (lists?.mine ?? []).filter((c) => !c.handoff);
  const active = handoffs.filter((c) => c.handoff!.status !== "done").length;

  return (
    <Section
      title="Your checks"
      intro={
        <span className="inline-flex items-center gap-1.5">
          <Clock aria-hidden className="size-3.5" />
          Each conversation is deleted automatically 24 hours after your last message.
        </span>
      }
    >
      {!lists ? (
        failed ? (
          <p role="alert" className="text-destructive text-sm">
            Can&apos;t load your checks right now.
          </p>
        ) : (
          <LoaderCircle aria-label="Loading" className="text-brand size-6 animate-spin" />
        )
      ) : (
        <>
          <p className="text-lg">
            <span className="font-heading text-brand text-3xl font-bold">{lists.mine.length}</span>{" "}
            check{lists.mine.length === 1 ? "" : "s"} in the last 24 hours
            {active > 0 ? ` · ${active} with a support agent` : " · no handoffs open"}
            {owner && lists.team ? ` · ${lists.team.length} from your team` : ""}
          </p>
          {handoffs.length > 0 && (
            <section aria-labelledby="handoffs" className="flex flex-col gap-3">
              <h2 id="handoffs" className="text-lg font-bold">
                With a support agent
              </h2>
              {handoffs.map((c) => (
                <HandoffCard key={c.session_id} conversation={c} handoff={c.handoff!} />
              ))}
            </section>
          )}

          <Card labelledBy="mine">
            <h2 id="mine" className="text-lg font-bold">
              {handoffs.length > 0 ? "Your other checks" : "Your recent checks"}
            </h2>
            {others.length === 0 ? (
              <p className="text-muted-foreground mt-3 text-sm">
                {handoffs.length > 0
                  ? "Nothing else in the last 24 hours."
                  : "Nothing here yet. Checks you start while logged in show up here."}
              </p>
            ) : (
              <ul className="divide-border mt-2 divide-y">
                {others.map((c) => (
                  <ConversationRow key={c.session_id} conversation={c} />
                ))}
              </ul>
            )}
          </Card>

          {owner && lists.team && (
            <Card labelledBy="team-checks">
              <h2 id="team-checks" className="text-lg font-bold">
                Your team&apos;s checks
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                What your staff checked in Business mode. Their Private-mode checks never show here.
              </p>
              {lists.team.length === 0 ? (
                <p className="text-muted-foreground mt-3 text-sm">
                  Nothing yet. When a colleague checks something in Business mode, it shows here.
                </p>
              ) : (
                <ul className="divide-border mt-2 divide-y">
                  {lists.team.map((c) => (
                    <ConversationRow key={c.session_id} conversation={c} author={c.author} />
                  ))}
                </ul>
              )}
            </Card>
          )}
        </>
      )}
    </Section>
  );
}
