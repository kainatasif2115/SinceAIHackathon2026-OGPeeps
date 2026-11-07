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
import { Card, Section } from "./section";

type Lists = { mine: AccountConversation[]; team: TeamConversation[] | null };

/** Your recent checks and, for a company's owner, the team's business checks. */
export function ChecksSection() {
  const { account } = useAccount();
  const owner = account.role === "owner";
  const [lists, setLists] = useState<Lists | null>(null);
  const [failed, setFailed] = useState(false);

  // Fetched each time the section is shown, so new checks appear after a chat.
  useLayoutEffect(() => () => setLists(null), []);
  useEffect(() => {
    Promise.all([listConversations(), owner ? listTeamConversations() : Promise.resolve(null)])
      .then(([mine, team]) => setLists({ mine, team }))
      .catch(() => setFailed(true));
  }, [owner]);

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
          <Card labelledBy="mine">
            <h2 id="mine" className="text-lg font-bold">
              Your recent checks
            </h2>
            {lists.mine.length === 0 ? (
              <p className="text-muted-foreground mt-3 text-sm">
                Nothing here yet. Checks you start while logged in show up here.
              </p>
            ) : (
              <ul className="divide-border mt-2 divide-y">
                {lists.mine.map((c) => (
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
