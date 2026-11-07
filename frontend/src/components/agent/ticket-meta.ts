import { Ban, CircleCheck, CircleDashed, Inbox } from "lucide-react";
import type { Severity, TicketStatus } from "@/lib/agent-api";

type StatusStyle = {
  label: string;
  icon: typeof Inbox;
  /** Soft coloured pill for the column header: background, text and outline. */
  pill: string;
  /** Small dot, e.g. next to the status select. */
  dot: string;
};

// Grey = waiting, blue = being worked on, red = stuck, green = finished.
export const STATUS_META: Record<TicketStatus, StatusStyle> = {
  backlog: {
    label: "Backlog",
    icon: Inbox,
    pill: "bg-slate-100 text-slate-700 ring-slate-200",
    dot: "bg-slate-400",
  },
  in_progress: {
    label: "In progress",
    icon: CircleDashed,
    pill: "bg-sky-50 text-sky-700 ring-sky-200",
    dot: "bg-sky-500",
  },
  blocked: {
    label: "Blocked",
    icon: Ban,
    pill: "bg-rose-50 text-rose-700 ring-rose-200",
    dot: "bg-rose-500",
  },
  done: {
    label: "Done",
    icon: CircleCheck,
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
};

type SeverityStyle = {
  label: string;
  chip: string;
  dot: string;
  /** Thick left edge on the ticket card, so severity reads at a glance. */
  edge: string;
};

export const SEVERITY_META: Record<Severity, SeverityStyle> = {
  critical: {
    label: "Critical",
    chip: "bg-risk-critical text-risk-critical-fg",
    dot: "bg-risk-critical-line",
    edge: "border-l-risk-critical-line",
  },
  high: {
    label: "High",
    chip: "bg-risk-high text-risk-high-fg",
    dot: "bg-risk-high-line",
    edge: "border-l-risk-high-line",
  },
  medium: {
    label: "Medium",
    chip: "bg-risk-medium text-risk-medium-fg",
    dot: "bg-risk-medium-line",
    edge: "border-l-risk-medium-line",
  },
  low: {
    label: "Low",
    chip: "bg-risk-safe text-risk-safe-fg",
    dot: "bg-risk-safe-line",
    edge: "border-l-risk-safe-line",
  },
};

export function ago(iso: string, now: number): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min ago`;
}
