import { Ban, CircleCheck, CircleDashed, Inbox } from "lucide-react";
import type { Severity, TicketStatus } from "@/lib/agent-api";

export const STATUS_META: Record<TicketStatus, { label: string; icon: typeof Inbox }> = {
  backlog: { label: "Backlog", icon: Inbox },
  in_progress: { label: "In progress", icon: CircleDashed },
  blocked: { label: "Blocked", icon: Ban },
  done: { label: "Done", icon: CircleCheck },
};

export const SEVERITY_META: Record<Severity, { label: string; chip: string; dot: string }> = {
  critical: {
    label: "Critical",
    chip: "bg-risk-critical text-risk-critical-fg",
    dot: "bg-risk-critical-line",
  },
  high: { label: "High", chip: "bg-risk-high text-risk-high-fg", dot: "bg-risk-high-line" },
  medium: {
    label: "Medium",
    chip: "bg-risk-medium text-risk-medium-fg",
    dot: "bg-risk-medium-line",
  },
  low: { label: "Low", chip: "bg-risk-safe text-risk-safe-fg", dot: "bg-risk-safe-line" },
};

export function ago(iso: string, now: number): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min ago`;
}
