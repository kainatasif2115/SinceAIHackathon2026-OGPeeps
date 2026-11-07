import { NextResponse, type NextRequest } from "next/server";

// The name of the account cookie the backend sets on login (backend/api/accounts.py).
const ACCOUNT_COOKIE = "dsa_account";

/**
 * Signed-in visitors skip the landing page: the dashboard is their home. A logged-out
 * visitor gets the landing page exactly as before. This only checks that a login cookie
 * exists; the dashboard itself still verifies it, and sends an expired login to /login.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(ACCOUNT_COOKIE)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: "/" };
