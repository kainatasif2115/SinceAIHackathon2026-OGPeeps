import { Ban, CircleCheck, CircleDashed, Inbox } from "lucide-react";
import type { Severity, TicketStatus } from "@/lib/agent-api";

type StatusStyle = {
  label: string;
  icon: typeof Inbox;
  /** Coloured bar across the top of the column. */
  bar: string;
  /** Icon colour in the column header. */
  tone: string;
  /** Count bubble in the column header. */
  badge: string;
  /** Small dot, e.g. next to the status select. */
  dot: string;
};

// Grey = waiting, blue = being worked on, red = stuck, green = finished.
export const STATUS_META: Record<TicketStatus, StatusStyle> = {
  backlog: {
    label: "Backlog",
    icon: Inbox,
    bar: "border-t-slate-400",
    tone: "text-slate-500",
    badge: "bg-slate-100 text-slate-700",
    dot: "bg-slate-400",
  },
  in_progress: {
    label: "In progress",
    icon: CircleDashed,
    bar: "border-t-sky-500",
    tone: "text-sky-600",
    badge: "bg-sky-100 text-sky-800",
    dot: "bg-sky-500",
  },
  blocked: {
    label: "Blocked",
    icon: Ban,
    bar: "border-t-rose-500",
    tone: "text-rose-600",
    badge: "bg-rose-100 text-rose-800",
    dot: "bg-rose-500",
  },
  done: {
    label: "Done",
    icon: CircleCheck,
    bar: "border-t-emerald-500",
    tone: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-800",
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
