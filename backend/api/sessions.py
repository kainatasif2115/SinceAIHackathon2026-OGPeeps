"""Chat sessions: building the case for the demo, and storing conversation state.

Sessions live in MongoDB (deleted automatically after 24 hours) or, when no
database is configured, in process memory.
"""

import copy
import secrets
import threading
from dataclasses import asdict
from datetime import UTC, datetime, timedelta
from functools import cache

from assistant import simset, vocab
from assistant.engine import Conversation

from . import db, link_check

RETENTION = timedelta(hours=24)
GATED_SIGNALS = [
    "subscription.recent_events",
    "subscription.network_status",
    "device.recent_app_installs",
    "device.security_findings",
    "operator_account.recent_logins",
]

# --- Example scenarios --------------------------------------------------------------


@cache
def scenarios() -> dict[str, dict]:
    """The organisers' five demo journeys, plus a benign, a business and a Swedish case for
    each journey."""
    dev = simset.load_jsonl(simset.DEV_CASES)
    picked = {
        c["case_id"]: c
        for c in simset.load_jsonl(simset.SIMSET_DIR / "data/samples/five_journeys.jsonl")
    }
    for journey in vocab.journeys():
        in_journey = [c for c in dev if c["journey"] == journey and c["language"] in ("fi", "en")]
        benign = next((c for c in in_journey if c["ground_truth"]["is_benign_control"]), None)
        business = next((c for c in in_journey if c["audience"] == "small_business"), None)
        english = next(
            (
                c
                for c in in_journey
                if c["language"] == "en"
                and c["audience"] == "consumer"
                and not c["ground_truth"]["is_benign_control"]
            ),
            None,
        )
        swedish = next(
            (
                c
                for c in dev
                if c["journey"] == journey
                and c["language"] == "sv"
                and c["audience"] == "consumer"
                and not c["ground_truth"]["is_benign_control"]
            ),
            None,
        )
        swedish_business = next(
            (
                c
                for c in dev
                if c["journey"] == journey
                and c["language"] == "sv"
                and c["audience"] == "small_business"
            ),
            None,
        )
        for c in (benign, business, english, swedish, swedish_business):
            if c:
                picked.setdefault(c["case_id"], c)
    return picked


def scenario_summary(case: dict) -> dict:
    lang = case["language"]
    labels = vocab.journeys()[case["journey"]]
    return {
        "id": case["case_id"],
        "journey": case["journey"],
        "journey_label": labels["fi"] if lang == "fi" else labels["en"],
        "audience": case["audience"],
        "language": lang,
        # The dataset's own titles reveal the answer ("(benign)", "given or not?"),
        # so the example is labelled with the start of what the user wrote.
        "title": excerpt(case["opening_message"]),
        "opening_message": case["opening_message"],
    }


def excerpt(text: str, limit: int = 80) -> str:
    text = " ".join(text.split())
    return text if len(text) <= limit else text[: limit - 1].rsplit(" ", 1)[0] + "…"


def build_case(audience: str, language: str, message: str, scenario_id: str | None) -> dict:
    """The case the assistant works on: a scenario's simulated signals, or a demo customer."""
    if scenario_id and scenario_id in scenarios():
        base = copy.deepcopy(scenarios()[scenario_id])
        case = {k: base[k] for k in base if k not in ("ground_truth", "simulation")}
    else:
        case = _demo_customer(audience)
        add_link_check(case, message)
    case.update(
        case_id=f"DEMO-{secrets.token_hex(4).upper()}",
        audience=audience,
        language=language,
        opening_message=message,
        user_identified=True,
        entry_point="operator_app_chat" if audience == "consumer" else "business_portal_chat",
    )
    return case


def add_link_check(case: dict, text: str) -> None:
    """Check a link the user typed, unless the case already has a link check."""
    if case["signals"].get("link_check"):
        return
    result = link_check.check_text(text)
    if result:
        case["signals"]["link_check"] = result
        case.setdefault("signal_availability", {})["link_check"] = "available"


