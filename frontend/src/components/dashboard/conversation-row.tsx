import { Headset } from "lucide-react";
import type { AccountConversation } from "@/lib/account-api";
import type { RiskLevel } from "@/lib/api";
import { RISK_STYLES } from "@/components/assistant/risk";
import { cn } from "@/lib/utils";

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

const time = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });

/** One check in a list: what it was about, the risk, the advice and any handoff. */
export function ConversationRow({
  conversation: c,
  author,
}: {
  conversation: AccountConversation;
  author?: string;
}) {
  const risk = c.risk_level && c.risk_level in RISK_STYLES ? (c.risk_level as RiskLevel) : null;
  const Icon = risk ? RISK_STYLES[risk].icon : null;
  return (
    <li className="flex flex-col gap-2 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-semibold" lang={c.language}>
          {c.title}
        </p>
        <p className="text-muted-foreground text-xs whitespace-nowrap">
          {author && <span className="text-foreground font-medium">{author} · </span>}
          {time(c.started_at)}
        </p>
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
