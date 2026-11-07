"use client";

import { useEffect, useRef } from "react";
import { Building2, Clock, ImageIcon, LockKeyhole, ShieldCheck, User, X } from "lucide-react";
import { TICKET_STATUSES, type Ticket, type TicketStatus } from "@/lib/agent-api";
import { cn } from "@/lib/utils";
import { SEVERITY_META, STATUS_META, ago } from "./ticket-meta";

const URGENCY_LABELS: Record<Ticket["urgency"], string> = {
  none: "Nothing to do",
  routine: "When there is time",
  today: "Today",
  immediate: "Right now",
};
const LANGUAGE_NAMES: Record<Ticket["language"], string> = {
  fi: "Finnish",
  en: "English",
  sv: "Swedish",
};

/** Slide-out panel with everything the agent needs to pick a ticket up. */
export function TicketDetail({
  ticket,
  now,
  onClose,
  onMove,
}: {
  ticket: Ticket | null;
  now: number;
  onClose: () => void;
  onMove: (status: TicketStatus) => void;
}) {
  const open = ticket !== null;
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-title"
        tabIndex={-1}
        inert={!open}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-y-auto bg-white shadow-[0_0_40px_rgb(0_0_0/0.18)] transition-transform duration-250 ease-out outline-none sm:w-[520px]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {ticket && (
          <>
            <header className="border-border sticky top-0 z-10 flex flex-col gap-3 border-b bg-white px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <p className="font-heading text-muted-foreground text-sm font-semibold tracking-wide">
                    {ticket.reference}
                    {ticket.demo && (
                      <span className="border-border ml-2 rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium">
                        Demo ticket
                      </span>
                    )}
                  </p>
                  <h2 id="ticket-title" lang={ticket.language} className="text-lg font-semibold">
                    {ticket.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="hover:bg-muted flex size-10 shrink-0 items-center justify-center rounded-full"
                >
                  <X aria-hidden className="size-5" />
                  <span className="sr-only">Close ticket</span>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-xs font-semibold",
                    SEVERITY_META[ticket.severity].chip,
                  )}
                >
                  {SEVERITY_META[ticket.severity].label}
                </span>
                <label className="ml-auto flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span
                    aria-hidden
                    className={cn("size-2.5 rounded-full", STATUS_META[ticket.status].dot)}
                  />
                  <select
                    value={ticket.status}
                    onChange={(e) => onMove(e.target.value as TicketStatus)}
                    className="border-input h-9 rounded-full border bg-white px-3 text-sm font-medium"
                  >
                    {TICKET_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_META[status].label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </header>

            <div className="flex flex-col gap-6 px-5 py-5">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Fact label="Customer">
                  <span className="flex items-center gap-1.5">
                    {ticket.audience === "consumer" ? (
                      <User aria-hidden className="size-4" />
                    ) : (
                      <Building2 aria-hidden className="size-4" />
                    )}
                    {ticket.audience === "consumer" ? "Private customer" : "Small business"}
                  </span>
                </Fact>
                <Fact label="Team">{ticket.team_label}</Fact>
                <Fact label="Urgency">{URGENCY_LABELS[ticket.urgency]}</Fact>
                <Fact label="Language">{LANGUAGE_NAMES[ticket.language]}</Fact>
                <Fact label="Opened">
                  <span className="flex items-center gap-1.5">
                    <Clock aria-hidden className="size-4" />
                    {ago(ticket.created_at, now)}
                  </span>
                </Fact>
                {ticket.screenshots > 0 && (
                  <Fact label="Screenshots">
                    <span className="flex items-center gap-1.5">
                      <ImageIcon aria-hidden className="size-4" />
                      {ticket.screenshots} shared in chat
                    </span>
                  </Fact>
                )}
              </dl>

              <Section title="What the customer said">
                <ol className="flex flex-col gap-2">
                  {ticket.transcript.map((line, index) => (
                    <li
                      key={index}
                      lang={line.role === "customer" ? ticket.language : undefined}
                      className={cn(
                        "max-w-[90%] rounded-xl px-3.5 py-2.5 text-sm",
                        line.role === "customer"
                          ? "bg-muted self-start"
                          : "bg-brand-soft text-accent-foreground self-end",
                      )}
                    >
                      <span className="mb-0.5 block text-[0.6875rem] font-semibold uppercase opacity-70">
                        {line.role === "customer" ? "Customer" : "Assistant"}
                      </span>
                      {line.text}
                    </li>
                  ))}
                </ol>
              </Section>

              {ticket.advice && (
                <Section title="What the assistant advised">
                  <div className="border-border flex flex-col gap-2 rounded-xl border p-4">
                    <p className="font-heading flex items-center gap-2 font-semibold">
                      <ShieldCheck aria-hidden className="text-brand size-4.5 shrink-0" />
                      {ticket.advice.action_label}
                    </p>
                    <p className="text-sm">{ticket.advice.advice_text}</p>
                    {ticket.advice.steps.length > 0 && (
                      <ol className="ml-5 list-decimal text-sm">
                        {ticket.advice.steps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    )}
                    <p className="text-muted-foreground text-xs">
                      Assistant confidence: {Math.round(ticket.advice.confidence * 100)} %
                    </p>
                  </div>
                </Section>
              )}

              <Section title="Data the customer allowed">
                {ticket.consent.allowed.length === 0 && ticket.consent.declined.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No account data was requested. Only what the customer wrote is shared.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {ticket.consent.allowed.map((field) => (
                      <li key={field} className="flex items-center gap-2">
                        <LockKeyhole aria-hidden className="text-risk-safe-fg size-4" />
                        Allowed: <code className="text-xs">{field}</code>
                      </li>
                    ))}
                    {ticket.consent.declined.map((field) => (
                      <li key={field} className="text-muted-foreground flex items-center gap-2">
                        <LockKeyhole aria-hidden className="size-4" />
                        Declined: <code className="text-xs">{field}</code>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <p className="text-muted-foreground border-border border-t pt-4 text-xs">
                Prototype. Tickets hold only what the customer wrote and chose in the chat, and are
                deleted after 24 hours with the conversation.
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}
