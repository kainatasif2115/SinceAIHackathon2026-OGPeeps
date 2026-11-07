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


def test_risky_final_first_offers_one_account_check(monkeypatch, en_case):
    gated = en_case["consent"]["requires_consent"][0]
    script = Script(done(final(risk_level="high")), ask_consent([gated]), done(final()))
    monkeypatch.setattr(brain, "decide_multi_turn", script)
    case = {**en_case, "consent": {**en_case["consent"], "pre_granted": []}}
    conv = engine.Conversation(case=case)

    turn = conv.next_turn()
    assert turn["type"] == "consent_request"
    assert gated in script.calls[1][0][3]  # the feedback names the hidden fields
    conv.record_consent(turn["fields"], False)

    assert conv.next_turn()["type"] == "final"
    assert len(script.calls) == 3


def test_account_check_is_offered_once_and_not_for_low_risk(monkeypatch, en_case):
    declined = Script(done(final(risk_level="high")), done(final(risk_level="high")))
    monkeypatch.setattr(brain, "decide_multi_turn", declined)
    conv = engine.Conversation(case=en_case)
    assert conv.next_turn()["type"] == "final"
    assert conv.consent_checked

    harmless = Script(done(final(risk_level="low", primary_action="no_action_needed")))
    monkeypatch.setattr(brain, "decide_multi_turn", harmless)
    assert engine.Conversation(case=en_case).next_turn()["type"] == "final"
    assert len(harmless.calls) == 1


def _signal(case: dict, path: str):
    cur = case["signals"]
    for part in path.split("."):
        cur = cur[part]
    return cur


def test_single_turn_answers_for_the_riskier_branch(en_case):
    answer = final(
        question_topics=["card_details_entered"],
        questions_asked=["Did you type your card number on the page?"],
        advice_text="If you typed your card number, contact your bank now. Otherwise do not "
        "open the link again and delete the message.",
    )

    checked = checker.check(answer, en_case, ConsentState()).answer

    assert checked.primary_action == "contact_bank_and_block_cards"
    assert "do_not_interact_and_delete" in checked.secondary_actions
    assert checked.risk_level == "high"
    found = simset.textcheck.find_steps(checked.advice_text + "\n" + "\n".join(checked.steps))
    assert {"block_card", "contact_bank_now"} & found


def test_riskier_branch_never_downgrades_or_applies_in_multi_turn(en_case):
    stronger = final(primary_action="escalate_to_human", question_topics=["card_details_entered"])
    asked_first = final(question_topics=["card_details_entered"])

    assert checker.check(stronger, en_case, ConsentState()).answer.primary_action == (
        "escalate_to_human"
    )
    multi = checker.check(asked_first, en_case, ConsentState(single_turn=False)).answer
    assert multi.primary_action == "do_not_interact_and_delete"


@pytest.mark.parametrize("language", ["en", "fi", "sv"])
def test_single_turn_also_covers_the_safer_branch(en_case, language):
    case = {**en_case, "language": language}
    answer = final(
        primary_action="contact_operator_support",
        question_topics=["self_initiated"],
        questions_asked=["Did you make the eSIM change yourself?"],
        advice_text="Contact your operator now and ask them to lock your number.",
    )

    checked = checker.check(answer, case, ConsentState()).answer

    assert "explain_benign" in simset.textcheck.find_steps(checked.advice_text)
    assert not checker.unsafe_statements(checked, language)


def test_safer_branch_sentence_is_not_added_twice_or_out_of_context(en_case):
    covered = final(
        primary_action="contact_bank_and_block_cards",
        question_topics=["payment_status"],
        advice_text="If the money has gone, call your bank now. If nothing has been paid, "
        "do not pay or transfer anything.",
    )
    no_attachment = final(
        primary_action="isolate_device_and_scan",
        question_topics=["app_installed"],
        advice_text="Disconnect the phone from the internet now and get it checked.",
    )
    case = {**en_case, "opening_message": "I installed a voicemail app from a text link."}

    for answer in (covered, no_attachment):
        fixes = checker.check(answer, case, ConsentState()).fixes
        assert not [f for f in fixes if "safer answer" in f]


def test_missing_api_key_is_brain_unavailable(monkeypatch):
    monkeypatch.setenv("BRAIN_PROVIDER", "anthropic")
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_AUTH_TOKEN", raising=False)

    with pytest.raises(brain.BrainUnavailable):
        brain.answer_single_turn({"case_id": "X", "language": "en"})


def test_self_service_answers_drop_the_handoff_and_its_sentence(en_case):
    answer = final(
        primary_action="change_password_and_enable_mfa",
        risk_level="high",
        escalation_required=True,
        escalation_target="security_specialist",
        advice_text="Change your password now. I am connecting you now to a security specialist.",
        steps=["Change your password.", "I am connecting you to a specialist."],
        step_ids=["change_password"],
    )

    checked = checker.check(answer, en_case, ConsentState()).answer

    assert not checked.escalation_required
    assert checked.escalation_target is None
    assert "connecting" not in checked.advice_text + " ".join(checked.steps)
    assert "Change your password" in checked.advice_text


@pytest.mark.parametrize(
    ("action", "risk"),
    [("change_password_and_enable_mfa", "critical"), ("isolate_device_and_scan", "high")],
)
def test_handoff_stays_where_it_is_needed(en_case, action, risk):
    answer = final(
        primary_action=action,
        risk_level=risk,
        escalation_required=True,
        escalation_target="security_specialist",
    )

    assert checker.check(answer, en_case, ConsentState()).answer.escalation_required


def test_a_conditional_offer_of_a_person_is_kept(en_case):
    offer = "If you already gave a code, tell me and I will connect you to support."
    answer = final(
        primary_action="verify_via_official_channel",
        risk_level="high",
        escalation_required=True,
        advice_text=f"Call your bank on the number on your card. {offer}",
    )

    checked = checker.check(answer, en_case, ConsentState()).answer

    assert not checked.escalation_required
    assert offer in checked.advice_text


def test_a_password_change_is_never_low_risk(en_case):
    answer = final(primary_action="change_password_and_enable_mfa", risk_level="low")

    checked = checker.check(answer, en_case, ConsentState()).answer

    assert (checked.risk_level, checked.urgency) == ("high", "today")
