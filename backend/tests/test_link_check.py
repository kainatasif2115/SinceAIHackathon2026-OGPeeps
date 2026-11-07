import pytest
from django.test import Client

from api import link_check, sessions
from assistant import brain
from tests.fakes import Script, ask, done, final


@pytest.mark.parametrize(
    ("text", "verdict"),
    [
        ("Pay the fee at https://posti-delivery-fi.top/pay now", "malicious"),
        ("https://op.fi.secure-login.xyz/verify", "malicious"),
        ("login at http://192.168.4.20/login", "malicious"),
        ("tulli-maksu.com", "suspicious"),
        ("go to bit.ly/3xYz", "unknown"),
        ("your order at verkkokauppa.com", "unknown"),
        ("track it at www.posti.fi/seuranta", "clean"),
    ],
)
def test_verdicts(text, verdict):
    result = link_check.check_text(text)

    assert result["verdict"] == verdict
    assert result["source"] == "simulated_demo_check"
    assert set(result) >= {"url", "verdict", "confidence", "categories", "domain_age_days"}


def test_unfamiliar_links_are_never_called_clean():
    for url in ("https://normalshop.com", "https://totally-normal-shop.com", "kotimarket.fi"):
        assert link_check.check(url)["verdict"] != "clean"


def test_no_link_no_check():
    assert link_check.check_text("Hei äiti, tämä on uusi numeroni") is None


def test_the_most_worrying_link_wins():
    result = link_check.check_text("Track it at posti.fi or pay at posti-tulli.top/pay")

    assert result["verdict"] == "malicious"


@pytest.fixture
def client(settings):
    settings.MONGODB_URI = ""
    sessions._memory.clear()
    return Client()


def test_typed_link_reaches_the_brain_as_a_link_check(monkeypatch, client):
    script = Script(ask("Did you open it?", ["link_details"]), done(final()))
    monkeypatch.setattr(brain, "decide_multi_turn", script)

    start = client.post(
        "/api/sessions",
        {"audience": "consumer", "language": "en", "message": "Got a text with dna-bonus.click"},
        content_type="application/json",
    ).json()
    first_case = script.calls[0][0][0]
    assert first_case["signals"]["link_check"]["verdict"] in ("suspicious", "malicious")

    client.post(
        f"/api/sessions/{start['session_id']}/reply",
        {"text": "No."},
        content_type="application/json",
    )
    assert script.calls[1][0][0]["signals"]["link_check"]["url"] == "dna-bonus.click"


def test_link_in_a_later_reply_is_checked(monkeypatch, client):
    script = Script(ask("What did the message say?", ["message_content"]), done(final()))
    monkeypatch.setattr(brain, "decide_multi_turn", script)

    start = client.post(
        "/api/sessions",
        {"audience": "consumer", "language": "en", "message": "I got a weird text"},
        content_type="application/json",
    ).json()
    assert script.calls[0][0][0]["signals"]["link_check"] is None

    client.post(
        f"/api/sessions/{start['session_id']}/reply",
        {"text": "It said pay at https://posti-delivery-fi.top/pay"},
        content_type="application/json",
    )
    assert script.calls[1][0][0]["signals"]["link_check"]["verdict"] == "malicious"
