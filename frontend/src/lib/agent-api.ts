/**
 * Support-agent console API: the handoff tickets created by "Talk to a person".
 * Always talks to the backend (there is no mock), since the board only makes
 * sense next to real conversations.
 */
import { z } from "zod";
import { ApiError } from "./api";

export const TICKET_STATUSES = ["backlog", "in_progress", "blocked", "done"] as const;
export const SEVERITIES = ["critical", "high", "medium", "low"] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type Severity = (typeof SEVERITIES)[number];

const ticketSchema = z.object({
  reference: z.string(),
  status: z.enum(TICKET_STATUSES),
  severity: z.enum(SEVERITIES),
  urgency: z.enum(["none", "routine", "today", "immediate"]),
  team: z.string(),
  team_label: z.string(),
  audience: z.enum(["consumer", "small_business"]),
  language: z.enum(["fi", "en", "sv"]),
  title: z.string(),
  transcript: z.array(z.object({ role: z.enum(["customer", "assistant"]), text: z.string() })),
  screenshots: z.number(),
  consent: z.object({ allowed: z.array(z.string()), declined: z.array(z.string()) }),
  advice: z
    .object({
      action_label: z.string(),
      advice_text: z.string(),
      steps: z.array(z.string()),
      confidence: z.number(),
    })
    .nullable(),
  summary: z.string(),
  demo: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Ticket = z.infer<typeof ticketSchema>;

async function call<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { cache: "no-store", signal: AbortSignal.timeout(15_000), ...init });
  } catch {
    throw new ApiError(0, "Network error or timeout");
  }
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  const parsed = schema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) throw new ApiError(-1, "Unexpected response from the service");
  return parsed.data;
}

export function listTickets(): Promise<Ticket[]> {
  return call("/api/agent/tickets", z.array(ticketSchema));
}

export function updateTicketStatus(reference: string, status: TicketStatus): Promise<Ticket> {
  return call(`/api/agent/tickets/${encodeURIComponent(reference)}`, ticketSchema, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}
