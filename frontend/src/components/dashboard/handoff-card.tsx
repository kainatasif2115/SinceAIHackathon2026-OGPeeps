import { ArrowRight, Check, Headset, PauseCircle } from "lucide-react";
import type { AccountConversation, Handoff } from "@/lib/account-api";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { useChat } from "./chat-context";

const STATUS: Record<Handoff["status"], { label: string; className: string }> = {
  backlog: { label: "Waiting", className: "bg-brand-soft text-accent-foreground" },
  in_progress: { label: "In progress", className: "bg-brand text-brand-foreground" },
  blocked: { label: "On hold", className: "bg-amber-100 text-amber-900" },
  done: { label: "Resolved", className: "bg-emerald-100 text-emerald-900" },
};

const PRIORITY: Record<Handoff["severity"], string> = {
  critical: "Critical priority",
  high: "High priority",
  medium: "Normal priority",
  low: "Low priority",
};

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/** Where a handoff stands, in words: place in line, who has it, or how it ended. */
function Progress({ h }: { h: Handoff }) {
  const agent = h.assigned_to ?? "A support agent";
  if (h.status === "backlog") {
    return (
      <div>
        <p className="font-heading text-brand text-2xl font-bold">
          {h.queue_position === 1
            ? "You're next in line"
            : h.queue_position
              ? `${ordinal(h.queue_position)} in line`
              : "In the queue"}
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          for {h.team_label}. The most urgent cases are picked up first, so your place can change.
        </p>
      </div>
    );
  }
  if (h.status === "in_progress" || h.status === "blocked") {
    return (
      <div className="flex items-center gap-3">
        <Avatar name={agent} />
        <div className="min-w-0">
          <p className="font-semibold">
            {h.status === "blocked" ? (
              <>
                <PauseCircle aria-hidden className="mr-1 inline size-4 align-[-2px]" />
                On hold with {agent}
              </>
            ) : (
              `${agent} from DNA support is on it`
            )}
          </p>
          <p className="text-muted-foreground text-sm">
            {h.status === "blocked"
              ? "They need more information and may contact you."
              : `${h.team_label}. They have your conversation and what you chose to share.`}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-900">
        <Check aria-hidden className="size-5" />
      </span>
      <p className="font-semibold">
        Resolved{h.assigned_to ? ` by ${h.assigned_to}` : ""}
        {h.resolved_at && (
          <span className="text-muted-foreground font-normal"> at {clock(h.resolved_at)}</span>
        )}
      </p>
    </div>
  );
}

/** Sent → Picked up → Resolved across the card's full width, with each step's time. */
function Timeline({ h }: { h: Handoff }) {
  const steps = [
    { label: "Sent", at: h.created_at },
    { label: "Picked up", at: h.picked_up_at },
    { label: "Resolved", at: h.resolved_at },
  ];
  const current = steps.findIndex((s) => !s.at);
  const reached = current === -1 ? steps.length - 1 : current - 1;
  const align = ["items-start text-left", "items-center text-center", "items-end text-right"];
  return (
    <div className="relative">
      {/* The track runs between the first and last dot; the filled part shows progress. */}
      <span aria-hidden className="absolute top-[5px] right-1.5 left-1.5 h-0.5 bg-[#f3e4ec]" />
      <span
        aria-hidden
        className="bg-brand absolute top-[5px] left-1.5 h-0.5"
        style={{ width: `calc((100% - 12px) * ${reached / (steps.length - 1)})` }}
      />
      <ol className="relative grid grid-cols-3" aria-label="Progress">
        {steps.map((s, i) => (
          <li key={s.label} className={cn("flex flex-col gap-1.5", align[i])}>
            <span
              aria-hidden
              className={cn(
                "size-3 rounded-full",
                s.at
                  ? "bg-brand"
                  : i === current
                    ? "border-brand border-2 bg-white"
                    : "border-2 border-[#f3e4ec] bg-white",
              )}
            />
            <span className="text-xs font-semibold">{s.label}</span>
            <span className="text-muted-foreground text-xs">
              {s.at ? clock(s.at) : i === current ? "Waiting" : "–"}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** One check that went to a person: where it stands, the timeline, what was shared. */
export function HandoffCard({
  conversation: c,
  handoff: h,
}: {
  conversation: AccountConversation;
  handoff: Handoff;
}) {
  const { openChat } = useChat();
  const shared = [
    "Your conversation",
    ...h.shared,
    ...(h.screenshots ? [`${h.screenshots} screenshot${h.screenshots === 1 ? "" : "s"}`] : []),
  ];
  const headingId = `handoff-${h.reference}`;
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex flex-col gap-5 rounded-2xl border bg-white p-5 shadow-[0_1px_2px_rgb(60_20_40/0.04),0_4px_16px_rgb(60_20_40/0.04)] sm:p-6",
        h.status === "done" ? "border-[#eee3e8]" : "border-brand/35",
      )}
    >
      <div className="flex flex-col gap-2">
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <Headset aria-hidden className="text-brand size-4" />
          <span className="text-foreground font-semibold">{h.reference}</span>
          <span aria-hidden>·</span>
          <span>{PRIORITY[h.severity]}</span>
          <span
            className={cn(
              "ml-auto rounded-md px-2 py-0.5 font-semibold",
              STATUS[h.status].className,
            )}
          >
            {STATUS[h.status].label}
          </span>
        </div>
        <h3 id={headingId} className="text-lg leading-snug font-bold" lang={c.language}>
          {c.title}
        </h3>
      </div>

      <Progress h={h} />
      <Timeline h={h} />

      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-[#f3e4ec] pt-4">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-semibold">Shared with the agent</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {shared.map((item) => (
              <li key={item} className="bg-muted rounded-md px-2 py-0.5 text-xs">
                {item}
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={() => void openChat(c.session_id)}
          className="text-brand hover:text-brand/80 inline-flex items-center gap-1 text-sm font-semibold transition-colors duration-150"
        >
          Open the chat
          <ArrowRight aria-hidden className="size-4" />
        </button>
      </div>
    </section>
  );
}
