import pytest
from django.test import Client

from api import accounts, sessions
from assistant import brain
from tests.fakes import Script, ask, ask_consent, done, final

PASSWORD = "kettu-ilves-2026"


@pytest.fixture
def client(settings):
    settings.MONGODB_URI = ""
    # The real hasher is deliberately slow; tests only need it to round-trip.
    settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
    sessions._memory.clear()
    accounts._memory.clear()
    return Client()


def signup(client, email="Aino@Example.fi", password=PASSWORD, name="Aino"):
    return client.post(
        "/api/account/signup",
        {"email": email, "name": name, "password": password},
        content_type="application/json",
    )


def login(client, email="aino@example.fi", password=PASSWORD):
    return client.post(
        "/api/account/login",
        {"email": email, "password": password},
        content_type="application/json",
    )


def start_chat(client, monkeypatch, message="Got a strange text"):
    monkeypatch.setattr(brain, "decide_multi_turn", Script(done(final())))
    return client.post(
        "/api/sessions",
        {"audience": "consumer", "language": "en", "message": message},
        content_type="application/json",
    ).json()


def test_signup_signs_you_in_and_never_stores_the_password(client):
    response = signup(client)

    assert response.status_code == 200
    assert response.json()["email"] == "aino@example.fi"
    cookie = response.cookies[accounts.COOKIE]
    assert cookie["httponly"] and cookie["samesite"] == "Strict"
    assert client.get("/api/account/me").json()["name"] == "Aino"
    stored = next(iter(accounts._memory.values()))
    assert PASSWORD not in str(stored)


@pytest.mark.parametrize(
    ("email", "password", "message"),
    [
        ("not-an-email", PASSWORD, "valid email"),
        ("aino@example.fi", "12345678", "too common"),
        ("aino@example.fi", "short", "too short"),
    ],
)
def test_signup_explains_what_to_fix(client, email, password, message):
    response = signup(client, email=email, password=password)

    assert response.status_code == 400
    assert message in response.json()["detail"]


def test_one_account_per_email_whatever_the_case(client):
    signup(client)

    response = signup(Client(), email="AINO@example.fi")

    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_login_and_lockout_after_five_wrong_passwords(client):
    signup(Client())

    assert login(client, password="wrong").status_code == 401
    assert login(client, email="nobody@example.fi").status_code == 401
    assert login(client).status_code == 200
    for _ in range(accounts.MAX_FAILURES):
        login(client, password="wrong")
    assert login(client).status_code == 429


def test_signed_out_or_tampered_cookie_is_refused(client):
    assert client.get("/api/account/me").status_code == 401
    client.cookies[accounts.COOKIE] = "forged"
    assert client.get("/api/account/me").status_code == 401


def test_conversations_show_on_your_account_only(client, monkeypatch):
    start_chat(Client(), monkeypatch, "Anonymous chat")
    signup(client)
    mine = start_chat(client, monkeypatch, "My parcel text")
    other = Client()
    signup(other, email="eero@example.fi")
    start_chat(other, monkeypatch, "Eero's chat")

    listed = client.get("/api/account/conversations").json()

    assert [c["session_id"] for c in listed] == [mine["session_id"]]
    assert listed[0]["title"] == "My parcel text"
    assert listed[0]["state"] == "answered"
    assert listed[0]["action_label"]


def test_handoff_status_shows_on_the_account(client, monkeypatch):
    signup(client)
    chat = start_chat(client, monkeypatch)
    client.post(f"/api/sessions/{chat['session_id']}/handoff")

    listed = client.get("/api/account/conversations").json()

    assert listed[0]["handoff_reference"].startswith("DSA-")
    assert listed[0]["handoff_status"] == "backlog"


def test_deleting_the_account_removes_it_and_its_conversations(client, monkeypatch):
    signup(client)
    chat = start_chat(client, monkeypatch)
    anonymous = start_chat(Client(), monkeypatch)

    assert client.delete("/api/account").status_code == 204

    assert client.get("/api/account/me").status_code == 401
    assert sessions.load(chat["session_id"]) is None
    assert sessions.load(anonymous["session_id"]) is not None
    assert login(Client()).status_code == 401


def test_a_past_conversation_can_be_reopened_in_order(client, monkeypatch):
    signup(client)
    script = Script(ask("Did you open the link?", ["link_details"]), done(final()))
    monkeypatch.setattr(brain, "decide_multi_turn", script)
    chat = client.post(
        "/api/sessions",
        {"audience": "consumer", "language": "en", "message": "Parcel fee text"},
        content_type="application/json",
    ).json()
    client.post(
        f"/api/sessions/{chat['session_id']}/reply",
        {"text": "No, I didn't."},
        content_type="application/json",
    )

    detail = client.get(f"/api/account/conversations/{chat['session_id']}").json()

    assert [
        (m["role"], (m["turn"] or {}).get("type") or m["text"]) for m in detail["messages"]
    ] == [
        ("user", "Parcel fee text"),
        ("assistant", "question"),
        ("user", "No, I didn't."),
        ("assistant", "final"),
    ]
    assert detail["language"] == "en"


def test_a_permission_choice_is_remembered(client, monkeypatch):
    signup(client)
    gated = sessions._demo_customer("consumer")["consent"]["requires_consent"][0]
    monkeypatch.setattr(brain, "decide_multi_turn", Script(ask_consent([gated]), done(final())))
    chat = client.post(
        "/api/sessions",
        {"audience": "consumer", "language": "en", "message": "My eSIM moved"},
        content_type="application/json",
    ).json()
    client.post(
        f"/api/sessions/{chat['session_id']}/consent",
        {"granted": False},
        content_type="application/json",
    )

    detail = client.get(f"/api/account/conversations/{chat['session_id']}").json()

    card = next(m for m in detail["messages"] if (m["turn"] or {}).get("type") == "consent_request")
    assert card["choice"] is False


def test_nobody_else_can_open_your_conversation(client, monkeypatch):
    signup(client)
    chat = start_chat(client, monkeypatch)
    stranger = Client()
    signup(stranger, email="eero@example.fi")

    assert stranger.get(f"/api/account/conversations/{chat['session_id']}").status_code == 404
    assert Client().get(f"/api/account/conversations/{chat['session_id']}").status_code == 401
