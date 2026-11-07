/**
 * Optional customer accounts. The assistant works without one; signing in adds the
 * account page (recent conversations, handoff status, delete account). The session is
 * an HttpOnly cookie set by the backend, so nothing here touches tokens.
 */
import { z } from "zod";
import { ApiError } from "./api";

const accountSchema = z.object({
  email: z.string(),
  name: z.string(),
  created_at: z.string(),
  kind: z.enum(["private", "business"]),
  company: z.string().nullable(),
  role: z.enum(["owner", "member"]).nullable(),
  pending_invite: z.string().nullable(),
});

const conversationSchema = z.object({
  session_id: z.string(),
  title: z.string(),
  language: z.enum(["fi", "en", "sv"]),
  started_at: z.string(),
  expires_at: z.string(),
  state: z.enum(["in_progress", "answered"]),
  risk_level: z.string().nullable(),
  action_label: z.string().nullable(),
  handoff_reference: z.string().nullable(),
  handoff_status: z.enum(["backlog", "in_progress", "blocked", "done"]).nullable(),
});

const teamSchema = z.object({
  name: z.string(),
  role: z.enum(["owner", "member"]),
  members: z.array(
    z.object({ name: z.string(), email: z.string(), role: z.enum(["owner", "member"]) }),
  ),
  invites: z.array(z.string()),
});

const teamConversationSchema = conversationSchema.extend({ author: z.string() });

export type Account = z.infer<typeof accountSchema>;
export type AccountKind = Account["kind"];
export type AccountConversation = z.infer<typeof conversationSchema>;
export type Team = z.infer<typeof teamSchema>;
export type TeamConversation = z.infer<typeof teamConversationSchema>;

async function call(path: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(path, { cache: "no-store", signal: AbortSignal.timeout(15_000), ...init });
  } catch {
    throw new ApiError(0, "Can't reach the service. Check your connection and try again.");
  }
  if (!res.ok) {
    const data: unknown = await res.json().catch(() => null);
    const detail =
      data && typeof data === "object" && "detail" in data && typeof data.detail === "string"
        ? data.detail
        : res.statusText;
    throw new ApiError(res.status, detail);
  }
  return res;
}

async function json<T>(res: Response, schema: z.ZodType<T>): Promise<T> {
  const parsed = schema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) throw new ApiError(-1, "Unexpected response from the service");
  return parsed.data;
}

function post(path: string, body: unknown): Promise<Response> {
  return call(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function signUp(input: {
  email: string;
  name: string;
  password: string;
  kind: AccountKind;
  company: string;
}): Promise<Account> {
  return json(await post("/api/account/signup", input), accountSchema);
}

export async function logIn(email: string, password: string): Promise<Account> {
  return json(await post("/api/account/login", { email, password }), accountSchema);
}

export async function logOut(): Promise<void> {
  await call("/api/account/logout", { method: "POST" });
}

/** The signed-in account, or null when signed out. */
export async function getAccount(): Promise<Account | null> {
  try {
    return await json(await call("/api/account/me"), accountSchema);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export async function listConversations(): Promise<AccountConversation[]> {
  return json(await call("/api/account/conversations"), z.array(conversationSchema));
}

export async function deleteAccount(): Promise<void> {
  await call("/api/account", { method: "DELETE" });
}

// --- Business teams ------------------------------------------------------------------

const enc = encodeURIComponent;

export async function getTeam(): Promise<Team> {
  return json(await call("/api/account/team"), teamSchema);
}

export async function inviteColleague(email: string): Promise<Team> {
  return json(await post("/api/account/team/invites", { email }), teamSchema);
}

export async function cancelInvite(email: string): Promise<Team> {
  return json(
    await call(`/api/account/team/invites/${enc(email)}`, { method: "DELETE" }),
    teamSchema,
  );
}

export async function removeMember(email: string): Promise<Team> {
  return json(
    await call(`/api/account/team/members/${enc(email)}`, { method: "DELETE" }),
    teamSchema,
  );
}

export async function joinTeam(): Promise<Account> {
  return json(await call("/api/account/team/join", { method: "POST" }), accountSchema);
}

export async function leaveTeam(): Promise<Account> {
  return json(await call("/api/account/team/leave", { method: "POST" }), accountSchema);
}

export async function listTeamConversations(): Promise<TeamConversation[]> {
  return json(await call("/api/account/team/conversations"), z.array(teamConversationSchema));
}
