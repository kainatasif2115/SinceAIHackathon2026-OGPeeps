"""Runs the brain and the checker together, for single answers and conversations.

Used by the batch script (single-turn predictions), the simulator bot
(multi-turn practice) and the chat API (the demo).
"""

from contextvars import ContextVar
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


def _consent_feedback(fields: list[str]) -> str:
    return (
        "Before you give your final answer: you have not offered to check any account data. "
        f"These fields are available with the user's permission: {', '.join(fields)}. "
        "Would exactly one of them confirm or rule out the main suspicion (see the list under "
        "'Multi-turn mode' in your instructions, e.g. subscription.recent_events after a SIM, "
        "eSIM or order worry, operator_account.recent_logins after a sign-in alert, "
        "device.security_findings after remote access)? If yes, reply with next = "
        '"consent_request" for that one field, saying what you will look at and why. '
        'If none of them would change the advice, reply with next = "final" and your answer.'
    )


# Optional record of what the safety checker did, for the red-team arena. None (the
# default) means nothing is recorded; the checking itself is the same either way.
SAFETY_LOG: ContextVar[list[dict] | None] = ContextVar("safety_log", default=None)


def _log(event: str, **details) -> None:
    log = SAFETY_LOG.get()
    if log is not None:
        log.append({"event": event, **details})


def _checked(propose, case: dict, consent: ConsentState) -> FinalAnswer:
    """Propose, check, retry once on unsafe wording, then strip what is still unsafe."""
    result = checker.check(propose(None), case, consent)
    _log("checked", unsafe=result.unsafe, fixes=result.fixes)
    if result.unsafe:
        result = checker.check(propose(_unsafe_feedback(result.unsafe)), case, consent)
        _log("rewritten", unsafe=result.unsafe, fixes=result.fixes)
        if result.unsafe:
            _log("stripped", unsafe=result.unsafe)
            return checker.strip_unsafe(result.answer, case["language"])
    return result.answer


def to_submission(case_id: str, answer: FinalAnswer, mode: str) -> dict:
    sub = answer.model_dump(exclude={"step_ids"})
    sub.update(case_id=case_id, mode=mode)
    return sub


def shown_steps(answer: FinalAnswer) -> list[str]:
    """The steps the chat shows: the model's own, without the checker's standard-wording
    copies of steps it already gave (all of them if nothing else would be left)."""
    own = [s for s in answer.steps if s not in answer._added_steps]
    return own or list(answer.steps)


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
    # Screenshots from the user: {"media_type", "data" (base64), "turn" (0 = opening message)}.
    images: list[dict] = field(default_factory=list)
    # Set once the brain has been asked whether an account check would help (see next_turn).
    consent_checked: bool = False

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

    def add_images(self, images: list[dict], turn: int) -> None:
        self.images.extend({**image, "turn": turn} for image in images)

    def record_answer(self, text: str, images: list[dict] | None = None) -> None:
        entry: dict[str, Any] = {"role": "user", "text": text}
        if images:
            self.add_images(images, turn=self.turns_used)
            entry["screenshots_attached"] = len(images)
        self.history.append(entry)

    def _decide(self, view: dict, turns_left: int, feedback: str | None = None):
        if self.images:
            return brain.decide_multi_turn(
                view, self.history, turns_left, feedback, images=self.images
            )
        return brain.decide_multi_turn(view, self.history, turns_left, feedback)

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
        decision = self._decide(view, turns_left)

        if turns_left > 0 and decision.next == "question" and decision.question:
            q = decision.question
            topics = list(dict.fromkeys(q.topics))[: checker.MAX_QUESTION_TOPICS]
            return self._ask({"type": "question", "text": q.text, "topics": topics})

        # The brain tends to answer straight after its question, without offering the account
        # check that would confirm or rule out the suspicion. Before a risky final answer,
        # ask it once whether one of the still-hidden fields would change the advice.
        hidden = self._hidden_fields()
        if (
            turns_left > 0
            and decision.next == "final"
            and decision.answer
            and decision.answer.risk_level not in ("none", "low")
            and hidden
            and not (self.granted or self.refused or self.consent_checked)
        ):
            self.consent_checked = True
            second = self._decide(view, turns_left, _consent_feedback(hidden))
            if second.next == "consent_request" and second.consent_request:
                decision = second

        if turns_left > 0 and decision.next == "consent_request" and decision.consent_request:
            req = decision.consent_request
            fields = [f for f in dict.fromkeys(req.fields) if f in self._hidden_fields()]
            if fields:
                return self._ask({"type": "consent_request", "fields": fields, "text": req.text})

        if decision.next == "final" and decision.answer:
            first = decision.answer

            def propose(feedback):
                if feedback is None:
                    return first
                again = self._decide(view, 0, feedback)
                return again.answer or first

            answer = _checked(propose, view, consent)
        else:
            # The brain asked for something it may not ask (no turns left, invalid fields).
            answer = _checked(
                lambda feedback: self._decide(view, 0, feedback).answer or fallback_answer(view),
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
        return {"type": "final", "answer": sub, "shown_steps": shown_steps(answer)}

    def _hidden_fields(self) -> list[str]:
        """Consent-gated fields the user has not been asked about and did not pre-allow."""
        consent = self.case["consent"]
        asked = self.granted | self.refused | set(consent["pre_granted"])
        return [f for f in consent["requires_consent"] if f not in asked]

    def _ask(self, turn: dict) -> dict:
        self.turns_used += 1
        self.history.append({"role": "assistant", **turn})
        return turn


__all__ = ["SENSITIVE_HIDDEN", "Conversation", "fallback_answer", "reveal_signals", "single_turn"]
