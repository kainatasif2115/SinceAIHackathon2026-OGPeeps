import {
  Ban,
  CircleCheck,
  CircleDashed,
  CircleExclamationPoint,
  Inbox,
  Info,
  OctagonExclamationPoint,
  TriangleExclamationPoint,
} from "lucide-react";
import type { Severity, TicketStatus } from "@/lib/agent-api";

type StatusStyle = {
  label: string;
  icon: typeof Inbox;
  /** Soft coloured pill for the column header: background, text and outline. */
  pill: string;
  /** Small dot, e.g. next to the status select. */
  dot: string;
  /** Light wash and border for the whole column. */
  column: string;
};

// Grey = waiting, blue = being worked on, red = stuck, green = finished.
export const STATUS_META: Record<TicketStatus, StatusStyle> = {
  backlog: {
    label: "Backlog",
    icon: Inbox,
    pill: "bg-slate-100 text-slate-700 ring-slate-200",
    dot: "bg-slate-400",
    column: "border-slate-200 bg-slate-50/80",
  },
  in_progress: {
    label: "In progress",
    icon: CircleDashed,
    pill: "bg-sky-50 text-sky-700 ring-sky-200",
    dot: "bg-sky-500",
    column: "border-sky-200/80 bg-sky-50/70",
  },
  blocked: {
    label: "Blocked",
    icon: Ban,
    pill: "bg-rose-50 text-rose-700 ring-rose-200",
    dot: "bg-rose-500",
    column: "border-rose-200/80 bg-rose-50/70",
  },
  done: {
    label: "Done",
    icon: CircleCheck,
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
    column: "border-emerald-200/80 bg-emerald-50/70",
  },
};

type SeverityStyle = {
  label: string;
  icon: typeof Inbox;
  chip: string;
  dot: string;
  /** Thick left edge on the ticket card, so severity reads at a glance. */
  edge: string;
  /**
   * Target time for an agent to pick an open ticket up, in minutes (null = no
   * target shown). Prototype assumptions, not DNA's actual service levels.
   */
  respondWithin: number | null;
};

// Same icons as the risk levels on the chat's answer card.
export const SEVERITY_META: Record<Severity, SeverityStyle> = {
  critical: {
    label: "Critical",
    icon: OctagonExclamationPoint,
    // Light like the others; a thin outline and the pulsing dot set it apart.
    chip: "bg-risk-critical text-risk-critical-fg ring-1 ring-inset ring-risk-critical-line/40",
    dot: "bg-risk-critical-line",
    edge: "border-l-risk-critical-line",
    respondWithin: 15,
  },
  high: {
    label: "High",
    icon: TriangleExclamationPoint,
    chip: "bg-risk-high text-risk-high-fg",
    dot: "bg-risk-high-line",
    edge: "border-l-risk-high-line",
    respondWithin: 60,
  },
  medium: {
    label: "Medium",
    icon: CircleExclamationPoint,
    chip: "bg-risk-medium text-risk-medium-fg",
    dot: "bg-risk-medium-line",
    edge: "border-l-risk-medium-line",
    respondWithin: null,
  },
  low: {
    label: "Low",
    icon: Info,
    chip: "bg-risk-safe text-risk-safe-fg",
    dot: "bg-risk-safe-line",
    edge: "border-l-risk-safe-line",
    respondWithin: null,
  },
};

/** "15 min", "1 h", "1 h 20 min". */
export function duration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
}

export function ago(iso: string, now: number): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min ago`;
}