def _demo_customer(audience: str) -> dict:
    """An ordinary identified customer. The account data behind the permission card is
    realistic but unremarkable, like most real checks: a paid invoice, logins from a
    known device in Finland, everyday apps."""
    signals = {
        "artifact": None,
        "link_check": None,
        "call_warning": None,
        "subscription": {
            "products": [{"type": "mobile", "count": 1}, {"type": "home_broadband"}],
            "recent_events": [
                {"type": "invoice_issued", "days_ago": 12, "status": "paid", "channel": "e-invoice"}
            ],
            "network_status": {"service": "normal"},
        },
        "device": {
            "summary": {
                "platform": "android",
                "os_version": "Android 16",
                "patch_status": "current",
                "security_app": "operator_security",
            },
            "recent_app_installs": [
                {
                    "name": "Kauppalista",
                    "source": "official_store",
                    "days_ago": 9,
                    "permissions": ["notifications"],
                },
                {
                    "name": "HSL",
                    "source": "official_store",
                    "days_ago": 21,
                    "permissions": ["location"],
                },
            ],
            "security_findings": {
                "unknown_profiles": [],
                "remote_access_apps": [],
                "accessibility_services": [],
            },
        },
        "operator_account": {
            "recent_logins": [
                {"days_ago": 1, "country": "FI", "device_known": True, "result": "success"},
                {"days_ago": 4, "country": "FI", "device_known": True, "result": "success"},
                {"days_ago": 9, "country": "FI", "device_known": True, "result": "success"},
            ]
        },
        "credential_exposure": None,
    }
    gated = list(GATED_SIGNALS)
    if audience == "small_business":
        signals["subscription"]["products"] = [
            {"type": "business_mobile", "count": 6},
            {"type": "business_broadband"},
        ]
        signals["business"] = {
            "profile": {
                "employees": 6,
                "admins": 1,
                "it_support": "external_partner",
                "payment_approval": "single_person",
            },
            "staff_accounts": [],
        }
        gated.append("business.staff_accounts")
    return {
        "journey": "unknown",
        "persona": {"segment": "adult" if audience == "consumer" else "small_business_owner"},
        "signals": signals,
        "signal_availability": {"link_check": "not_applicable", "call_warning": "not_provided"},
        "consent": {"requires_consent": gated, "pre_granted": []},
    }


# --- Storage ------------------------------------------------------------------------

_memory: dict[str, dict] = {}
_lock = threading.Lock()


def _collection():
    coll = db.get_db()["sessions"]
    coll.create_index("expires_at", expireAfterSeconds=0)
    return coll


def save(session_id: str, conv: Conversation, extra: dict | None = None) -> None:
    now = datetime.now(UTC)
    doc = {
        "_id": session_id,
        "conversation": _dump(conv),
        "updated_at": now,
        "expires_at": now + RETENTION,
        **(extra or {}),
    }
    if db.is_configured():
        _collection().replace_one({"_id": session_id}, doc, upsert=True)
    else:
        with _lock:
            _memory[session_id] = doc


def load(session_id: str) -> tuple[Conversation, dict] | None:
    if db.is_configured():
        doc = _collection().find_one({"_id": session_id})
    else:
        with _lock:
            doc = copy.deepcopy(_memory.get(session_id))
    if not doc:
        return None
    return _restore(doc["conversation"]), doc


def delete(session_id: str) -> bool:
    """Removes a conversation now instead of waiting for the 24-hour expiry."""
    if db.is_configured():
        return _collection().delete_one({"_id": session_id}).deleted_count > 0
    with _lock:
        return _memory.pop(session_id, None) is not None


def for_user(user_id: str) -> list[dict]:
    """A signed-in customer's conversations that have not expired yet, newest first."""
    if db.is_configured():
        found = list(_collection().find({"user_id": user_id}))
    else:
        with _lock:
            found = [copy.deepcopy(d) for d in _memory.values() if d.get("user_id") == user_id]
    return sorted(found, key=lambda d: d.get("started_at") or d["updated_at"], reverse=True)


def for_team(team_id: str) -> list[dict]:
    """Checks a company's staff made in business mode, newest first."""
    if db.is_configured():
        found = list(_collection().find({"team_id": team_id}))
    else:
        with _lock:
            found = [copy.deepcopy(d) for d in _memory.values() if d.get("team_id") == team_id]
    return sorted(found, key=lambda d: d.get("started_at") or d["updated_at"], reverse=True)


def delete_for_user(user_id: str) -> int:
    if db.is_configured():
        return _collection().delete_many({"user_id": user_id}).deleted_count
    with _lock:
        ids = [k for k, d in _memory.items() if d.get("user_id") == user_id]
        for k in ids:
            del _memory[k]
    return len(ids)


def new_id() -> str:
    return secrets.token_urlsafe(12)


def _dump(conv: Conversation) -> dict:
    data = asdict(conv)
    data["granted"] = sorted(conv.granted)
    data["refused"] = sorted(conv.refused)
    data["revealed"] = list(
        conv.revealed.items()
    )  # signal paths contain dots: not valid Mongo keys
    return data


def _restore(data: dict) -> Conversation:
    data = dict(data)
    data["granted"] = set(data["granted"])
    data["refused"] = set(data["refused"])
    data["revealed"] = dict(data["revealed"])
    return Conversation(**data)
