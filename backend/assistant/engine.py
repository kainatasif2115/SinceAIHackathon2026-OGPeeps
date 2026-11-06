"""Runs the brain and the checker together, for single answers and conversations.

Used by the batch script (single-turn predictions), the simulator bot
(multi-turn practice) and the chat API (the demo).
"""

from dataclasses import dataclass, field
from typing import Any

from dsakit.simulator import SENSITIVE_HIDDEN, reveal_signals, visible_case

from assistant import brain, checker, vocab
from assistant.checker import ConsentState
from assistant.models import FinalAnswer

MAX_TURNS = 6


def _unsafe_feedback(unsafe: list[dict]) -> str:
    items = "; ".join(f'{u["claim"]} ("{u["match"]}")' for u in unsafe)
    return (
        "Your previous answer contained statements that must never be said to the user: "
        f"{items}. Write the answer again without them."
    )


def _checked(propose, case: dict, consent: ConsentState) -> FinalAnswer:
    """Propose, check, retry once on unsafe wording, then strip what is still unsafe."""
    result = checker.check(propose(None), case, consent)
    if result.unsafe:
        result = checker.check(propose(_unsafe_feedback(result.unsafe)), case, consent)
        if result.unsafe:
            return checker.strip_unsafe(result.answer, case["language"])
    return result.answer


def to_submission(case_id: str, answer: FinalAnswer, mode: str) -> dict:
    sub = answer.model_dump(exclude={"step_ids"})
    sub.update(case_id=case_id, mode=mode)
    return sub


def single_turn(case: dict) -> dict:
    """One answer in the organisers' submission format."""
    answer = _checked(
        lambda feedback: brain.answer_single_turn(case, feedback),
        case,
        ConsentState(single_turn=True),
    )
    return to_submission(case["case_id"], answer, "single_turn")


def fallback_answer(case: dict) -> FinalAnswer:
    """Used only when Claude is unavailable: a safe, generic answer plus a human handoff."""
    language = case["language"]
    texts = {
        "fi": "Älä toimi viestin tai puhelun ohjeiden mukaan. Tarkista asia itse palvelun omasta "
        "sovelluksesta tai tunnetusta numerosta. Yhdistän sinut nyt asiakaspalvelumme ihmiselle, "
        "joka käy tilanteen läpi kanssasi.",
        "sv": "Följ inte instruktionerna i meddelandet eller samtalet. Kontrollera saken själv i "
        "tjänstens egen app eller via ett nummer du redan känner till. Jag kopplar dig nu till en "
        "person i vår kundtjänst.",
        "en": "Do not follow the instructions in the message or call. Check the matter yourself in "
        "the service's own app or on a number you already know. I am connecting you now to a "
        "person in our customer service who can go through this with you.",
    }
    return FinalAnswer(
        risk_level="medium",
        urgency="today",
        primary_action="verify_via_official_channel",
        secondary_actions=["escalate_to_human"],
        escalation_required=True,
        escalation_target=vocab.default_escalation_target("escalate_to_human", case["audience"]),
        advice_text=texts.get(language, texts["en"]),
        step_ids=["verify_official_channel"],
        steps=[],
        questions_asked=[],
        question_topics=[],
        signals_used=["artifact"],
        consent_requested_for=[],
        citations=[],
        confidence=0.2,
    )


@dataclass
class Conversation:
    """One multi-turn conversation. `case` is the full case; the brain only sees
    consent-gated signals the user has allowed."""

    case: dict
    max_turns: int = MAX_TURNS
    history: list[dict] = field(default_factory=list)
    granted: set[str] = field(default_factory=set)
    refused: set[str] = field(default_factory=set)
    turns_used: int = 0
    revealed: dict[str, Any] = field(default_factory=dict)

    def view(self) -> dict:
        """What the brain may see right now."""
        c = visible_case(self.case, granted=self.granted)
        for path, value in self.revealed.items():  # values handed over by an external harness
            cur = c["signals"]
            *parents, leaf = path.split(".")
            for p in parents:
                cur = cur.setdefault(p, {})
            cur[leaf] = value
        return c

    def record_answer(self, text: str) -> None:
        self.history.append({"role": "user", "text": text})

    def record_consent(self, fields: list[str], granted: bool, values: dict | None = None) -> None:
        (self.granted if granted else self.refused).update(fields)
        if granted and values:
            self.revealed.update(values)
        self.history.append({"role": "consent", "fields": fields, "granted": granted})

    def next_turn(self) -> dict:
        """Ask the brain for the next move; returns a question, consent request or final answer."""
        turns_left = self.max_turns - self.turns_used
        view = self.view()
        consent = ConsentState(granted=self.granted, refused=self.refused, single_turn=False)
        decision = brain.decide_multi_turn(view, self.history, turns_left)

        if turns_left > 0 and decision.next == "question" and decision.question:
            q = decision.question
            topics = list(dict.fromkeys(q.topics))[: checker.MAX_QUESTION_TOPICS]
            return self._ask({"type": "question", "text": q.text, "topics": topics})

        if turns_left > 0 and decision.next == "consent_request" and decision.consent_request:
            req = decision.consent_request
            gated = set(self.case["consent"]["requires_consent"])
            asked_before = self.granted | self.refused
            fields = [f for f in dict.fromkeys(req.fields) if f in gated and f not in asked_before]
            if fields:
                return self._ask({"type": "consent_request", "fields": fields, "text": req.text})

        if decision.next == "final" and decision.answer:
            first = decision.answer

            def propose(feedback):
                if feedback is None:
                    return first
                again = brain.decide_multi_turn(view, self.history, 0, feedback)
                return again.answer or first

            answer = _checked(propose, view, consent)
        else:
            # The brain asked for something it may not ask (no turns left, invalid fields).
            answer = _checked(
                lambda feedback: (
                    brain.decide_multi_turn(view, self.history, 0, feedback).answer
                    or fallback_answer(view)
                ),
                view,
                consent,
            )
        sub = to_submission(self.case["case_id"], answer, "multi_turn")
        sub["question_topics"] = [
            t for h in self.history if h["role"] == "assistant" for t in h.get("topics", [])
        ]
        sub["questions_asked"] = [
            h["text"] for h in self.history if h["role"] == "assistant" and h["type"] == "question"
        ]
        return {"type": "final", "answer": sub}

    def _ask(self, turn: dict) -> dict:
        self.turns_used += 1
        self.history.append({"role": "assistant", **turn})
        return turn


__all__ = ["SENSITIVE_HIDDEN", "Conversation", "fallback_answer", "reveal_signals", "single_turn"]
