"""One-click demo accounts, for people who just want to look around.

Two fixed accounts, an individual and a small-business owner with a colleague, are
refreshed every time someone uses the "explore" button on the login page: the sample
chats and handoffs are replaced by a fresh set (finished chats, handoffs in each state:
waiting, picked up, resolved) and, for the company, a team and a pending invite. Chats
and handoffs made by hand while using a demo account are kept until they expire after
24 hours like any other, so a button press never deletes someone's work.
The chats are saved conversations from our own evaluation run on the organisers'
synthetic cases, so setting this up never calls the AI.

Off unless DEMO_LOGIN_ENABLED=1. The password of a demo account is random and thrown
away: the only way in is the button, which can only ever reset these accounts.
"""

import os
import re
import secrets
from datetime import UTC, datetime, timedelta

from assistant import simset, vocab
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
    """Refresh the sample data of this kind of demo account, and return its signed-in user."""
    _clear_seeded()
    if kind == "individual":
        user = _account(INDIVIDUAL, "private")
        _seed(user, INDIVIDUAL_CHATS, audience="consumer")
        return accounts.get(user["_id"])

    owner = _account(OWNER, "business")
    team = teams.team_of(owner)
    if not team:
        team = teams._create(COMPANY, owner["_id"])
        accounts.update(owner["_id"], team_id=team["_id"], role="owner")
    colleague = _account(COLLEAGUE, "business")
    if colleague.get("team_id") != team["_id"]:
        accounts.update(colleague["_id"], team_id=team["_id"], role="member")
    try:
        teams.invite(team, PENDING_INVITE)
    except teams.TeamError:
        pass  # already invited, or already joined
    _seed(accounts.get(owner["_id"]), OWNER_CHATS, audience="small_business")
    _seed(accounts.get(colleague["_id"]), COLLEAGUE_CHATS, audience="small_business")
    return accounts.get(owner["_id"])


def _account(who: dict, kind: str) -> dict:
    """The demo account, created the first time and kept after that."""
    user = accounts._find_by_email(who["email"])
    if user:
        return user
    user = accounts.create(who["email"], who["name"], secrets.token_urlsafe(24), kind=kind)
    accounts.update(user["_id"], demo=True)
    return accounts.get(user["_id"])


def _is_sample(doc: dict) -> bool:
    """A chat this module seeded. Older copies have no mark, but only seeding stores a
    dataset case (it has a scenario family) without the scenario id a real chat records."""
    if doc.get("sample"):
        return True
    return doc.get("scenario_id") is None and "scenario_family" in doc["conversation"]["case"]


def _clear_seeded() -> None:
    """Delete the sample chats and their handoffs; anything made by hand stays."""
    for email in EMAILS:
        user = accounts._find_by_email(email)
        if not user:
            continue
        ids = [d["_id"] for d in sessions.for_user(user["_id"]) if _is_sample(d)]
        tickets.delete_for_sessions(ids)
        for session_id in ids:
            sessions.purge(session_id)


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
            "sample": True,
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
    final = {k: v for k, v in row.items() if k not in drop}
    # The saved run is the scored answer, with the checker's standard-wording copies of
    # steps. The live chat hides those when the model already said the same in its own
    # words (engine.shown_steps); the saved run doesn't say which they were, so a
    # standard sentence is hidden only if another step shares two or more of its words.
    standard = {v["en_canonical"] for v in vocab.step_phrases().values() if v.get("en_canonical")}
    steps = final["steps"]
    final["shown_steps"] = [
        step
        for step in steps
        if not (step in standard and any(_overlaps(step, o) for o in steps if o != step))
    ]
    return conv, final


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


_FILLER = {"that", "this", "with", "from", "your", "have", "been", "into", "when", "then", "they"}


def _overlaps(a: str, b: str) -> bool:
    def words(text: str) -> set[str]:
        return {w for w in re.findall(r"[a-z]{4,}", text.lower()) if w not in _FILLER}

    return len(words(a) & words(b)) >= 2
