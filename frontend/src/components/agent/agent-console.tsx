"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlarmClock,
  Building2,
  Clock,
  Headset,
  ImageIcon,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import {
  SEVERITIES,
  TICKET_STATUSES,
  listTickets,
  updateTicketStatus,
  type Severity,
  type Ticket,
  type TicketStatus,
} from "@/lib/agent-api";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { TicketDetail } from "./ticket-detail";
import { SEVERITY_META, STATUS_META, ago, duration } from "./ticket-meta";

const POLL_MS = 4000;

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

type Audience = "all" | Ticket["audience"];

/**
 * Jira-style board of handoff tickets: Backlog, In progress, Blocked, Done.
 * Polls the backend so a "Talk to a person" in the chat appears here live.
 */
export function AgentConsole({
  agentName,
  onSignOut,
  onSessionExpired,
}: {
  agentName: string;
  onSignOut: () => void;
  onSessionExpired: () => void;
}) {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [severities, setSeverities] = useState<Set<Severity>>(new Set());
  const [team, setTeam] = useState("all");
  const [audience, setAudience] = useState<Audience>("all");
  const [query, setQuery] = useState("");
  const [openRef, setOpenRef] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TicketStatus | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<Ticket | null>(null);
  // Set on each load; 0 until then (cards only render once tickets have loaded).
  const [now, setNow] = useState(0);
  const known = useRef<Set<string> | null>(null);
  // Read through a ref so the polling loop is not restarted on every render.
  const expired = useRef(onSessionExpired);
  useEffect(() => {
    expired.current = onSessionExpired;
  });

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const list = await listTickets();
        if (!alive) return;
        setLoadError(false);
        setNow(Date.now());
        if (known.current) {
          const arrived = list.filter((t) => !known.current?.has(t.reference));
          if (arrived.length > 0) {
            setFresh((prev) => new Set([...prev, ...arrived.map((t) => t.reference)]));
            setToast(arrived[0]);
          }
        }
        known.current = new Set(list.map((t) => t.reference));
        setTickets(list);
      } catch (err) {
        if (!alive) return;
        if (err instanceof ApiError && err.status === 401) expired.current();
        else setLoadError(true);
      }
    }
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const teams = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tickets ?? []) map.set(t.team, t.team_label);
    return [...map.entries()];
  }, [tickets]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (tickets ?? [])
      .filter((t) => severities.size === 0 || severities.has(t.severity))
      .filter((t) => team === "all" || t.team === team)
      .filter((t) => audience === "all" || t.audience === audience)
      .filter(
        (t) =>
          !q ||
          t.reference.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.team_label.toLowerCase().includes(q),
      )
      .sort(
        (a, b) =>
          SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
          b.created_at.localeCompare(a.created_at),
      );
  }, [tickets, severities, team, audience, query]);

  const counts = useMemo(() => {
    const c: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const t of tickets ?? []) if (t.status !== "done") c[t.severity] += 1;
    return c;
  }, [tickets]);

  async function move(reference: string, status: TicketStatus) {
    const before = tickets;
    setTickets(
      (prev) => prev?.map((t) => (t.reference === reference ? { ...t, status } : t)) ?? null,
    );
    setFresh((prev) => {
      const next = new Set(prev);
      next.delete(reference);
      return next;
    });
    try {
      const updated = await updateTicketStatus(reference, status);
      setTickets((prev) => prev?.map((t) => (t.reference === reference ? updated : t)) ?? null);
    } catch {
      setTickets(before);
    }
  }

  function toggleSeverity(severity: Severity) {
    setSeverities((prev) => {
      const next = new Set(prev);
      if (next.has(severity)) next.delete(severity);
      else next.add(severity);
      return next;
    });
  }

  function open(reference: string) {
    setOpenRef(reference);
    setFresh((prev) => {
      const next = new Set(prev);
      next.delete(reference);
      return next;
    });
  }

  const filtersActive = severities.size > 0 || team !== "all" || audience !== "all" || query !== "";
  const openTicket = tickets?.find((t) => t.reference === openRef) ?? null;

  return (
    <div className="theme-dna flex min-h-full flex-1 flex-col bg-white">
      <header className="border-border sticky top-0 z-30 border-b bg-white">
        <div className="flex h-16 flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="font-heading text-brand text-2xl leading-none font-bold tracking-tight">
              DNA
            </span>
            <span className="bg-border h-6 w-px" aria-hidden />
            <h1 className="font-heading flex items-center gap-1.5 text-base font-semibold">
              <Headset aria-hidden className="text-brand size-4.5" />
              Support console
            </h1>
            <span className="bg-brand-soft text-accent-foreground ml-1 hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold sm:flex">
              <span className="relative flex size-2">
                <span className="bg-brand absolute inline-flex size-full animate-ping rounded-full opacity-50" />
                <span className="bg-brand relative inline-flex size-2 rounded-full" />
              </span>
              Live
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground hidden md:inline">Prototype · demo account</span>
            <span className="border-border flex items-center gap-2 rounded-full border py-1 pr-3 pl-1">
              <span className="bg-brand text-brand-foreground flex size-7 items-center justify-center rounded-full text-xs font-bold">
                {agentName
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </span>
              <span className="font-medium">{agentName}</span>
            </span>
            <button
              type="button"
              onClick={onSignOut}
              className="text-brand hover:bg-brand-soft inline-flex h-9 items-center gap-1.5 rounded-full px-3 font-semibold transition-colors duration-150"
            >
              <LogOut aria-hidden className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="border-border border-b bg-[#fdf8fb]">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <label className="relative min-w-52 flex-1 sm:max-w-xs">
            <span className="sr-only">Search tickets</span>
            <Search
              aria-hidden
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reference, text or team"
              className="border-input focus-visible:border-brand h-9 w-full rounded-full border pr-3 pl-9 text-sm outline-none"
            />
          </label>

          <div role="group" aria-label="Severity" className="flex flex-wrap items-center gap-1.5">
            {SEVERITIES.map((severity) => {
              const meta = SEVERITY_META[severity];
              const on = severities.has(severity);
              return (
                <button
                  key={severity}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleSeverity(severity)}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors duration-150",
                    on
                      ? "border-brand bg-brand text-brand-foreground"
                      : "border-border hover:border-brand/40 bg-white",
                  )}
                >
                  <span aria-hidden className={cn("size-2 rounded-full", meta.dot)} />
                  {meta.label}
                  <span
                    className={cn("tabular-nums", on ? "text-white/80" : "text-muted-foreground")}
                  >
                    {counts[severity]}
                  </span>
                </button>
              );
            })}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Team</span>
            <select
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="border-input h-9 rounded-full border bg-white px-3 text-sm"
            >
              <option value="all">All teams</option>
              {teams.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Customer</span>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as Audience)}
              className="border-input h-9 rounded-full border bg-white px-3 text-sm"
            >
              <option value="all">All</option>
              <option value="consumer">Private</option>
              <option value="small_business">Business</option>
            </select>
          </label>

          {filtersActive && (
            <button
              type="button"
              onClick={() => {
                setSeverities(new Set());
                setTeam("all");
                setAudience("all");
                setQuery("");
              }}
              className="text-brand inline-flex items-center gap-1 text-sm font-semibold"
            >
              <X aria-hidden className="size-4" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      <main className="flex-1 overflow-x-auto">
        {tickets === null ? (
          <p className="text-muted-foreground flex items-center gap-2 p-6 text-sm">
            <RefreshCw aria-hidden className="size-4 animate-spin" />
            {loadError ? "Can't reach the backend. Retrying…" : "Loading tickets…"}
          </p>
        ) : (
          <div className="grid min-w-[1040px] grid-cols-4 gap-4 p-4 sm:p-6">
            {TICKET_STATUSES.map((status) => {
              const meta = STATUS_META[status];
              const column = visible.filter((t) => t.status === status);
              return (
                <section
                  key={status}
                  aria-labelledby={`col-${status}`}
                  onDragOver={(e) => {
                    if (!dragging) return;
                    e.preventDefault();
                    setDropTarget(status);
                  }}
                  onDragLeave={() => setDropTarget((cur) => (cur === status ? null : cur))}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragging) void move(dragging, status);
                    setDragging(null);
                    setDropTarget(null);
                  }}
                  className={cn(
                    "flex min-h-[60vh] flex-col gap-3 rounded-2xl border p-3 transition-colors duration-150",
                    meta.column,
                    dropTarget === status && "bg-brand-soft outline-brand outline-2 outline-dashed",
                  )}
                >
                  <h2 id={`col-${status}`} className="flex items-center gap-2 px-1 pt-0.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ring-1 ring-inset",
                        meta.pill,
                      )}
                    >
                      <meta.icon aria-hidden className="size-4" />
                      {meta.label}
                    </span>
                    <span className="text-muted-foreground text-sm font-semibold tabular-nums">
                      {column.length}
                    </span>
                  </h2>
                  <ul className="flex flex-col gap-2.5">
                    {column.map((ticket) => (
                      <li key={ticket.reference}>
                        <TicketCard
                          ticket={ticket}
                          now={now}
                          fresh={fresh.has(ticket.reference)}
                          dragging={dragging === ticket.reference}
                          onOpen={() => open(ticket.reference)}
                          onDragStart={() => setDragging(ticket.reference)}
                          onDragEnd={() => {
                            setDragging(null);
                            setDropTarget(null);
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                  {column.length === 0 && (
                    <p className="text-muted-foreground px-1 text-xs">
                      {filtersActive ? "No tickets match the filters." : "Nothing here."}
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>

      {toast && (
        <button
          type="button"
          onClick={() => {
            open(toast.reference);
            setToast(null);
          }}
          className="border-brand/30 border-l-brand animate-in fade-in slide-in-from-bottom-2 fixed right-4 bottom-4 z-30 flex max-w-sm items-start gap-3 rounded-2xl border border-l-4 bg-white p-4 text-left shadow-[0_12px_32px_rgb(218_0_112/0.18)] duration-200"
        >
          <span className="bg-brand text-brand-foreground flex size-9 shrink-0 items-center justify-center rounded-full">
            <Headset aria-hidden className="size-4.5" />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">
              New handoff · {toast.reference} · {SEVERITY_META[toast.severity].label}
            </span>
            <span className="text-muted-foreground line-clamp-2 text-sm">{toast.title}</span>
          </span>
        </button>
      )}
      <p aria-live="polite" className="sr-only">
        {toast ? `New handoff ${toast.reference}, ${SEVERITY_META[toast.severity].label}` : ""}
      </p>

      <TicketDetail
        ticket={openTicket}
        now={now}
        onClose={() => setOpenRef(null)}
        onMove={(status) => openTicket && void move(openTicket.reference, status)}
      />
    </div>
  );
}

function TicketCard({
  ticket,
  now,
  fresh,
  dragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  ticket: Ticket;
  now: number;
  fresh: boolean;
  dragging: boolean;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const severity = SEVERITY_META[ticket.severity];
  // Open critical tickets show how long the customer has been waiting.
  const showWaiting = ticket.severity === "critical" && ticket.status !== "done";
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", ticket.reference);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={cn(
        "flex w-full cursor-grab flex-col gap-2.5 overflow-hidden rounded-xl border bg-white p-3.5 text-left shadow-sm transition-[box-shadow,opacity,border-color] duration-150 hover:shadow-md active:cursor-grabbing",
        fresh ? "border-brand ring-brand/30 ring-4" : "border-transparent",
        // Finished work steps back so open tickets stand out.
        ticket.status === "done" && "opacity-70 shadow-none hover:opacity-100",
        "border-l-4",
        severity.edge,
        dragging && "opacity-40",
      )}
    >
      {showWaiting && (
        <span className="bg-risk-critical text-risk-critical-fg -mx-3.5 -mt-3.5 mb-0.5 flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold">
          <AlarmClock aria-hidden className="alarm-ring size-3.5 shrink-0" />
          Waiting {duration((now - new Date(ticket.created_at).getTime()) / 60_000)}
        </span>
      )}
      <span className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold",
            severity.chip,
          )}
        >
          {ticket.severity === "critical" && ticket.status !== "done" ? (
            <span aria-hidden className="relative flex size-2">
              <span className="bg-risk-critical-line absolute inline-flex size-full animate-ping rounded-full opacity-60" />
              <span className="bg-risk-critical-line relative inline-flex size-2 rounded-full" />
            </span>
          ) : (
            <severity.icon aria-hidden className="size-3.5" />
          )}
          {severity.label}
        </span>
        <span className="flex items-center gap-1.5">
          {fresh && (
            <span className="bg-brand text-brand-foreground rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold">
              New
            </span>
          )}
          {ticket.demo && (
            <span className="text-muted-foreground border-border rounded-full border px-2 py-0.5 text-[0.6875rem] font-medium">
              Demo
            </span>
          )}
        </span>
      </span>
      <span lang={ticket.language} className="line-clamp-3 text-sm font-medium">
        {ticket.title}
      </span>
      {ticket.advice && (
        <span className="text-muted-foreground flex items-start gap-1.5 text-xs">
          <ShieldCheck aria-hidden className="text-brand mt-px size-3.5 shrink-0" />
          {ticket.advice.action_label}
        </span>
      )}
      <span className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="font-heading text-foreground font-semibold tracking-wide">
          {ticket.reference}
        </span>
        <span className="flex items-center gap-1">
          {ticket.audience === "consumer" ? (
            <User aria-hidden className="size-3.5" />
          ) : (
            <Building2 aria-hidden className="size-3.5" />
          )}
          {ticket.team_label}
        </span>
        <span className="flex items-center gap-1">
          <Clock aria-hidden className="size-3.5" />
          {ago(ticket.created_at, now)}
        </span>
        <span className="border-border rounded-sm border px-1 font-semibold">
          {ticket.language.toUpperCase()}
        </span>
        {ticket.screenshots > 0 && (
          <span className="flex items-center gap-1">
            <ImageIcon aria-hidden className="size-3.5" />
            {ticket.screenshots}
          </span>
        )}
      </span>
    </button>
  );
}
