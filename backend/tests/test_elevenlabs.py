import pytest
from django.test import Client

from api import voice
from assistant import brain, elevenlabs_llm
from assistant.models import FinalAnswer
from tests.fakes import Script, final


def test_reply_json_is_parsed_even_with_code_fences(monkeypatch):
    reply = "```json\n" + final().model_dump_json() + "\n```"
    monkeypatch.setattr(elevenlabs_llm, "_ask", Script(reply))

    answer = elevenlabs_llm.complete(FinalAnswer, "case")

    assert answer.primary_action == "do_not_interact_and_delete"


def test_invalid_json_is_retried_once_with_feedback(monkeypatch):
    script = Script("Sure! Here is my advice: do not click.", final().model_dump_json())
    monkeypatch.setattr(elevenlabs_llm, "_ask", script)

    answer = elevenlabs_llm.complete(FinalAnswer, "case")

    assert answer.risk_level == "medium"
    assert "not a valid FinalAnswer" in script.calls[1][0][0]


def test_two_invalid_replies_raise(monkeypatch):
    monkeypatch.setattr(elevenlabs_llm, "_ask", Script("nope", '{"risk_level": "weird"}'))

    with pytest.raises(elevenlabs_llm.ElevenLabsError):
        elevenlabs_llm.complete(FinalAnswer, "case")


def test_brain_uses_elevenlabs_when_its_key_is_set(monkeypatch):
    monkeypatch.delenv("BRAIN_PROVIDER", raising=False)
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test")
    monkeypatch.setattr(elevenlabs_llm, "complete", Script(final()))

    answer = brain.answer_single_turn({"case_id": "X", "language": "en"})

    assert brain.provider() == "elevenlabs"
    assert answer.primary_action == "do_not_interact_and_delete"


def test_elevenlabs_failure_becomes_brain_unavailable(monkeypatch):
    monkeypatch.setenv("BRAIN_PROVIDER", "elevenlabs")

    def broken(*args):
        raise elevenlabs_llm.ElevenLabsError("no credits")

    monkeypatch.setattr(elevenlabs_llm, "complete", broken)

    with pytest.raises(brain.BrainUnavailable, match="no credits"):
        brain.answer_single_turn({"case_id": "X", "language": "en"})


def test_speak_returns_audio(monkeypatch):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test")
    monkeypatch.setattr(voice, "speak", lambda text, language: b"ID3fake-mp3")

    response = Client().post(
        "/api/voice/speak", {"text": "Do not open the link.", "language": "en"}, "application/json"
    )

    assert response.status_code == 200
    assert response["Content-Type"] == "audio/mpeg"
    assert response.content == b"ID3fake-mp3"


def test_transcribe_returns_text(monkeypatch):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test")
    seen = {}

    def fake(audio, filename, language):
        seen.update(audio=audio, language=language)
        return "Sain tekstiviestin paketista."

    monkeypatch.setattr(voice, "transcribe", fake)
    from django.core.files.uploadedfile import SimpleUploadedFile

    response = Client().post(
        "/api/voice/transcribe",
        {"audio": SimpleUploadedFile("rec.webm", b"audio-bytes", "audio/webm"), "language": "fi"},
    )

    assert response.json() == {"text": "Sain tekstiviestin paketista."}
    assert seen == {"audio": b"audio-bytes", "language": "fi"}


def test_voice_without_key_is_503(monkeypatch):
    monkeypatch.delenv("ELEVENLABS_API_KEY", raising=False)

    response = Client().post("/api/voice/speak", {"text": "hello"}, "application/json")

    assert response.status_code == 503


def test_screenshots_go_to_elevenlabs_with_the_safety_note(monkeypatch):
    from tests.fakes import done

    monkeypatch.setenv("BRAIN_PROVIDER", "elevenlabs")
    script = Script(done(final()))
    monkeypatch.setattr(elevenlabs_llm, "complete", script)
    image = {"media_type": "image/png", "data": "aGk=", "turn": 0}

    brain.decide_multi_turn({"case_id": "X", "language": "fi"}, [], 3, images=[image])

    _, content, language, images = script.calls[0][0]
    assert "untrusted" in content and "Attached file 1" in content
    assert language == "fi"
    assert images == [image]


def test_screenshots_are_uploaded_and_sent_as_one_multimodal_message(monkeypatch):
    uploads = []

    class Files:
        def create(self, conversation_id, file):
            uploads.append((conversation_id, file))

            class Uploaded:
                file_id = f"file_{len(uploads)}"

            return Uploaded()

    class Client:
        class conversational_ai:  # noqa: N801
            class conversations:  # noqa: N801
                files = Files()

    monkeypatch.setattr(elevenlabs_llm, "client", lambda: Client)
    image = {"media_type": "image/png", "data": "aGk=", "turn": 0}

    ids = elevenlabs_llm._upload("conv_1", [image])
    message = elevenlabs_llm._message("What is this?", ids)

    assert uploads == [("conv_1", ("screenshot-1.png", b"hi", "image/png"))]
    assert message["type"] == "multimodal_message"
    assert message["text"] == {"type": "user_message", "text": "What is this?"}
    assert message["files"] == [{"type": "file_input", "file_id": "file_1"}]
    assert elevenlabs_llm._message("Hi", []) == {"type": "user_message", "text": "Hi"}
