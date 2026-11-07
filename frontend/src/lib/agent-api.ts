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

const agentSchema = z.object({ name: z.string() });
export type Agent = z.infer<typeof agentSchema>;

/** The signed-in demo agent, or null when there is no valid session. */
export async function getMe(): Promise<Agent | null> {
  try {
    return await call("/api/agent/me", agentSchema);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export function signIn(username: string, password: string): Promise<Agent> {
  return call("/api/agent/login", agentSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

export async function signOut(): Promise<void> {
  await fetch("/api/agent/logout", { method: "POST", cache: "no-store" }).catch(() => {});
}

// --- Evaluation results (/agent/results) ---------------------------------------

const groupSchema = z.record(z.string(), z.object({ n: z.number(), pass: z.number() }));

const metricsSchema = z.object({
  cases: z.number().optional(),
  safe_action_pass: z.number().nullable().optional(),
  safe_action_pass_ci: z.tuple([z.number(), z.number()]).optional(),
  unsafe_statements: z.number().nullable().optional(),
  false_alarms: z.number().nullable().optional(),
  escalation_recall: z.number().nullable().optional(),
  escalation_false_positives: z.number().optional(),
  asked_decisive: z.number().nullable().optional(),
  scorecard: z.object({
    correctness: z.number().optional(),
    clarity: z.number().optional(),
    uncertainty: z.number().optional(),
    privacy: z.number().optional(),
    weighted: z.number().optional(),
    weighted_ci: z.tuple([z.number(), z.number()]).optional(),
  }),
  by_journey: groupSchema,
  by_language: groupSchema.optional(),
  by_audience: groupSchema.optional(),
  failure_types: z.record(z.string(), z.number()).optional(),
});

const runSchema = z.object({
  file: z.string(),
  label: z.string(),
  note: z.string(),
  metrics: metricsSchema,
});

const resultsSchema = z.object({ runs: z.record(z.string(), runSchema) });

export type RunMetrics = z.infer<typeof metricsSchema>;
export type EvaluationRun = z.infer<typeof runSchema>;
export type EvaluationResults = z.infer<typeof resultsSchema>;

/** The evaluator's output for each saved run, read from results/*.txt by the backend. */
export function getResults(): Promise<EvaluationResults> {
  return call("/api/agent/results", resultsSchema);
}

// --- Test-case browser (/agent/cases) ------------------------------------------

export type CaseRun = "multi" | "single";

const caseSummarySchema = z.object({
  case_id: z.string(),
  journey: z.string(),
  audience: z.string(),
  language: z.enum(["fi", "en", "sv"]),
  opening: z.string(),
  passed: z.boolean(),
  failures: z.array(z.string()),
  benign: z.boolean(),
  twin: z.boolean(),
  our_risk: z.string().nullable(),
  expected_risk: z.string(),
  our_action: z.string().nullable(),
});

const caseListSchema = z.object({
  run: z.string(),
  runs: z.record(z.string(), z.object({ file: z.string(), label: z.string() })),
  cases: z.array(caseSummarySchema),
});

const turnSchema = z.object({
  role: z.string().nullable(),
  type: z.string().nullable(),
  text: z.string(),
  fields: z.array(z.string()),
  granted: z.array(z.string()),
  refused: z.array(z.string()),
});

const caseDetailSchema = z.object({
  case_id: z.string(),
  journey: z.string(),
  audience: z.string(),
  language: z.enum(["fi", "en", "sv"]),
  mode: z.string(),
  passed: z.boolean(),
  failures: z.array(z.object({ type: z.string() }).passthrough()),
  transcript: z.array(turnSchema),
  evidence: z.object({
    artifact: z
      .object({
        type: z.string(),
        sender: z.string().nullable().optional(),
        body: z.string(),
        links: z.array(z.string()).optional(),
        received_at: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable(),
    link_check: z
      .object({
        url: z.string(),
        verdict: z.string(),
        confidence: z.number().nullable().optional(),
        domain_age_days: z.number().nullable().optional(),
        categories: z.array(z.string()).optional(),
      })
      .passthrough()
      .nullable(),
    call_warning: z
      .object({
        number: z.string().nullable().optional(),
        warning: z.string().nullable().optional(),
        confidence: z.number().nullable().optional(),
        answered: z.boolean().nullable().optional(),
        duration_s: z.number().nullable().optional(),
        caller_id_possibly_spoofed: z.boolean().nullable().optional(),
      })
      .passthrough()
      .nullable(),
    needs_consent: z.array(z.string()),
  }),
  ours: z.object({
    risk_level: z.string().nullable(),
    urgency: z.string().nullable(),
    action: z.string().nullable(),
    advice_text: z.string(),
    steps: z.array(z.string()),
    questions_asked: z.array(z.string()),
    escalation_required: z.boolean(),
    escalation_target: z.string().nullable(),
    confidence: z.number().nullable(),
  }),
  expected: z.object({
    risk_level: z.string(),
    urgency: z.string(),
    action: z.string().nullable(),
    also_acceptable: z.array(z.string().nullable()),
    escalation_required: z.boolean(),
    escalation_target: z.string().nullable(),
    must_ask_topics: z.array(z.string()),
    benign: z.boolean(),
    rationale: z.string(),
    reference_answer: z.string(),
  }),
});

export type CaseSummary = z.infer<typeof caseSummarySchema>;
export type CaseDetail = z.infer<typeof caseDetailSchema>;
export type ChatTurn = z.infer<typeof turnSchema>;

export function listCases(run: CaseRun) {
  return call(`/api/agent/cases?run=${run}`, caseListSchema);
}

export function getCase(run: CaseRun, caseId: string): Promise<CaseDetail> {
  return call(`/api/agent/cases/${run}/${encodeURIComponent(caseId)}`, caseDetailSchema);
}

// --- Twin explorer (/agent/twins) -------------------------------------------------

const branchSchema = z.object({
  case_id: z.string(),
  branch: z.string().nullable(),
  hidden_fact: z.string().nullable(),
  question: z.string().nullable(),
  reply: z.string().nullable(),
  expected: z.object({
    risk_level: z.string(),
    action: z.string().nullable(),
    handoff: z.boolean(),
  }),
  ours: z.object({
    risk_level: z.string().nullable(),
    action: z.string().nullable(),
    handoff: z.boolean(),
    advice_text: z.string(),
  }),
  passed: z.boolean(),
  failures: z.array(z.string()),
});

const pairSchema = z.object({
  group: z.string(),
  journey: z.string(),
  audience: z.string(),
  language: z.enum(["fi", "en", "sv"]),
  message: z.string(),
  deciding_topics: z.array(z.string()),
  branches: z.array(branchSchema),
});

export type TwinPair = z.infer<typeof pairSchema>;
export type TwinBranch = z.infer<typeof branchSchema>;

export function listTwins(run: "twins" | "single" = "twins") {
  return call(
    `/api/agent/twins?run=${run}`,
    z.object({ run: z.string(), pairs: z.array(pairSchema) }),
  );
}
