"""Account types and small-business teams.

An account is for a private person or a business. Signing up as a business
creates the company's team with you as its owner. The owner invites colleagues
by email: signing up as a business with an invited email joins the team, and
an existing account sees the invite on its account page. The owner can remove
members and sees the checks the team makes in business mode; checks made in
private mode are never shared. Teams live in MongoDB (`teams`) or in memory.

In production this would follow the operator's business-customer records
(who the company's admins and staff are) instead of invites.
"""

import secrets
import threading
from datetime import UTC, datetime

from . import accounts, db

_memory: dict[str, dict] = {}
_lock = threading.Lock()


class TeamError(ValueError):
    """Something the user can fix; the message is safe to show them."""


def _collection():
    return db.get_db()["teams"]


def sign_up(email: str, name: str, password: str, kind: str, company: str) -> dict:
    """Create the account, then the team (business) or join the team that invited it."""
    invite = find_invite(accounts.normalise_email(email))
    joins = kind == "business" and invite is not None
    if kind == "business" and not joins and not company.strip():
        raise accounts.SignUpError("Enter your company's name.")
    user = accounts.create(email, name, password, kind=kind)
    if joins:
        join(user, invite)
    elif kind == "business":
        team = _create(company.strip(), user["_id"])
        accounts.update(user["_id"], team_id=team["_id"], role="owner")
    return accounts.get(user["_id"])


def profile(user: dict) -> dict:
    """What the account page shows about the signed-in user."""
    team = get(user.get("team_id")) if user.get("team_id") else None
    pending = None if team else find_invite(user["email"])
    return {
        **accounts.public(user),
        "kind": user.get("kind", "private"),
        "company": team["name"] if team else None,
        "role": user.get("role") if team else None,
        "pending_invite": pending["name"] if pending else None,
        "demo": bool(user.get("demo")),
    }


def get(team_id: str | None) -> dict | None:
    if not team_id:
        return None
    if db.is_configured():
        return _collection().find_one({"_id": team_id})
    with _lock:
        return _memory.get(team_id)


def team_of(user: dict) -> dict | None:
    return get(user.get("team_id"))


def view(team: dict, user: dict) -> dict:
    """The team as one member sees it; only the owner sees pending invites."""
    owner = user.get("role") == "owner"
    members = sorted(
        accounts.in_team(team["_id"]), key=lambda u: (u.get("role") != "owner", u["name"])
    )
    return {
        "name": team["name"],
        "role": user.get("role"),
        "members": [{"name": u["name"], "email": u["email"], "role": u["role"]} for u in members],
        "invites": sorted(team.get("invites", [])) if owner else [],
    }


def invite(team: dict, email: str) -> None:
    email = accounts.normalise_email(email)
    if not accounts.EMAIL.match(email):
        raise TeamError("Enter a valid email address.")
    if any(u["email"] == email for u in accounts.in_team(team["_id"])):
        raise TeamError("This person is already in your team.")
    other = find_invite(email)
    if other and other["_id"] != team["_id"]:
        raise TeamError("This email already has an invite from another company.")
    _set_invites(team, sorted({*team.get("invites", []), email}))


def cancel_invite(team: dict, email: str) -> None:
    email = accounts.normalise_email(email)
    _set_invites(team, [e for e in team.get("invites", []) if e != email])


def find_invite(email: str) -> dict | None:
    if db.is_configured():
        return _collection().find_one({"invites": email})
    with _lock:
        return next((t for t in _memory.values() if email in t.get("invites", [])), None)


def join(user: dict, team: dict) -> None:
    cancel_invite(team, user["email"])
    accounts.update(user["_id"], kind="business", team_id=team["_id"], role="member")


def remove_member(team: dict, email: str) -> None:
    member = next(
        (u for u in accounts.in_team(team["_id"]) if u["email"] == accounts.normalise_email(email)),
        None,
    )
    if not member:
        raise TeamError("This person isn't in your team.")
    if member["role"] == "owner":
        raise TeamError("The owner can't be removed.")
    leave(member)


def leave(user: dict) -> None:
    """Back to a private account; checks already shared stay with the team until they expire."""
    accounts.update(user["_id"], kind="private", team_id=None, role=None)


def dissolve(team: dict) -> None:
    """When the owner deletes their account: members keep theirs, as private accounts."""
    for member in accounts.in_team(team["_id"]):
        leave(member)
    if db.is_configured():
        _collection().delete_one({"_id": team["_id"]})
    else:
        with _lock:
            _memory.pop(team["_id"], None)


def _create(name: str, owner_id: str) -> dict:
    team = {
        "_id": secrets.token_hex(12),
        "name": name,
        "owner_id": owner_id,
        "invites": [],
        "created_at": datetime.now(UTC),
    }
    if db.is_configured():
        _collection().insert_one(team)
    else:
        with _lock:
            _memory[team["_id"]] = team
    return team


def _set_invites(team: dict, invites: list[str]) -> None:
    team["invites"] = invites
    if db.is_configured():
        _collection().update_one({"_id": team["_id"]}, {"$set": {"invites": invites}})
    else:
        with _lock:
            if team["_id"] in _memory:
                _memory[team["_id"]]["invites"] = invites
