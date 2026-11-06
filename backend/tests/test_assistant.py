import pytest

from assistant import brain, checker, engine, simset
from assistant.checker import ConsentState
from tests.fakes import Script, ask, ask_consent, done, final


@pytest.fixture(scope="module")
def cases():
    return {c["case_id"]: c for c in simset.load_jsonl(simset.DEV_CASES)}


@pytest.fixture
def en_case(cases):
    return next(
        c for c in cases.values() if c["language"] == "en" and c["consent"]["requires_consent"]
    )


def test_prompt_contains_every_vocabulary():
    from assistant import prompt, vocab

    text = prompt.system_prompt()
    for ids in (vocab.actions(), vocab.steps(), vocab.question_topics(), vocab.guidance()):
        assert all(i in text for i in ids)


def test_no_action_needed_never_escalates(en_case):
    answer = final(primary_action="no_action_needed", risk_level="medium", escalation_required=True)

    checked = checker.check(answer, en_case, ConsentState()).answer

    assert checked.escalation_required is False
    assert checked.escalation_target is None
    assert checked.risk_level in ("none", "low")


def test_handoff_gets_a_default_target(en_case):
    answer = final(primary_action="escalate_to_human", escalation_required=False)

    checked = checker.check(answer, en_case, ConsentState()).answer

    assert checked.escalation_required is True
    assert checked.escalation_target is not None


def test_single_turn_consent_matches_gated_signals_used(en_case):
    gated = en_case["consent"]["requires_consent"][0]
    answer = final(signals_used=["artifact", gated, "not.a.signal"], consent_requested_for=[])

    checked = checker.check(answer, en_case, ConsentState()).answer

    assert checked.signals_used == ["artifact", gated]
    assert checked.consent_requested_for == [gated]


def test_multi_turn_drops_signals_used_without_consent(en_case):
    gated = en_case["consent"]["requires_consent"][0]
    answer = final(signals_used=["artifact", gated])

    result = checker.check(answer, en_case, ConsentState(single_turn=False))

    assert gated not in result.answer.signals_used
    assert result.fixes


def test_missing_step_wording_is_added(en_case):
    answer = final(
        advice_text="Please be careful with this one, it is not what it seems to be.", steps=[]
    )

    checked = checker.check(answer, en_case, ConsentState()).answer

    found = simset.textcheck.find_steps(checked.advice_text + "\n" + "\n".join(checked.steps))
    assert "dont_open_link" in found
    assert "dont_open_link" in simset.textcheck.find_steps(checked.advice_text.split(".")[0])


def test_unsafe_wording_triggers_one_rewrite(monkeypatch, en_case):
    unsafe = final(advice_text="It is safe to pay the small fee. Do not open the link though.")
    safe = final()
    script = Script(unsafe, safe)
    monkeypatch.setattr(brain, "answer_single_turn", script)

    sub = engine.single_turn(en_case)

    assert len(script.calls) == 2
    assert "never be said" in script.calls[1][0][1]
    assert sub["advice_text"] == safe.advice_text
    assert set(sub) >= {
        "case_id",
        "risk_level",
        "primary_action",
        "advice_text",
        "escalation_required",
    }


def test_unsafe_wording_is_stripped_if_rewrite_fails(monkeypatch, en_case):
    unsafe = final(advice_text="Do not open the link. It is safe to pay the small fee.")
    monkeypatch.setattr(brain, "answer_single_turn", Script(unsafe, unsafe))

    sub = engine.single_turn(en_case)

    assert "pay" not in sub["advice_text"].lower()
    assert simset.textcheck.find_unsafe(sub["advice_text"], lang="en") == []


def test_conversation_hides_gated_signals_until_granted(monkeypatch, en_case):
    gated = en_case["consent"]["requires_consent"][0]
    seen = []

    def fake(case, history, turns_left, feedback=None):
        seen.append(case)
        if len(seen) == 1:
            return ask_consent([gated, "made.up.field"])
        if len(seen) == 2:
            return ask("Did you enter any card details?", ["card_details_entered"])
        return done(final(signals_used=["artifact", gated]))

    monkeypatch.setattr(brain, "decide_multi_turn", fake)
    conv = engine.Conversation(case=en_case)

    first = conv.next_turn()
    assert first == {"type": "consent_request", "fields": [gated], "text": "May I look at this?"}
    conv.record_consent(first["fields"], True)
    assert conv.next_turn()["type"] == "question"
    conv.record_answer("No, I closed the page.")
    result = conv.next_turn()

    assert _signal(seen[0], gated) == "available_with_consent"
    assert _signal(seen[1], gated) != "available_with_consent"
    assert result["type"] == "final"
    assert result["answer"]["question_topics"] == ["card_details_entered"]
    assert gated in result["answer"]["signals_used"]
    assert result["answer"]["consent_requested_for"] == [gated]


def test_conversation_stops_asking_at_the_turn_limit(monkeypatch, en_case):
    calls = []

    def fake(case, history, turns_left, feedback=None):
        calls.append(turns_left)
        return ask("Anything else?", ["time_of_event"]) if turns_left else done(final())

    monkeypatch.setattr(brain, "decide_multi_turn", fake)
    conv = engine.Conversation(case=en_case, max_turns=1)

    assert conv.next_turn()["type"] == "question"
    conv.record_answer("Not sure.")
    assert conv.next_turn()["type"] == "final"
    assert calls == [1, 0]


def _signal(case: dict, path: str):
    cur = case["signals"]
    for part in path.split("."):
        cur = cur[part]
    return cur
