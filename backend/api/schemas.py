"""Request and response shapes of the chat API (the contract with the frontend)."""

from typing import Literal

from ninja import Field, Schema

Audience = Literal["consumer", "small_business"]
Language = Literal["fi", "en", "sv"]
RiskLevel = Literal["none", "low", "medium", "high", "critical"]
Urgency = Literal["none", "routine", "today", "immediate"]


class ScenarioOut(Schema):
    id: str
    journey: str
    journey_label: str
    audience: Audience
    language: Language
    title: str
    opening_message: str


class StartIn(Schema):
    audience: Audience
    language: Language
    message: str = Field(min_length=1, max_length=2000)
    scenario_id: str | None = None


class ReplyIn(Schema):
    text: str = Field(min_length=1, max_length=2000)


class ConsentIn(Schema):
    granted: bool


class ConsentField(Schema):
    path: str
    label: str


class Citation(Schema):
    id: str
    title: str


class Answer(Schema):
    risk_level: RiskLevel
    urgency: Urgency
    primary_action: str
    action_label: str
    advice_text: str
    steps: list[str]
    escalation_required: bool
    escalation_target: str | None
    escalation_label: str | None
    citations: list[Citation]
    confidence: float


class QuestionTurn(Schema):
    type: Literal["question"] = "question"
    text: str
    topics: list[str]


class ConsentTurn(Schema):
    type: Literal["consent_request"] = "consent_request"
    text: str
    fields: list[ConsentField]


class FinalTurn(Schema):
    type: Literal["final"] = "final"
    answer: Answer


class SessionOut(Schema):
    session_id: str
    turn: QuestionTurn | ConsentTurn | FinalTurn
    turns_used: int
    max_turns: int


class HandoffOut(Schema):
    reference: str
    summary: str
