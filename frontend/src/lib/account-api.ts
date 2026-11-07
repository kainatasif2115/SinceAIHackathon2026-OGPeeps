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

export type Account = z.infer<typeof accountSchema>;
export type AccountConversation = z.infer<typeof conversationSchema>;

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

export async function signUp(email: string, name: string, password: string): Promise<Account> {
  return json(await post("/api/account/signup", { email, name, password }), accountSchema);
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
