"""Demo staff sign-in for the support-agent console.

One demo account, configured in backend/.env (AGENT_DEMO_USER and
AGENT_DEMO_PASSWORD), never in code. Signing in sets a signed, HttpOnly,
SameSite=Strict cookie that the /api/agent/* endpoints require. In production
the console would sit behind DNA's own staff single sign-on instead.
"""

import hmac
import os
import time

from django.core import signing
from ninja.security import APIKeyCookie

COOKIE = "agent_session"
SALT = "agent-console"
MAX_AGE = 8 * 60 * 60  # one working shift
DISPLAY_NAME = "Demo Agent"


def username() -> str:
    return os.environ.get("AGENT_DEMO_USER") or "demo.agent"


def is_configured() -> bool:
    return bool(os.environ.get("AGENT_DEMO_PASSWORD"))


def check(user: str, password: str) -> bool:
    expected = os.environ.get("AGENT_DEMO_PASSWORD", "")
    ok = (
        bool(expected)
        and hmac.compare_digest(user.strip().lower(), username().lower())
        and hmac.compare_digest(password, expected)
    )
    if not ok:
        time.sleep(0.4)  # slows down guessing; enough for a single demo account
    return ok


def issue_token() -> str:
    return signing.dumps({"user": username()}, salt=SALT)


class AgentCookieAuth(APIKeyCookie):
    """Accepts a valid, unexpired session cookie; returns the agent's display name."""

    param_name = COOKIE

    def authenticate(self, request, key):
        if not key:
            return None
        try:
            data = signing.loads(key, salt=SALT, max_age=MAX_AGE)
        except signing.BadSignature:
            return None
        return DISPLAY_NAME if data.get("user") == username() else None


# Django's CSRF token flow is not used by this JSON API. The cookie is
# SameSite=Strict, so browsers never send it on requests from other sites.
agent_auth = AgentCookieAuth(csrf=False)
