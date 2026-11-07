import pytest

from api import voice
from assistant import engine, simset


@pytest.fixture
def mock_brain(monkeypatch):
    monkeypatch.setenv("BRAIN_PROVIDER", "mock")


@pytest.fixture(scope="module")
def cases():
    return simset.load_jsonl(simset.DEV_CASES)


def test_mock_answers_every_journey_without_credentials(mock_brain, cases):
    by_journey = {c["journey"]: c for c in cases}

    for case in by_journey.values():
        answer = engine.single_turn(case)

        assert answer["primary_action"]
        assert "Test" in answer["advice_text"] or "Testi" in answer["advice_text"]


def test_mock_chat_asks_then_answers(mock_brain, cases):
    esim = next(c for c in cases if "eSIM" in c["opening_message"] and c["language"] == "en")
    conv = engine.Conversation(case=esim)

    turns = []
    for _ in range(4):
        turn = conv.next_turn()
        turns.append(turn["type"])
        if turn["type"] == "final":
            break
        if turn["type"] == "question":
            conv.record_answer("No, it wasn't me.")
        else:
            conv.record_consent(turn["fields"], granted=False)

    assert turns[-1] == "final"


def test_voice_can_be_switched_off(monkeypatch):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test-key")
    assert voice.is_configured()

    monkeypatch.setenv("VOICE_ENABLED", "false")
    assert not voice.is_configured()
