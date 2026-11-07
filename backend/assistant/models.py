"""Shapes of what Claude returns. Enums come from the organisers' vocabularies."""

from typing import Literal

from pydantic import BaseModel, Field, PrivateAttr

from assistant import vocab

ActionId = Literal[tuple(vocab.actions())]  # type: ignore[valid-type]
StepId = Literal[tuple(vocab.steps())]  # type: ignore[valid-type]
TopicId = Literal[tuple(vocab.question_topics())]  # type: ignore[valid-type]
TargetId = Literal[tuple(vocab.escalation_targets())]  # type: ignore[valid-type]
GuidanceId = Literal[tuple(vocab.guidance())]  # type: ignore[valid-type]
RiskLevel = Literal[vocab.RISK_LEVELS]  # type: ignore[valid-type]
Urgency = Literal[vocab.URGENCIES]  # type: ignore[valid-type]


class FinalAnswer(BaseModel):
    """One answer in the organisers' submission format (plus step_ids for our checker)."""

    risk_level: RiskLevel
    urgency: Urgency
    primary_action: ActionId
    secondary_actions: list[ActionId]
    escalation_required: bool
    escalation_target: TargetId | None
    advice_text: str = Field(description="Exactly what the user reads, in the user's language.")
    step_ids: list[StepId] = Field(description="Steps from the step menu, most important first.")
    steps: list[str] = Field(
        description="One short sentence per step id, same order, user's language."
    )
    questions_asked: list[str]
    question_topics: list[TopicId]
    signals_used: list[str]
    consent_requested_for: list[str]
    citations: list[GuidanceId]
    confidence: float = Field(description="0-1: how likely this answer is the right, safe one.")
    # Steps the checker added in the organisers' standard wording, because the matcher
    # didn't recognise the model's own wording for a step it chose. Kept in the scored
    # answer; the chat hides them, as the model already said the same in its own words.
    _added_steps: list[str] = PrivateAttr(default_factory=list)


class Question(BaseModel):
    text: str = Field(description="One short question about one thing, in the user's language.")
    topics: list[TopicId] = Field(description="The one (at most two) topics the question is about.")


class ConsentRequest(BaseModel):
    fields: list[str] = Field(
        description="Consent-gated signal paths you need, e.g. device.recent_app_installs."
    )
    text: str = Field(
        description="What you will look at and why, in the user's language. One or two sentences."
    )


class Decision(BaseModel):
    """Multi-turn: the next move in the conversation."""

    next: Literal["question", "consent_request", "final"]
    question: Question | None
    consent_request: ConsentRequest | None
    answer: FinalAnswer | None
