import logging
import os
import secrets

from django.http import HttpResponse
from ninja import File, Form, NinjaAPI, Schema
from ninja.errors import HttpError
from ninja.files import UploadedFile

from api import db, presenter, sessions, voice
from api.schemas import (
    ConsentIn,
    HandoffOut,
    ReplyIn,
    ScenarioOut,
    SessionOut,
    SpeakIn,
    StartIn,
    TranscriptOut,
)
from assistant import brain, engine, simset
from assistant.brain import BrainUnavailable
from assistant.engine import Conversation

log = logging.getLogger(__name__)

# What the user "said" when they sent only a screenshot.
SCREENSHOT_ONLY = {
    "fi": "(Lähetin vain kuvakaappauksen.)",
    "sv": "(Jag skickade bara en skärmbild.)",
    "en": "(I sent only a screenshot.)",
}

# No cookie-based auth, so Ninja does not apply CSRF checks. In production the operator's
# app would authenticate the already-identified user here.
api = NinjaAPI(title="DNA Digital Security Assistant", version="0.2.0")


class Health(Schema):
    status: str
    simset_version: str
    guidance_passages: int
    claude_configured: bool
    brain_provider: str
    voice_configured: bool
    mongodb_configured: bool


@api.get("/health", response=Health)
def health(request):
    return {
        "status": "ok",
        "simset_version": simset.version(),
        "guidance_passages": len(simset.guidance_corpus()),
        # Whether the brain's model is reachable (directly or through ElevenLabs).
        "claude_configured": _brain_configured(),
        "brain_provider": brain.provider(),
        "voice_configured": voice.is_configured(),
        "mongodb_configured": db.is_configured(),
    }


def _brain_configured() -> bool:
    if brain.provider() == "elevenlabs":
        return bool(os.environ.get("ELEVENLABS_API_KEY") and os.environ.get("ELEVENLABS_AGENT_ID"))
    return bool(os.environ.get("ANTHROPIC_API_KEY"))


@api.get("/scenarios", response=list[ScenarioOut])
def list_scenarios(request):
    return [sessions.scenario_summary(c) for c in sessions.scenarios().values()]


@api.post("/sessions", response=SessionOut)
def start_session(request, body: StartIn):
    message = body.message.strip() or SCREENSHOT_ONLY[body.language]
    case = sessions.build_case(body.audience, body.language, message, body.scenario_id)
    conv = Conversation(case=case)
    conv.add_images([image.model_dump() for image in body.images], turn=0)
    session_id = sessions.new_id()
    return _advance(session_id, conv, {"scenario_id": body.scenario_id})


@api.post("/sessions/{session_id}/reply", response=SessionOut)
def reply(request, session_id: str, body: ReplyIn):
    conv, doc = _load(session_id)
    _require_pending(doc, "question")
    sessions.add_link_check(conv.case, body.text)
    text = body.text.strip() or SCREENSHOT_ONLY[conv.case["language"]]
    conv.record_answer(text, [image.model_dump() for image in body.images])
    return _advance(session_id, conv, doc)


@api.post("/sessions/{session_id}/consent", response=SessionOut)
def consent(request, session_id: str, body: ConsentIn):
    conv, doc = _load(session_id)
    pending = _require_pending(doc, "consent_request")
    conv.record_consent(pending["fields"], body.granted)
    return _advance(session_id, conv, doc)


@api.post("/sessions/{session_id}/handoff", response=HandoffOut)
def handoff(request, session_id: str):
    conv, doc = _load(session_id)
    final = doc.get("final")
    reference = doc.get("handoff_reference") or f"DSA-{secrets.token_hex(3).upper()}"
    sessions.save(session_id, conv, {**_extra(doc), "handoff_reference": reference})
    return {"reference": reference, "summary": presenter.handoff_summary(conv, final)}


MAX_AUDIO_BYTES = 10 * 1024 * 1024


@api.post("/voice/transcribe", response=TranscriptOut)
def transcribe(request, audio: File[UploadedFile], language: Form[str] = ""):
    """Microphone recording -> text, so people can speak instead of type."""
    if not voice.is_configured():
        raise HttpError(503, "Voice input is not available right now.")
    if audio.size > MAX_AUDIO_BYTES:
        raise HttpError(413, "Recording is too long.")
    try:
        text = voice.transcribe(audio.read(), audio.name or "recording.webm", language or None)
    except Exception as err:
        log.warning("Transcription failed: %s", err)
        raise HttpError(503, "Voice input is not available right now.") from err
    return {"text": text}


@api.post("/voice/speak")
def speak(request, body: SpeakIn):
    """Text -> speech (MP3), for "read it aloud"."""
    if not voice.is_configured():
        raise HttpError(503, "Reading aloud is not available right now.")
    try:
        audio = voice.speak(body.text, body.language)
    except Exception as err:
        log.warning("Text to speech failed: %s", err)
        raise HttpError(503, "Reading aloud is not available right now.") from err
    return HttpResponse(audio, content_type="audio/mpeg")


def _load(session_id: str) -> tuple[Conversation, dict]:
    loaded = sessions.load(session_id)
    if not loaded:
        raise HttpError(404, "Conversation not found or expired.")
    return loaded


def _require_pending(doc: dict, kind: str) -> dict:
    pending = doc.get("pending")
    if not pending or pending["type"] != kind:
        raise HttpError(409, f"The assistant is not waiting for a {kind.replace('_', ' ')}.")
    return pending


def _extra(doc: dict) -> dict:
    keep = ("scenario_id", "pending", "final", "handoff_reference")
    return {k: doc[k] for k in keep if k in doc}


def _advance(session_id: str, conv: Conversation, doc: dict) -> dict:
    try:
        raw = conv.next_turn()
    except BrainUnavailable as err:
        # The assistant must never leave someone without advice: give the safe generic
        # answer with a human handoff, and log why.
        log.warning("Brain unavailable for session %s: %s", session_id, err)
        answer = engine.fallback_answer(conv.case)
        raw = {
            "type": "final",
            "answer": engine.to_submission(conv.case["case_id"], answer, "multi_turn"),
        }

    extra = _extra(doc)
    if raw["type"] == "final":
        extra.update(pending=None, final=raw["answer"])
    else:
        extra.update(pending=raw)
    sessions.save(session_id, conv, extra)
    return {
        "session_id": session_id,
        "turn": presenter.turn(raw, conv.case["language"]),
        "turns_used": conv.turns_used,
        "max_turns": conv.max_turns,
    }
