import pytest
from django.test import Client

from api import sessions
from assistant import brain
from assistant.brain import BrainUnavailable
from tests.fakes import Script, ask, ask_consent, done, final


@pytest.fixture
def client(settings):
    settings.MONGODB_URI = ""  # in-memory sessions
    sessions._memory.clear()
    return Client()


def post(client, url, body=None):
    return client.post(url, body or {}, content_type="application/json")


def test_scenarios_cover_all_journeys(client):
    scenarios = client.get("/api/scenarios").json()

    assert {s["journey"] for s in scenarios} == {
        "suspicious_message",
        "clicked_link",
        "suspicious_call",
        "breach_notice",
        "smb_incident",
    }
    assert all(s["opening_message"] for s in scenarios)


def test_full_conversation(monkeypatch, client):
    script = Script(
        ask_consent(
            ["device.recent_app_installs"], "May I check which apps were installed recently?"
        ),
        ask("Did you enter your banking codes?", ["credentials_entered"]),
        done(
            final(
                risk_level="critical",
                urgency="immediate",
                primary_action="contact_bank_and_block_cards",
                escalation_required=True,
                escalation_target="security_specialist",
                signals_used=["artifact", "device.recent_app_installs"],
            )
        ),
    )
    monkeypatch.setattr(brain, "decide_multi_turn", script)

    start = post(
        client,
        "/api/sessions",
        {
            "audience": "consumer",
            "language": "en",
            "message": "I installed an app a caller told me to.",
        },
    ).json()
    sid = start["session_id"]
    assert start["turn"]["type"] == "consent_request"
    assert start["turn"]["fields"][0]["path"] == "device.recent_app_installs"
    assert "apps" in start["turn"]["fields"][0]["label"].lower()

    question = post(client, f"/api/sessions/{sid}/consent", {"granted": True}).json()
    assert question["turn"]["type"] == "question"

    answer = post(client, f"/api/sessions/{sid}/reply", {"text": "Yes, I typed them in."}).json()
    turn = answer["turn"]
    assert turn["type"] == "final"
    assert turn["answer"]["action_label"] == "Contact your bank now"
    assert turn["answer"]["escalation_label"] == "a security specialist"
    assert turn["answer"]["citations"][0]["title"]

    handoff = post(client, f"/api/sessions/{sid}/handoff").json()
    assert handoff["reference"].startswith("DSA-")
    assert "Yes, I typed them in." in handoff["summary"]
    assert "device.recent_app_installs" in handoff["summary"]


def test_reply_without_pending_question_is_rejected(monkeypatch, client):
    monkeypatch.setattr(brain, "decide_multi_turn", Script(done(final())))
    sid = post(
        client,
        "/api/sessions",
        {"audience": "consumer", "language": "en", "message": "A text about a parcel."},
    ).json()["session_id"]

    assert post(client, f"/api/sessions/{sid}/reply", {"text": "hello"}).status_code == 409


def test_unknown_session_is_404(client):
    assert post(client, "/api/sessions/nope/reply", {"text": "hi"}).status_code == 404


def test_brain_failure_still_gives_safe_advice(monkeypatch, client):
    def broken(*args, **kwargs):
        raise BrainUnavailable("no key")

    monkeypatch.setattr(brain, "decide_multi_turn", broken)

    turn = post(
        client,
        "/api/sessions",
        {"audience": "small_business", "language": "fi", "message": "Outo lasku."},
    ).json()["turn"]

    assert turn["type"] == "final"
    assert turn["answer"]["escalation_required"] is True
    assert turn["answer"]["escalation_target"] == "business_security_support"
    assert "Yhdistän" in turn["answer"]["advice_text"]
