import pytest
from django.test import Client

from api import accounts, sessions, teams
from assistant import brain
from tests.fakes import Script, done, final

PASSWORD = "kettu-ilves-2026"
J = "application/json"


@pytest.fixture(autouse=True)
def memory_only(settings, monkeypatch):
    settings.MONGODB_URI = ""
    settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
    sessions._memory.clear()
    accounts._memory.clear()
    teams._memory.clear()
    monkeypatch.setattr(brain, "decide_multi_turn", Script(done(final())))


def signup(email, kind="private", company="", name=None):
    client = Client()
    response = client.post(
        "/api/account/signup",
        {
            "email": email,
            "name": name or email.split("@")[0].title(),
            "password": PASSWORD,
            "kind": kind,
            "company": company,
        },
        content_type=J,
    )
    return client, response


def owner():
    client, response = signup("taimur@kahvila.fi", "business", "Kahvila Aalto Oy", "Taimur")
    assert response.status_code == 200
    return client


def chat(client, audience="small_business", message="Supplier sent new bank details"):
    return client.post(
        "/api/sessions",
        {"audience": audience, "language": "en", "message": message},
        content_type=J,
    ).json()


def test_private_and_business_sign_up():
    _, private = signup("aino@example.fi")
    _, business = signup("taimur@kahvila.fi", "business", "Kahvila Aalto Oy")

    assert private.json()["kind"] == "private"
    assert private.json()["company"] is None
    assert business.json() | {"created_at": None} == business.json() | {
        "kind": "business",
        "company": "Kahvila Aalto Oy",
        "role": "owner",
        "created_at": None,
    }


def test_a_business_needs_a_company_name():
    _, response = signup("taimur@kahvila.fi", "business", "  ")

    assert response.status_code == 400
    assert "company" in response.json()["detail"]


def test_invited_colleague_joins_by_signing_up_as_business():
    boss = owner()
    boss.post("/api/account/team/invites", {"email": "Anna@Kahvila.fi"}, content_type=J)
    assert boss.get("/api/account/team").json()["invites"] == ["anna@kahvila.fi"]

    anna, response = signup("anna@kahvila.fi", "business", name="Anna")

    assert response.json()["company"] == "Kahvila Aalto Oy"
    assert response.json()["role"] == "member"
    team = boss.get("/api/account/team").json()
    assert [m["name"] for m in team["members"]] == ["Taimur", "Anna"]
    assert team["invites"] == []
    assert anna.get("/api/account/team").json()["invites"] == []  # only the owner sees invites


def test_existing_account_accepts_the_invite():
    boss = owner()
    eero, _ = signup("eero@example.fi")
    boss.post("/api/account/team/invites", {"email": "eero@example.fi"}, content_type=J)

    assert eero.get("/api/account/me").json()["pending_invite"] == "Kahvila Aalto Oy"
    joined = eero.post("/api/account/team/join").json()

    assert (joined["kind"], joined["role"]) == ("business", "member")


def test_owner_sees_business_checks_but_never_private_ones():
    boss = owner()
    boss.post("/api/account/team/invites", {"email": "anna@kahvila.fi"}, content_type=J)
    anna, _ = signup("anna@kahvila.fi", "business", name="Anna")
    chat(anna, "small_business", "Invoice with a changed bank account")
    chat(anna, "consumer", "My own bank texted me")

    shared = boss.get("/api/account/team/conversations").json()

    assert [(c["author"], c["title"]) for c in shared] == [
        ("Anna", "Invoice with a changed bank account")
    ]
    assert len(anna.get("/api/account/conversations").json()) == 2
    assert anna.get("/api/account/team/conversations").status_code == 403


def test_only_the_owner_manages_the_team():
    boss = owner()
    boss.post("/api/account/team/invites", {"email": "anna@kahvila.fi"}, content_type=J)
    anna, _ = signup("anna@kahvila.fi", "business", name="Anna")

    attempt = anna.post("/api/account/team/invites", {"email": "x@y.fi"}, content_type=J)
    removed = boss.delete("/api/account/team/members/anna@kahvila.fi")

    assert attempt.status_code == 403
    assert [m["name"] for m in removed.json()["members"]] == ["Taimur"]
    assert anna.get("/api/account/me").json()["kind"] == "private"
    assert boss.delete("/api/account/team/members/taimur@kahvila.fi").status_code == 400


def test_member_can_leave_but_owner_cannot():
    boss = owner()
    boss.post("/api/account/team/invites", {"email": "anna@kahvila.fi"}, content_type=J)
    anna, _ = signup("anna@kahvila.fi", "business", name="Anna")

    assert anna.post("/api/account/team/leave").json()["kind"] == "private"
    assert boss.post("/api/account/team/leave").status_code == 409


def test_deleting_the_owner_closes_the_team_but_keeps_members():
    boss = owner()
    boss.post("/api/account/team/invites", {"email": "anna@kahvila.fi"}, content_type=J)
    anna, _ = signup("anna@kahvila.fi", "business", name="Anna")

    boss.delete("/api/account")

    me = anna.get("/api/account/me").json()
    assert (me["kind"], me["company"]) == ("private", None)
    assert teams._memory == {}


@pytest.mark.parametrize(
    ("email", "message"),
    [("not-an-email", "valid email"), ("taimur@kahvila.fi", "already in your team")],
)
def test_invite_explains_what_to_fix(email, message):
    boss = owner()

    response = boss.post("/api/account/team/invites", {"email": email}, content_type=J)

    assert response.status_code == 400
    assert message in response.json()["detail"]
