"""Usage limits that protect the AI credits on a public link.

Two budgets of AI calls: per visitor per hour (RATE_LIMIT_PER_HOUR, default 30)
and for the whole service per day (DAILY_AI_LIMIT, default 1500), which also
holds when many visitors or bots share the load. A chat that runs out is not
refused: the caller gives the free, safe fallback answer instead, so nobody is
left without advice. Counters live in MongoDB (shared by all Cloud Run
instances, expiring on their own) or in process memory.

The visitor is identified by the first X-Forwarded-For address, which a
determined client can fake; the daily budget is the hard stop.
"""

import os
import threading
from datetime import UTC, datetime, timedelta

from . import db

_memory: dict[str, int] = {}
_lock = threading.Lock()


def per_hour() -> int:
    return int(os.environ.get("RATE_LIMIT_PER_HOUR", "30"))


def per_day() -> int:
    return int(os.environ.get("DAILY_AI_LIMIT", "1500"))


def visitor(request) -> str:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    return forwarded.split(",")[0].strip() or request.META.get("REMOTE_ADDR", "unknown")


def allow(request) -> bool:
    """Counts one AI call; False once the visitor's or the service's budget is used up."""
    now = datetime.now(UTC)
    hour = now.strftime("%Y%m%d%H")
    day = now.strftime("%Y%m%d")
    mine = _count(f"visitor:{visitor(request)}:{hour}", now + timedelta(hours=1))
    everyone = _count(f"service:{day}", now + timedelta(days=1))
    return mine <= per_hour() and everyone <= per_day()


DEMO_PER_HOUR = 60


def allow_demo(request) -> bool:
    """Counts one demo-account rebuild for this visitor (it costs database writes, not AI)."""
    now = datetime.now(UTC)
    key = f"demo:{visitor(request)}:{now.strftime('%Y%m%d%H')}"
    return _count(key, now + timedelta(hours=1)) <= DEMO_PER_HOUR


def _count(key: str, expires_at: datetime) -> int:
    if db.is_configured():
        coll = db.get_db()["rate_limits"]
        coll.create_index("expires_at", expireAfterSeconds=0)
        doc = coll.find_one_and_update(
            {"_id": key},
            {"$inc": {"count": 1}, "$setOnInsert": {"expires_at": expires_at}},
            upsert=True,
            return_document=True,
        )
        return doc["count"]
    with _lock:
        _memory[key] = _memory.get(key, 0) + 1
        return _memory[key]
