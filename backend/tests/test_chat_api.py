import pytest
from django.test import Client

from api import agent_auth, results, sessions, tickets
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


# A 1x1 PNG, enough to exercise the screenshot path end to end.
PIXEL = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAE"
    "hQGAhKmMIQAAAABJRU5ErkJggg=="
)


def test_screenshots_reach_the_brain(monkeypatch, client):
    script = Script(ask("Did you tap the link?", ["link_details"]), done(final()))
    monkeypatch.setattr(brain, "decide_multi_turn", script)

    sid = post(
        client,
        "/api/sessions",
        {
            "audience": "consumer",
            "language": "en",
            "message": "Is this text real?",
            "images": [{"media_type": "image/png", "data": PIXEL}],
        },
    ).json()["session_id"]
    post(
        client,
        f"/api/sessions/{sid}/reply",
        {"text": "", "images": [{"media_type": "image/png", "data": PIXEL}]},
    )

    first_images = script.calls[0][1]["images"]
    assert [i["turn"] for i in first_images] == [0]
    second_args, second_kwargs = script.calls[1]
    assert [i["turn"] for i in second_kwargs["images"]] == [0, 1]
    history = second_args[1]
    assert history[-1] == {
        "role": "user",
        "text": "(I sent only a screenshot.)",
        "screenshots_attached": 1,
    }


def test_screenshot_only_start_is_allowed(monkeypatch, client):
    monkeypatch.setattr(brain, "decide_multi_turn", Script(done(final())))

    res = post(
        client,
        "/api/sessions",
        {
            "audience": "consumer",
            "language": "fi",
            "images": [{"media_type": "image/png", "data": PIXEL}],
        },
    )

    assert res.status_code == 200
    assert res.json()["turn"]["type"] == "final"


@pytest.mark.parametrize(
    "body",
    [
        {"message": ""},
        {"message": "x", "images": [{"media_type": "image/png", "data": "not base64!"}]},
        {"message": "x", "images": [{"media_type": "image/svg+xml", "data": PIXEL}]},
        {"message": "x", "images": [{"media_type": "image/png", "data": PIXEL}] * 4},
    ],
)
def test_bad_screenshots_are_rejected(client, body):
    res = post(client, "/api/sessions", {"audience": "consumer", "language": "en", **body})
    assert res.status_code == 422


def test_brain_gets_screenshots_as_image_blocks():
    content = brain.with_images(
        "case text", [{"media_type": "image/png", "data": PIXEL, "turn": 0}]
    )

    assert content[0]["text"] == brain.SCREENSHOT_NOTE
    assert content[2]["source"] == {"type": "base64", "media_type": "image/png", "data": PIXEL}
    assert content[-1] == {"type": "text", "text": "case text"}
    assert brain.with_images("case text", []) == "case text"


def _handoff_case(monkeypatch, client):
    monkeypatch.setattr(
        brain,
        "decide_multi_turn",
        Script(
            ask("Did you read the code out?", ["code_shared"]),
            done(
                final(
                    risk_level="critical",
                    urgency="immediate",
                    primary_action="contact_operator_support",
                    escalation_required=True,
                    escalation_target="operator_support_agent",
                )
            ),
        ),
    )
    sid = post(
        client,
        "/api/sessions",
        {"audience": "consumer", "language": "en", "message": "A caller asked for my code."},
    ).json()["session_id"]
    post(client, f"/api/sessions/{sid}/reply", {"text": "Yes, I read it out."})
    return post(client, f"/api/sessions/{sid}/handoff").json()["reference"]


def _sign_in(monkeypatch, client):
    monkeypatch.setenv("AGENT_DEMO_USER", "demo.agent")
    monkeypatch.setenv("AGENT_DEMO_PASSWORD", "test-only-password")
    res = post(
        client, "/api/agent/login", {"username": "demo.agent", "password": "test-only-password"}
    )
    assert res.status_code == 200


def test_handoff_creates_a_ticket_on_the_agent_board(monkeypatch, client):
    tickets._memory.clear()
    _sign_in(monkeypatch, client)
    reference = _handoff_case(monkeypatch, client)

    board = client.get("/api/agent/tickets").json()
    ticket = next(t for t in board if t["reference"] == reference)

    assert ticket["status"] == "backlog"
    assert ticket["severity"] == "critical"
    assert ticket["team"] == "operator_support_agent"
    assert ticket["demo"] is False
    assert [line["role"] for line in ticket["transcript"]] == ["customer", "assistant", "customer"]
    assert ticket["advice"]["action_label"]
    # Demo tickets fill the board alongside the real one.
    assert any(t["demo"] for t in board)


