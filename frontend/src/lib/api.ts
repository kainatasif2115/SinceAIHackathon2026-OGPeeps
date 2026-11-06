/**
 * Typed client for the Django Ninja API (backend/api/schemas.py is the source
 * of truth). Responses are validated with zod so a contract drift shows up as
 * a clear error instead of a broken screen.
 *
 * Mock mode: with NEXT_PUBLIC_MOCK_API=1 every call is answered by
 * ./mock-api.ts and the backend is never contacted.
 */
import { z } from "zod";

export const AUDIENCES = ["consumer", "small_business"] as const;
export const LANGUAGES = ["fi", "en", "sv"] as const;
export const RISK_LEVELS = ["none", "low", "medium", "high", "critical"] as const;
export const URGENCIES = ["none", "routine", "today", "immediate"] as const;

const audienceSchema = z.enum(AUDIENCES);
const languageSchema = z.enum(LANGUAGES);

const scenarioSchema = z.object({
  id: z.string(),
  journey: z.string(),
  journey_label: z.string(),
  audience: audienceSchema,
  language: languageSchema,
  title: z.string(),
  opening_message: z.string(),
});

const citationSchema = z.object({ id: z.string(), title: z.string() });

const answerSchema = z.object({
  risk_level: z.enum(RISK_LEVELS),
  urgency: z.enum(URGENCIES),
  primary_action: z.string(),
  action_label: z.string(),
  advice_text: z.string(),
  steps: z.array(z.string()),
  escalation_required: z.boolean(),
  escalation_target: z.string().nullable(),
  escalation_label: z.string().nullable(),
  citations: z.array(citationSchema),
  confidence: z.number(),
});

const questionTurnSchema = z.object({
  type: z.literal("question"),
  text: z.string(),
  topics: z.array(z.string()),
});

const consentTurnSchema = z.object({
  type: z.literal("consent_request"),
  text: z.string(),
  fields: z.array(z.object({ path: z.string(), label: z.string() })),
});

const finalTurnSchema = z.object({
  type: z.literal("final"),
  answer: answerSchema,
});

const sessionSchema = z.object({
  session_id: z.string(),
  turn: z.discriminatedUnion("type", [questionTurnSchema, consentTurnSchema, finalTurnSchema]),
  turns_used: z.number(),
  max_turns: z.number(),
});

const handoffSchema = z.object({ reference: z.string(), summary: z.string() });

const healthSchema = z.object({
  status: z.string(),
  simset_version: z.string(),
  guidance_passages: z.number(),
  claude_configured: z.boolean(),
  mongodb_configured: z.boolean(),
});

export type Audience = z.infer<typeof audienceSchema>;
export type Language = z.infer<typeof languageSchema>;
export type RiskLevel = (typeof RISK_LEVELS)[number];
export type Urgency = (typeof URGENCIES)[number];
export type Scenario = z.infer<typeof scenarioSchema>;
export type Citation = z.infer<typeof citationSchema>;
export type Answer = z.infer<typeof answerSchema>;
export type QuestionTurn = z.infer<typeof questionTurnSchema>;
export type ConsentTurn = z.infer<typeof consentTurnSchema>;
export type FinalTurn = z.infer<typeof finalTurnSchema>;
export type Turn = QuestionTurn | ConsentTurn | FinalTurn;
export type Session = z.infer<typeof sessionSchema>;
export type Handoff = z.infer<typeof handoffSchema>;
export type Health = z.infer<typeof healthSchema>;

export type StartInput = {
  audience: Audience;
  language: Language;
  message: string;
  scenario_id?: string;
};

/**
 * status 0 = network failure or timeout, -1 = the response did not match the
 * contract, otherwise the HTTP status code.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

// The backend calls Claude and can take 5-20 s; give it room before giving up.
const TIMEOUT_MS = 45_000;

async function request<T>(path: string, schema: z.ZodType<T>, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "Network error or timeout");
  }

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      data && typeof data === "object" && "detail" in data && typeof data.detail === "string"
        ? data.detail
        : res.statusText;
    throw new ApiError(res.status, detail);
  }

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    console.error(`Unexpected response from ${path}`, parsed.error);
    throw new ApiError(-1, "Unexpected response from the service");
  }
  return parsed.data;
}

export const isMockMode = process.env.NEXT_PUBLIC_MOCK_API === "1";

async function mock() {
  return import("./mock-api");
}

export async function getScenarios(): Promise<Scenario[]> {
  if (isMockMode) return (await mock()).mockScenarios();
  return request("/api/scenarios", z.array(scenarioSchema));
}

export async function startSession(input: StartInput): Promise<Session> {
  if (isMockMode) return (await mock()).mockStart(input);
  return request("/api/sessions", sessionSchema, input);
}

export async function reply(sessionId: string, text: string): Promise<Session> {
  if (isMockMode) return (await mock()).mockReply(sessionId, text);
  return request(`/api/sessions/${encodeURIComponent(sessionId)}/reply`, sessionSchema, { text });
}

export async function answerConsent(sessionId: string, granted: boolean): Promise<Session> {
  if (isMockMode) return (await mock()).mockConsent(sessionId, granted);
  return request(`/api/sessions/${encodeURIComponent(sessionId)}/consent`, sessionSchema, {
    granted,
  });
}

export async function requestHandoff(sessionId: string): Promise<Handoff> {
  if (isMockMode) return (await mock()).mockHandoff(sessionId);
  return request(`/api/sessions/${encodeURIComponent(sessionId)}/handoff`, handoffSchema, {});
}

export async function getHealth(): Promise<Health> {
  if (isMockMode) return (await mock()).mockHealth();
  return request("/api/health", healthSchema);
}
