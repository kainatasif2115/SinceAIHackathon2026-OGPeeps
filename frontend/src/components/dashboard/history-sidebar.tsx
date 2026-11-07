"use client";

import { Clock, LoaderCircle, MessageSquare, Plus } from "lucide-react";
import type { AccountConversation } from "@/lib/account-api";
import type { RiskLevel } from "@/lib/api";
import { RISK_STYLES } from "@/components/assistant/risk";
import { cn } from "@/lib/utils";
import { useChat } from "./chat-context";

const time = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });

/** Recent conversations, newest first, like a chat app's history. */
export function HistorySidebar({ onPick }: { onPick?: () => void }) {
  const { history, activeId, opening, newChat, openChat } = useChat();

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <button
          type="button"
          onClick={() => {
            newChat();
            onPick?.();
          }}
          className="border-border hover:bg-muted flex h-10 w-full items-center gap-2 rounded-xl border bg-white px-3 text-sm font-semibold transition-colors duration-150"
        >
          <Plus aria-hidden className="size-4" />
          New chat
        </button>
      </div>

      <nav aria-label="Recent chats" className="min-h-0 flex-1 overflow-y-auto px-3">
        <p className="text-muted-foreground px-2 pt-1 pb-2 text-xs font-semibold">Recent chats</p>
        {history === null ? (
          <LoaderCircle
            aria-label="Loading chats"
            className="text-brand mx-2 size-5 animate-spin"
          />
        ) : history.length === 0 ? (
          <p className="text-muted-foreground px-2 text-sm">
            Your chats from the last 24 hours show up here.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {history.map((c) => (
              <HistoryItem
                key={c.session_id}
                conversation={c}
                active={c.session_id === activeId}
                busy={c.session_id === opening}
                onOpen={() => {
                  void openChat(c.session_id);
                  onPick?.();
                }}
              />
            ))}
          </ul>
        )}
      </nav>

      <p className="text-muted-foreground flex items-start gap-1.5 px-5 py-4 text-xs">
        <Clock aria-hidden className="mt-px size-3.5 shrink-0" />
        Chats are deleted automatically 24 hours after your last message.
      </p>
    </div>
  );
}

function HistoryItem({
  conversation: c,
  active,
  busy,
  onOpen,
}: {
  conversation: AccountConversation;
  active: boolean;
  busy: boolean;
  onOpen: () => void;
}) {
  const risk = c.risk_level && c.risk_level in RISK_STYLES ? (c.risk_level as RiskLevel) : null;
  const Icon = risk ? RISK_STYLES[risk].icon : MessageSquare;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors duration-150",
          active ? "bg-brand-soft" : "hover:bg-muted",
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md",
            risk ? RISK_STYLES[risk].surface : "bg-muted text-muted-foreground",
          )}
        >
          {busy ? (
            <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
          ) : (
            <Icon aria-hidden className="size-3.5" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium" lang={c.language}>
            {c.title}
          </span>
          <span className="text-muted-foreground block text-xs">
            {time(c.started_at)}
            {c.state === "in_progress" && " · not finished"}
          </span>
        </span>
      </button>
    </li>
  );
}
