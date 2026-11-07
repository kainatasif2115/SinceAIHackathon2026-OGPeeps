"""One-click demo accounts, for people who just want to look around.

Two fixed accounts, an individual and a small-business owner with a colleague, are
rebuilt from scratch every time someone uses the "explore" button on the login page:
the old copy is deleted and a fresh one is filled with finished chats, handoffs in each
state (waiting, picked up, resolved) and, for the company, a team and a pending invite.
The chats are saved conversations from our own evaluation run on the organisers'
synthetic cases, so setting this up never calls the AI.

Off unless DEMO_LOGIN_ENABLED=1. The password of a demo account is random and thrown
away: the only way in is the button, which can only ever reset these accounts.
"""

import os
import secrets
from datetime import UTC, datetime, timedelta

from assistant import simset
from assistant.engine import Conversation

from . import accounts, cases, sessions, teams, tickets
from .results import RESULTS_DIR

RUN_FILE = "dev_multi_120_predictions.jsonl"
AGENT = "Demo Agent"

INDIVIDUAL = {"email": "explore.individual@demo.example", "name": "Maija Korhonen"}
OWNER = {"email": "explore.owner@demo.example", "name": "Aino Mäkelä"}
COLLEAGUE = {"email": "explore.colleague@demo.example", "name": "Mikko Lahtinen"}
COMPANY = "Kahvila Aalto Oy"
PENDING_INVITE = "sara.new@demo.example"
EMAILS = [INDIVIDUAL["email"], OWNER["email"], COLLEAGUE["email"]]

# case id, minutes ago the chat started, handoff: None or (state, minutes after the chat
# started when it was sent / picked up / resolved).
INDIVIDUAL_CHATS = [
    ("DSA-D-0044", 300, None),
    ("DSA-D-0053", 230, None),
    ("DSA-D-0093", 180, ("done", 4, 12, 55)),
    ("DSA-D-0028", 120, ("in_progress", 4, 16, None)),
    ("DSA-D-0013", 50, ("backlog", 4, None, None)),
    ("DSA-D-0079", 20, ("backlog", 3, None, None)),
]
OWNER_CHATS = [
    ("DSA-D-0043", 240, None),
    ("DSA-D-0032", 150, ("in_progress", 5, 22, None)),
    ("DSA-D-0020", 90, None),
]
COLLEAGUE_CHATS = [
    ("DSA-D-0042", 200, None),
    ("DSA-D-0080", 60, ("backlog", 5, None, None)),
]


def enabled() -> bool:
    return os.environ.get("DEMO_LOGIN_ENABLED") == "1"


def start(kind: str) -> dict:
    """Rebuild the demo account of this kind, and return its signed-in user."""
    _wipe()
    if kind == "individual":
        user = _make_user(INDIVIDUAL, "private")
        _seed(user, INDIVIDUAL_CHATS, audience="consumer")
        return accounts.get(user["_id"])

    owner = _make_user(OWNER, "business")
    team = teams._create(COMPANY, owner["_id"])
    accounts.update(owner["_id"], team_id=team["_id"], role="owner")
    colleague = _make_user(COLLEAGUE, "business")
    accounts.update(colleague["_id"], team_id=team["_id"], role="member")
    teams.invite(team, PENDING_INVITE)
    _seed(accounts.get(owner["_id"]), OWNER_CHATS, audience="small_business")
    _seed(accounts.get(colleague["_id"]), COLLEAGUE_CHATS, audience="small_business")
    return accounts.get(owner["_id"])


def _make_user(who: dict, kind: str) -> dict:
    user = accounts.create(who["email"], who["name"], secrets.token_urlsafe(24), kind=kind)
    accounts.update(user["_id"], demo=True)
    return accounts.get(user["_id"])


def _wipe() -> None:
    """Delete both demo accounts, their company, chats and handoffs."""
    for email in EMAILS:
        user = accounts._find_by_email(email)
        if not user:
            continue
        ids = [d["_id"] for d in sessions.for_user(user["_id"])]
        tickets.delete_for_sessions(ids)
        sessions.delete_for_user(user["_id"])
        if user.get("role") == "owner" and (team := teams.team_of(user)):
            teams.dissolve(team)
        accounts.delete(user["_id"])


def _seed(user: dict, chats: list, audience: str) -> None:
    saved = {r["case_id"]: r for r in simset.load_jsonl(RESULTS_DIR / RUN_FILE)}
    now = datetime.now(UTC)
    for case_id, minutes_ago, handoff in chats:
        row = saved[case_id]
        started = now - timedelta(minutes=minutes_ago)
        conv, final = _conversation(case_id, row)
        extra = {
            "scenario_id": None,
            "pending": None,
            "final": final,
            "user_id": user["_id"],
            "started_at": started,
        }
        if audience == "small_business" and user.get("team_id"):
            extra["team_id"] = user["team_id"]
        session_id = sessions.new_id()
        if handoff:
            extra["handoff_reference"] = _handoff(session_id, conv, final, started, handoff)
        sessions.save(session_id, conv, extra)


def _conversation(case_id: str, row: dict) -> tuple[Conversation, dict]:
    """A finished conversation rebuilt from a saved run, in the form the app stores."""
    dev = cases._cases()[case_id]
    case = {k: v for k, v in dev.items() if k not in ("ground_truth", "simulation")}
    case.update(case_id=f"DEMO-{secrets.token_hex(4).upper()}", user_identified=True)
    conv = Conversation(case=case)
    topics = list(row.get("question_topics") or [])
    for turn in row["transcript"][1:]:  # the first entry is the opening message
        kind = turn.get("type")
        if kind == "question":
            conv.history.append(
                {"role": "assistant", "type": "question", "text": turn["text"], "topics": topics}
            )
            conv.turns_used += 1
        elif kind == "consent_request":
            conv.history.append(
                {
                    "role": "assistant",
                    "type": "consent_request",
                    "fields": turn["fields"],
                    "text": turn["text"],
                }
            )
            conv.turns_used += 1
        elif kind == "consent_reply":
            granted = bool(turn.get("granted"))
            fields = turn.get("granted") if granted else turn.get("refused")
            conv.record_consent(list(fields or []), granted)
        elif turn.get("role") == "user":
            conv.record_answer(turn["text"])
    drop = ("transcript", "conversation", "notes", "abstained")
    return conv, {k: v for k, v in row.items() if k not in drop}


def _handoff(session_id: str, conv: Conversation, final: dict, started, handoff: tuple) -> str:
    """The ticket for a chat that was handed to a person, with its timeline set to the
    chat's age, so the customer's Your checks shows a believable queue."""
    state, sent, picked, resolved = handoff
    reference = f"DSA-{secrets.token_hex(3).upper()}"
    ticket = tickets.from_conversation(reference, session_id, conv, final)

    def at(minutes: int):
        return started + timedelta(minutes=minutes)

    ticket.update(created_at=at(sent), updated_at=at(resolved or picked or sent), status=state)
    if state != "backlog":
        ticket.update(assigned_to=AGENT, picked_up_at=at(picked))
    if state == "done":
        ticket.update(resolved_at=at(resolved))
    tickets.create(ticket)
    return reference
