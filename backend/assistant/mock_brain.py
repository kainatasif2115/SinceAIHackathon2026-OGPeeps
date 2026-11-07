"""A free stand-in for the AI brain: BRAIN_PROVIDER=mock.

It answers with the organisers' keyword rules (simset/baselines/rules_baseline.py),
so the whole app (chat, questions, permission cards, answers, handoff, accounts)
can be clicked through without spending ElevenLabs or Anthropic credits. The
answers are much weaker than the real model's and every one says it is a mock,
so it is for building and testing the app, never for measuring or a demo.
"""

import importlib.util
from functools import cache

from assistant import simset, vocab
from assistant.models import Decision, FinalAnswer, Question

URGENCY = {
    "none": "none",
    "low": "routine",
    "medium": "routine",
    "high": "today",
    "critical": "immediate",
}
NOTE = {
    "fi": "(Testivastaus ilman tekoälyä.)",
    "sv": "(Testsvar utan AI.)",
    "en": "(Test answer without the AI.)",
}


@cache
def _rules():
    path = simset.SIMSET_DIR / "baselines" / "rules_baseline.py"
    spec = importlib.util.spec_from_file_location("rules_baseline", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def answer_single_turn(case: dict) -> FinalAnswer:
    rules = _rules()
    action, used, ask = rules.decide(case)
    return _final(rules.answer_for(case, action, used, ask), case)


def decide_multi_turn(case: dict, history: list[dict], turns_left: int) -> Decision:
    rules = _rules()
    asked = [t for h in history if h["role"] == "assistant" for t in h.get("topics", [])]
    answers = [h["text"] for h in history if h["role"] == "user"]
    facts = dict(zip(asked, answers, strict=False))
    action, used, ask = rules.decide(case, facts)
    pending = [t for t in ask if t not in asked and t in vocab.question_topics()]
    if pending and turns_left > 0 and len(asked) < 2:
        language = case.get("language", "en")
        texts = rules.QUESTIONS[pending[0]]
        question = Question(text=texts.get(language, texts["en"]), topics=[pending[0]])
        return Decision(next="question", question=question, consent_request=None, answer=None)
    answer = _final(rules.answer_for(case, action, used, [], mode="multi_turn"), case)
    return Decision(next="final", question=None, consent_request=None, answer=answer)


def _final(out: dict, case: dict) -> FinalAnswer:
    language = case.get("language", "en")
    targets = vocab.escalation_targets()
    target = out.get("escalation_target")
    return FinalAnswer(
        risk_level=out["risk_level"],
        urgency=URGENCY[out["risk_level"]],
        primary_action=out["primary_action"],
        secondary_actions=[],
        escalation_required=bool(out["escalation_required"]),
        escalation_target=target if target in targets else None,
        advice_text=f"{out['advice_text']} {NOTE.get(language, NOTE['en'])}",
        step_ids=[],
        steps=[],
        questions_asked=out["questions_asked"],
        question_topics=[t for t in out["question_topics"] if t in vocab.question_topics()],
        signals_used=out["signals_used"],
        consent_requested_for=[],
        citations=[c for c in out["citations"] if c in vocab.guidance()],
        confidence=0.3,
    )
