"""Handoff tickets for the support-agent console (`/agent`).

"Talk to a person" turns a conversation into a ticket a DNA support agent can
pick up: severity from the assessed risk, the team from the escalation target,
and only what the customer wrote and chose in the chat. Tickets live in
MongoDB, or in process memory when no database is configured, and expire with
the same 24-hour retention as the chat itself.
"""

import threading
from datetime import UTC, datetime

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
        # The customer asked for a person although the advice did not call for one.
        "customer_asked": bool(final) and not final.get("escalation_required"),
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
    _purge_demo_tickets()
    if db.is_configured():
        found = list(_collection().find())
    else:
        with _lock:
            found = list(_memory.values())
    return sorted(found, key=lambda t: t["created_at"], reverse=True)


def update_status(reference: str, status: str, agent: str | None = None) -> dict | None:
    """Moves a ticket and keeps its timeline: picking it up assigns it to the agent,
    resolving stamps the time, and putting it back in the queue clears both."""
    ticket = get(reference)
    if not ticket:
        return None
    now = datetime.now(UTC)
    fields: dict = {"status": status, "updated_at": now}
    if status == "backlog":
        fields.update(assigned_to=None, picked_up_at=None, resolved_at=None)
    else:
        if not ticket.get("picked_up_at"):
            fields["picked_up_at"] = now
        if agent and (status == "in_progress" or not ticket.get("assigned_to")):
            fields["assigned_to"] = agent
        fields["resolved_at"] = now if status == "done" else None
    if db.is_configured():
        coll = _collection()
        coll.update_one({"_id": reference}, {"$set": fields})
        return coll.find_one({"_id": reference})
    with _lock:
        _memory[reference].update(fields)
        return _memory[reference]


def get(reference: str) -> dict | None:
    if db.is_configured():
        return _collection().find_one({"_id": reference})
    with _lock:
        return _memory.get(reference)


SEVERITY_ORDER = {s: i for i, s in enumerate(SEVERITIES)}  # critical first


def queue_position(ticket: dict, waiting: list[dict]) -> int | None:
    """Place in line for a waiting ticket: same team, most severe first, then oldest."""
    if ticket["status"] != "backlog":
        return None
    line = sorted(
        (t for t in waiting if t["status"] == "backlog" and t["team"] == ticket["team"]),
        key=lambda t: (SEVERITY_ORDER.get(t["severity"], 9), t["created_at"]),
    )
    refs = [t["reference"] for t in line]
    return refs.index(ticket["reference"]) + 1 if ticket["reference"] in refs else None


def handoffs(references: list[str]) -> dict[str, dict]:
    """What a customer may see about their own handoffs: who has it, where it is in the
    queue, and when it moved. Never the other tickets' contents."""
    if not references:
        return {}
    everything = all_tickets()
    out = {}
    for ticket in everything:
        if ticket["reference"] not in references:
            continue
        out[ticket["reference"]] = {
            "reference": ticket["reference"],
            "status": ticket["status"],
            "team_label": ticket["team_label"],
            "severity": ticket["severity"],
            "assigned_to": ticket.get("assigned_to"),
            "created_at": ticket["created_at"],
            "picked_up_at": ticket.get("picked_up_at"),
            "resolved_at": ticket.get("resolved_at"),
            "queue_position": queue_position(ticket, everything),
            "shared": [presenter.field_label(f, "en") for f in ticket["consent"]["allowed"]],
            "screenshots": ticket["screenshots"],
        }
    return out


# --- Old demo tickets -------------------------------------------------------------------
# Earlier builds seeded synthetic tickets (demo=true) so the board was never empty. The
# board now shows real handoffs only; this clears any that are still stored.

_purged = False


def _purge_demo_tickets() -> None:
    global _purged
    if _purged:
        return
    if db.is_configured():
        _collection().delete_many({"demo": True})
    else:
        with _lock:
            for ref in [r for r, t in _memory.items() if t.get("demo")]:
                del _memory[ref]
    _purged = True