def test_agent_can_move_a_ticket(monkeypatch, client):
    tickets._memory.clear()
    _sign_in(monkeypatch, client)
    reference = _handoff_case(monkeypatch, client)

    moved = client.patch(
        f"/api/agent/tickets/{reference}",
        {"status": "in_progress"},
        content_type="application/json",
    )

    assert moved.status_code == 200
    assert moved.json()["status"] == "in_progress"
    bad = client.patch(
        f"/api/agent/tickets/{reference}", {"status": "lost"}, content_type="application/json"
    )
    assert bad.status_code == 422
    missing = client.patch(
        "/api/agent/tickets/NOPE", {"status": "done"}, content_type="application/json"
    )
    assert missing.status_code == 404


def test_delete_now_removes_the_conversation(monkeypatch, client):
    monkeypatch.setattr(brain, "decide_multi_turn", Script(done(final())))
    sid = post(
        client,
        "/api/sessions",
        {"audience": "consumer", "language": "en", "message": "A text about a parcel."},
    ).json()["session_id"]

    assert client.delete(f"/api/sessions/{sid}").status_code == 204
    assert sessions.load(sid) is None
    assert client.delete(f"/api/sessions/{sid}").status_code == 404
    assert post(client, f"/api/sessions/{sid}/handoff").status_code == 404


def test_agent_console_needs_the_demo_login(monkeypatch, client):
    monkeypatch.setattr(agent_auth.time, "sleep", lambda _: None)
    monkeypatch.setenv("AGENT_DEMO_USER", "demo.agent")
    monkeypatch.setenv("AGENT_DEMO_PASSWORD", "test-only-password")

    assert client.get("/api/agent/tickets").status_code == 401
    assert client.get("/api/agent/me").status_code == 401
    wrong = {"username": "demo.agent", "password": "nope"}
    assert post(client, "/api/agent/login", wrong).status_code == 401

    good = {"username": "Demo.Agent", "password": "test-only-password"}
    login = post(client, "/api/agent/login", good)
    assert login.status_code == 200
    cookie = login.cookies["agent_session"]
    assert cookie["httponly"] and cookie["samesite"] == "Strict"
    assert client.get("/api/agent/me").json() == {"name": "Demo Agent"}
    assert client.get("/api/agent/tickets").status_code == 200

    assert post(client, "/api/agent/logout").status_code == 204
    assert client.get("/api/agent/tickets").status_code == 401


def test_agent_login_is_off_without_a_configured_password(monkeypatch, client):
    monkeypatch.delenv("AGENT_DEMO_PASSWORD", raising=False)
    res = post(client, "/api/agent/login", {"username": "demo.agent", "password": "x"})
    assert res.status_code == 503


def test_forged_or_tampered_session_cookie_is_rejected(monkeypatch, client):
    monkeypatch.setenv("AGENT_DEMO_PASSWORD", "test-only-password")
    client.cookies["agent_session"] = "not-a-signed-value"
    assert client.get("/api/agent/tickets").status_code == 401


def test_results_page_reads_the_evaluator_files(monkeypatch, client):
    assert client.get("/api/agent/results").status_code == 401
    _sign_in(monkeypatch, client)

    runs = client.get("/api/agent/results").json()["runs"]

    baseline = runs["baseline"]["metrics"]
    assert baseline["cases"] == 588
    assert baseline["safe_action_pass"] == 60.5
    assert baseline["by_journey"]["suspicious_call"] == {"n": 72, "pass": 13.9}
    assert baseline["scorecard"]["weighted"] == 67.1
    assert baseline["failure_types"]["no_substantive_advice"] == 187
    assert set(runs) >= {"single", "baseline"}


def test_results_parser_handles_missing_values():
    text = (
        "Cases scored: 10   (missing submissions: 0)\n"
        "  Safe-action pass             50.0 %   95% CI 20.0-80.0\n"
        "  False alarms on benign         n/a\n"
        "  Failure types: \n"
    )
    parsed = results.parse(text)

    assert parsed["cases"] == 10
    assert parsed["safe_action_pass_ci"] == [20.0, 80.0]
    assert parsed["false_alarms"] is None
    assert parsed["failure_types"] == {}


def test_case_browser_shows_chats_with_official_verdicts(monkeypatch, client):
    assert client.get("/api/agent/cases").status_code == 401
    _sign_in(monkeypatch, client)

    listing = client.get("/api/agent/cases?run=multi").json()
    assert len(listing["cases"]) == 30
    first = listing["cases"][0]
    assert {"case_id", "journey", "language", "passed", "failures"} <= set(first)

    chat = client.get(f"/api/agent/cases/multi/{first['case_id']}").json()
    assert chat["transcript"][0]["role"] == "user"
    assert chat["transcript"][-1]["type"] == "final"
    assert chat["expected"]["action"]

    single = client.get("/api/agent/cases?run=single").json()["cases"]
    assert sum(c["passed"] for c in single) == 485  # 82.5 % of 588, as the evaluator says

    assert client.get("/api/agent/cases?run=nope").status_code == 404
    assert client.get("/api/agent/cases/multi/NOPE").status_code == 404
