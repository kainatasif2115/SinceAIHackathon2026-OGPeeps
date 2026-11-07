"""Request and response shapes of the chat API (the contract with the frontend)."""

import base64
import binascii
from datetime import datetime
from typing import Literal

from ninja import Field, Schema
from pydantic import field_validator, model_validator

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


# Screenshots are resized in the browser (longest side 1568 px, JPEG), so a few hundred
# KB is typical. The cap keeps a whole conversation well inside a MongoDB document.
MAX_IMAGES_PER_MESSAGE = 3
MAX_IMAGE_BASE64_CHARS = 2_000_000  # about 1.5 MB decoded
ImageType = Literal["image/jpeg", "image/png", "image/webp", "image/gif"]


class ImageIn(Schema):
    media_type: ImageType
    data: str = Field(min_length=1, max_length=MAX_IMAGE_BASE64_CHARS)

    @field_validator("data")
    @classmethod
    def _is_base64(cls, value: str) -> str:
        try:
            base64.b64decode(value, validate=True)
        except binascii.Error as err:
            raise ValueError("Image data must be base64.") from err
        return value


class StartIn(Schema):
    audience: Audience
    language: Language
    message: str = Field(default="", max_length=2000)
    images: list[ImageIn] = Field(default_factory=list, max_length=MAX_IMAGES_PER_MESSAGE)
    scenario_id: str | None = None

    @model_validator(mode="after")
    def _has_content(self):
        if not self.message.strip() and not self.images:
            raise ValueError("Write a message or attach a screenshot.")
        return self


class ReplyIn(Schema):
    text: str = Field(default="", max_length=2000)
    images: list[ImageIn] = Field(default_factory=list, max_length=MAX_IMAGES_PER_MESSAGE)

    @model_validator(mode="after")
    def _has_content(self):
        if not self.text.strip() and not self.images:
            raise ValueError("Write an answer or attach a screenshot.")
        return self


class SpeakIn(Schema):
    text: str = Field(min_length=1, max_length=2500)
    language: Language | None = None


class TranscriptOut(Schema):
    text: str


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


class CampaignNote(Schema):
    """Shown once at least campaigns.MIN_REPORTS others asked about something similar."""

    others: int
    theme: str
    first_seen: datetime


class SessionOut(Schema):
    session_id: str
    turn: QuestionTurn | ConsentTurn | FinalTurn
    turns_used: int
    max_turns: int
    campaign: CampaignNote | None = None


class HandoffOut(Schema):
    reference: str
    summary: str


# --- Support-agent console -----------------------------------------------------------

TicketStatus = Literal["backlog", "in_progress", "blocked", "done"]
Severity = Literal["critical", "high", "medium", "low"]


class TranscriptLine(Schema):
    role: Literal["customer", "assistant"]
    text: str


class TicketConsent(Schema):
    allowed: list[str]
    declined: list[str]


class TicketAdvice(Schema):
    action_label: str
    advice_text: str
    steps: list[str]
    confidence: float


class TicketOut(Schema):
    reference: str
    status: TicketStatus
    severity: Severity
    urgency: Urgency
    team: str
    team_label: str
    audience: Audience
    language: Language
    title: str
    transcript: list[TranscriptLine]
    screenshots: int
    consent: TicketConsent
    advice: TicketAdvice | None
    summary: str
    demo: bool
    created_at: datetime
    updated_at: datetime


class TicketUpdateIn(Schema):
    status: TicketStatus


class AgentLoginIn(Schema):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=200)


class AgentOut(Schema):
    name: str


class RedTeamIn(Schema):
    message: str = Field(min_length=1, max_length=2000)
    language: Language = "en"
    audience: Audience = "consumer"
