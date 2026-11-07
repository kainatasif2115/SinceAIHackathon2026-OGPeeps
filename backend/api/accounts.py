"""Optional customer accounts: email and password.

Anyone can use the assistant without an account. Signing in only adds an
account page with your recent conversations (still deleted after 24 hours) and
the status of any handoff. An account is for a private person or a business;
business accounts belong to a company team (api/teams.py). Accounts live in
MongoDB, or in process memory when no database is configured.

Passwords are hashed with Django's default hasher (PBKDF2) and checked against
Django's password rules. Signing in sets a signed, HttpOnly, SameSite=Strict
cookie. After five wrong passwords an account is locked for 15 minutes. In
production the operator's own customer login would take this place.
"""

import re
import secrets
import threading
from datetime import UTC, datetime, timedelta

from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.password_validation import validate_password
from django.core import signing
from django.core.exceptions import ValidationError
from ninja.security import APIKeyCookie
from pymongo.errors import DuplicateKeyError

from . import db

COOKIE = "dsa_account"
SALT = "customer-account"
MAX_AGE = 30 * 24 * 60 * 60
MAX_FAILURES = 5
LOCKOUT = timedelta(minutes=15)
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

_memory: dict[str, dict] = {}
_lock = threading.Lock()
# Checked when the email is unknown, so a wrong email takes as long as a wrong password.
_DUMMY_HASH = make_password(secrets.token_urlsafe(16))


class SignUpError(ValueError):
    """A sign-up the user can fix: the message is safe to show them."""


class LockedOut(Exception):
    pass


def _collection():
    coll = db.get_db()["users"]
    coll.create_index("email", unique=True)
    return coll


def normalise_email(email: str) -> str:
    return email.strip().lower()


def create(email: str, name: str, password: str, kind: str = "private") -> dict:
    email = normalise_email(email)
    if not EMAIL.match(email):
        raise SignUpError("Enter a valid email address.")
    try:
        validate_password(password)
    except ValidationError as err:
        raise SignUpError(" ".join(err.messages)) from err
    user = {
        "_id": secrets.token_hex(12),
        "email": email,
        "name": name.strip(),
        "kind": kind,
        "team_id": None,
        "role": None,
        "password": make_password(password),
        "created_at": datetime.now(UTC),
        "failed_logins": 0,
        "locked_until": None,
    }
    if db.is_configured():
        try:
            _collection().insert_one(user)
        except DuplicateKeyError as err:
            raise SignUpError("An account with this email already exists.") from err
        return user
    with _lock:
        if any(u["email"] == email for u in _memory.values()):
            raise SignUpError("An account with this email already exists.")
        _memory[user["_id"]] = user
    return user


def authenticate(email: str, password: str) -> dict | None:
    """The user for a correct email and password; None otherwise. Raises LockedOut."""
    user = _find_by_email(normalise_email(email))
    if not user:
        check_password(password, _DUMMY_HASH)
        return None
    now = datetime.now(UTC)
    if user.get("locked_until") and user["locked_until"] > now:
        raise LockedOut
    if check_password(password, user["password"]):
        _update(user["_id"], failed_logins=0, locked_until=None)
        return user
    failures = user.get("failed_logins", 0) + 1
    if failures >= MAX_FAILURES:
        _update(user["_id"], failed_logins=0, locked_until=now + LOCKOUT)
    else:
        _update(user["_id"], failed_logins=failures)
    return None


def get(user_id: str) -> dict | None:
    if db.is_configured():
        return _collection().find_one({"_id": user_id})
    with _lock:
        return _memory.get(user_id)


def delete(user_id: str) -> None:
    if db.is_configured():
        _collection().delete_one({"_id": user_id})
    else:
        with _lock:
            _memory.pop(user_id, None)


def issue_token(user: dict) -> str:
    return signing.dumps({"uid": user["_id"]}, salt=SALT)


def user_from_token(token: str | None) -> dict | None:
    if not token:
        return None
    try:
        data = signing.loads(token, salt=SALT, max_age=MAX_AGE)
    except signing.BadSignature:
        return None
    return get(data.get("uid", ""))


def current_user(request) -> dict | None:
    """The signed-in customer, if any. For endpoints that also work without an account."""
    return user_from_token(request.COOKIES.get(COOKIE))


def in_team(team_id: str) -> list[dict]:
    if db.is_configured():
        return list(_collection().find({"team_id": team_id}))
    with _lock:
        return [u for u in _memory.values() if u.get("team_id") == team_id]


def update(user_id: str, **fields) -> None:
    _update(user_id, **fields)


def public(user: dict) -> dict:
    return {"email": user["email"], "name": user["name"], "created_at": user["created_at"]}


def _find_by_email(email: str) -> dict | None:
    if db.is_configured():
        return _collection().find_one({"email": email})
    with _lock:
        return next((u for u in _memory.values() if u["email"] == email), None)


def _update(user_id: str, **fields) -> None:
    if db.is_configured():
        _collection().update_one({"_id": user_id}, {"$set": fields})
    else:
        with _lock:
            if user_id in _memory:
                _memory[user_id].update(fields)


class CustomerCookieAuth(APIKeyCookie):
    """Accepts a valid account cookie; returns the user."""

    param_name = COOKIE

    def authenticate(self, request, key):
        return user_from_token(key)


# Like the staff cookie: SameSite=Strict, so other sites can't send it, and the JSON
# API does not use Django's CSRF token flow.
customer_auth = CustomerCookieAuth(csrf=False)
