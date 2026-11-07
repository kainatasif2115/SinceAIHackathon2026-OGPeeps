"""Voice in and out through ElevenLabs: speech-to-text for the microphone,
text-to-speech for "read it aloud". The API key never leaves the backend."""

import os
from functools import cache

from assistant import elevenlabs_llm

STT_MODEL = "scribe_v2"
# ISO 639-1 codes are accepted by both models.
LANGUAGES = {"fi", "en", "sv"}


def is_configured() -> bool:
    """VOICE_ENABLED=false switches ElevenLabs voice off (no credits); the page then
    falls back to the browser's own speech."""
    enabled = os.environ.get("VOICE_ENABLED", "true").lower() != "false"
    return enabled and bool(os.environ.get("ELEVENLABS_API_KEY"))


def transcribe(audio: bytes, filename: str, language: str | None) -> str:
    result = elevenlabs_llm.client().speech_to_text.convert(
        model_id=STT_MODEL,
        file=(filename, audio),
        language_code=language if language in LANGUAGES else None,
    )
    return (getattr(result, "text", "") or "").strip()


def speak(text: str, language: str | None) -> bytes:
    chunks = elevenlabs_llm.client().text_to_speech.convert(
        voice_id=voice_id(),
        text=text,
        model_id=os.environ.get("ELEVENLABS_TTS_MODEL", "eleven_flash_v2_5"),
        language_code=language if language in LANGUAGES else None,
        output_format="mp3_44100_128",
    )
    return b"".join(chunks)


@cache
def voice_id() -> str:
    """ELEVENLABS_VOICE_ID if set, otherwise the first voice on the account."""
    configured = os.environ.get("ELEVENLABS_VOICE_ID")
    if configured:
        return configured
    voices = elevenlabs_llm.client().voices.search(page_size=1).voices
    if not voices:
        raise RuntimeError("No ElevenLabs voices available; set ELEVENLABS_VOICE_ID.")
    return voices[0].voice_id
