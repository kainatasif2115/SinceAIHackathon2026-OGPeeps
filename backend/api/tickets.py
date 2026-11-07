"""Handoff tickets for the support-agent console (`/agent`).

"Talk to a person" turns a conversation into a ticket a DNA support agent can
pick up: severity from the assessed risk, the team from the escalation target,
and only what the customer wrote and chose in the chat. Tickets live in
MongoDB, or in process memory when no database is configured, and expire with
the same 24-hour retention as the chat itself.
"""

import threading
from datetime import UTC, datetime, timedelta

from assistant import vocab

from . import db, presenter
from .sessions import RETENTION

STATUSES = ("backlog", "in_progress", "blocked", "done")
SEVERITIES = ("critical", "high", "medium", "low")

_memory: dict[str, dict] = {}
_lock = threading.Lock()


def _collection():
    coll = db.get_db()["tickets"]
    coll.create_index("expires_at", expireAfterSeconds=0)
    return coll


def _severity(final: dict | None) -> str:
    # A handoff without a final answer is unusual enough to look at soon.
    risk = (final or {}).get("risk_level", "high")
    return risk if risk in SEVERITIES else "low"


# Short team names for the console (the chat's escalation labels are sentence fragments).
TEAM_NAMES = {
    "operator_support_agent": "Customer service · SIM & billing",
    "security_specialist": "Security specialists",
    "human_advisor": "Trained advisors",
    "business_security_support": "Business security",
}


def team_label(target: str) -> str:
    return TEAM_NAMES.get(target) or target.replace("_", " ").capitalize()


def _excerpt(text: str, limit: int = 90) -> str:
    text = " ".join(text.split())
    return text if len(text) <= limit else text[: limit - 1].rsplit(" ", 1)[0] + "…"


def from_conversation(reference: str, session_id: str, conv, final: dict | None) -> dict:
    """A new ticket built from a finished conversation."""
    case = conv.case
    now = datetime.now(UTC)
    advice = presenter.answer(final, "en") if final else None
    target = (final or {}).get("escalation_target") or vocab.default_escalation_target(
        "escalate_to_human", case["audience"]
    )
    transcript = [{"role": "customer", "text": case["opening_message"]}]
    consent = {"allowed": [], "declined": []}
    for h in conv.history:
        if h["role"] == "assistant":
            transcript.append({"role": "assistant", "text": h["text"]})
        elif h["role"] == "user":
            transcript.append({"role": "customer", "text": h["text"]})
        elif h["role"] == "consent":
            consent["allowed" if h["granted"] else "declined"].extend(h["fields"])
    return {
        "reference": reference,
        "session_id": session_id,
        "status": "backlog",
        "severity": _severity(final),
        "urgency": (final or {}).get("urgency", "today"),
        "team": target,
        "team_label": team_label(target),
        "audience": case["audience"],
        "language": case["language"],
        "title": _excerpt(case["opening_message"]),
        "transcript": transcript,
        "screenshots": len(conv.images),
        "consent": consent,
        "advice": advice
        and {
            "action_label": advice["action_label"],
            "advice_text": advice["advice_text"],
            "steps": advice["steps"],
            "confidence": advice["confidence"],
        },
        "summary": presenter.handoff_summary(conv, final),
        "demo": False,
        "created_at": now,
        "updated_at": now,
    }


def create(ticket: dict) -> dict:
    """Store a ticket; a second handoff for the same reference keeps the first."""
    ticket = {**ticket, "expires_at": ticket["created_at"] + RETENTION}
    if db.is_configured():
        coll = _collection()
        coll.update_one({"_id": ticket["reference"]}, {"$setOnInsert": ticket}, upsert=True)
        return coll.find_one({"_id": ticket["reference"]})
    with _lock:
        return _memory.setdefault(ticket["reference"], ticket)


def all_tickets() -> list[dict]:
    _seed_demo_tickets()
    if db.is_configured():
        found = list(_collection().find())
    else:
        with _lock:
            found = list(_memory.values())
    return sorted(found, key=lambda t: t["created_at"], reverse=True)


def update_status(reference: str, status: str) -> dict | None:
    now = datetime.now(UTC)
    if db.is_configured():
        coll = _collection()
        coll.update_one({"_id": reference}, {"$set": {"status": status, "updated_at": now}})
        return coll.find_one({"_id": reference})
    with _lock:
        ticket = _memory.get(reference)
        if ticket:
            ticket.update(status=status, updated_at=now)
        return ticket


# --- Demo tickets ---------------------------------------------------------------------
# A few synthetic tickets so the board is not empty when the demo starts. They are
# marked demo=true and shown with a "Demo" tag; nothing in them is real.

_DEMO = [
    {
        "minutes_ago": 42,
        "status": "in_progress",
        "severity": "critical",
        "urgency": "immediate",
        "team": "operator_support_agent",
        "audience": "consumer",
        "language": "fi",
        "title": "Puhelin menetti kentän sen jälkeen, kun luin koodin soittajalle",
        "action": "Contact operator customer service now",
    },
    {
        "minutes_ago": 27,
        "status": "backlog",
        "severity": "critical",
        "urgency": "immediate",
        "team": "business_security_support",
        "audience": "small_business",
        "language": "en",
        "title": "Our accountant paid a €9,400 invoice after the 'CEO' emailed new bank details",
        "action": "Contact your bank now",
    },
    {
        "minutes_ago": 18,
        "status": "blocked",
        "severity": "high",
        "urgency": "today",
        "team": "security_specialist",
        "audience": "consumer",
        "language": "sv",
        "title": "Jag installerade en app som 'banken' bad mig om i telefonen",
        "action": "Disconnect the device and get it checked",
    },
    {
        "minutes_ago": 9,
        "status": "backlog",
        "severity": "high",
        "urgency": "today",
        "team": "human_advisor",
        "audience": "consumer",
        "language": "en",
        "title": "I think my ex can see my location and messages on my phone",
        "action": "Get a trained advisor on the line",
    },
    {
        "minutes_ago": 95,
        "status": "done",
        "severity": "medium",
        "urgency": "today",
        "team": "operator_support_agent",
        "audience": "consumer",
        "language": "fi",
        "title": "Tilaukseeni lisättiin eSIM, jota en tilannut",
        "action": "Contact operator customer service now",
    },
]


def _seed_demo_tickets() -> None:
    # Checked by the first demo reference, not "is the board empty", so a real
    # handoff made before anyone opened the board still gets the demo tickets beside it.
    if db.is_configured():
        if _collection().count_documents({"_id": "DEMO-001"}, limit=1):
            return
    elif "DEMO-001" in _memory:
        return
    now = datetime.now(UTC)
    for n, d in enumerate(_DEMO, start=1):
        created = now - timedelta(minutes=d["minutes_ago"])
        create(
            {
                "reference": f"DEMO-{n:03d}",
                "session_id": None,
                "status": d["status"],
                "severity": d["severity"],
                "urgency": d["urgency"],
                "team": d["team"],
                "team_label": team_label(d["team"]),
                "audience": d["audience"],
                "language": d["language"],
                "title": d["title"],
                "transcript": [{"role": "customer", "text": d["title"]}],
                "screenshots": 0,
                "consent": {"allowed": [], "declined": []},
                "advice": {
                    "action_label": d["action"],
                    "advice_text": "Synthetic demo ticket.",
                    "steps": [],
                    "confidence": 0.8,
                },
                "summary": "Synthetic demo ticket for the support-console prototype.",
                "demo": True,
                "created_at": created,
                "updated_at": created,
            }
        )
