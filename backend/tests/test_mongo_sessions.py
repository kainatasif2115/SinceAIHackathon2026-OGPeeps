"""Chat sessions stored in a real MongoDB. Skipped unless MONGODB_TEST_URI is set, e.g.

docker compose up -d mongo
MONGODB_TEST_URI=mongodb://localhost:27017 .venv/bin/pytest tests/test_mongo_sessions.py
"""

import os

import pytest
from django.test import Client

from api import db
from assistant import brain
from tests.fakes import Script, ask_consent, done, final

URI = os.environ.get("MONGODB_TEST_URI")
pytestmark = pytest.mark.skipif(not URI, reason="MONGODB_TEST_URI not set")


@pytest.fixture
def mongo(settings):
    settings.MONGODB_URI = URI
    settings.MONGODB_DB = "security_assistant_test"
    db._client.cache_clear()
    yield db.get_db()
    db.get_db().client.drop_database("security_assistant_test")
    db._client.cache_clear()


def test_conversation_is_stored_with_expiry(monkeypatch, mongo):
    monkeypatch.setattr(
        brain,
        "decide_multi_turn",
        Script(
            ask_consent(["subscription.recent_events"]),
            done(final(signals_used=["artifact", "subscription.recent_events"])),
        ),
    )
    client = Client()

    start = client.post(
        "/api/sessions",
        {
            "audience": "consumer",
            "language": "en",
            "message": "My phone lost signal after an eSIM text.",
        },
        content_type="application/json",
    ).json()
    sid = start["session_id"]
    doc = mongo["sessions"].find_one({"_id": sid})
    assert doc["pending"]["type"] == "consent_request"
    assert doc["expires_at"] > doc["updated_at"]

    turn = client.post(
        f"/api/sessions/{sid}/consent", {"granted": True}, content_type="application/json"
    ).json()["turn"]
    assert turn["type"] == "final"

    doc = mongo["sessions"].find_one({"_id": sid})
    assert doc["final"]["signals_used"] == ["artifact", "subscription.recent_events"]
    assert doc["conversation"]["granted"] == ["subscription.recent_events"]
    ttl = [i for i in mongo["sessions"].list_indexes() if i["key"].get("expires_at")]
    assert ttl and ttl[0]["expireAfterSeconds"] == 0
