"""Scripted stand-ins for Claude, so tests run offline and free."""

from assistant.models import ConsentRequest, Decision, FinalAnswer, Question


def final(**overrides) -> FinalAnswer:
    fields = {
        "risk_level": "medium",
        "urgency": "routine",
        "primary_action": "do_not_interact_and_delete",
        "secondary_actions": [],
        "escalation_required": False,
        "escalation_target": None,
        "advice_text": "Do not open the link. The message asks for a small fee, which is a common "
        "trick. Track the parcel in the delivery company's own app instead.",
        "step_ids": ["dont_open_link"],
        "steps": ["Do not open the link."],
        "questions_asked": [],
        "question_topics": [],
        "signals_used": ["artifact", "link_check"],
        "consent_requested_for": [],
        "citations": ["guidance_parcel_scam"],
        "confidence": 0.8,
    }
    fields.update(overrides)
    return FinalAnswer(**fields)


def ask(text: str, topics: list[str]) -> Decision:
    return Decision(
        next="question",
        question=Question(text=text, topics=topics),
        consent_request=None,
        answer=None,
    )


def ask_consent(fields: list[str], text: str = "May I look at this?") -> Decision:
    return Decision(
        next="consent_request",
        question=None,
        consent_request=ConsentRequest(fields=fields, text=text),
        answer=None,
    )


def done(answer: FinalAnswer) -> Decision:
    return Decision(next="final", question=None, consent_request=None, answer=answer)


class Script:
    """Returns the queued replies in order and records what it was called with."""

    def __init__(self, *replies):
        self.replies = list(replies)
        self.calls = []

    def __call__(self, *args, **kwargs):
        self.calls.append((args, kwargs))
        return self.replies.pop(0)
