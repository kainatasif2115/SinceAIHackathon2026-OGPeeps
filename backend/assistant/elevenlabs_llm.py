"""Runs the brain's model through an ElevenLabs agent in text-only chat mode.

The agent (created by scripts/create_elevenlabs_agent.py) holds the policy prompt,
the JSON shapes it must answer in, and the chosen model (Claude Sonnet by default).
Each call opens a fresh conversation, sends one message, and parses the agent's
reply as JSON. ElevenLabs bills the model's tokens to the account's credits.
"""

import base64
import json
import os
import re
import time
from functools import cache

from elevenlabs.client import ElevenLabs
from pydantic import BaseModel, ValidationError
from websockets.exceptions import WebSocketException
from websockets.sync.client import connect

REPLY_TIMEOUT_SECONDS = 120
LANGUAGES = {"fi", "en", "sv"}
# Matches the agent's file_input limit (scripts/create_elevenlabs_agent.py).
MAX_FILES = 6
_FENCE = re.compile(r"^```(?:json)?\s*|\s*```$")


class ElevenLabsError(Exception):
    pass


@cache
def client() -> ElevenLabs:
    return ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])


def agent_id() -> str:
    value = os.environ.get("ELEVENLABS_AGENT_ID")
    if not value:
        raise ElevenLabsError("ELEVENLABS_AGENT_ID is not set. Run `make agent` first.")
    return value


def complete(
    output_format: type[BaseModel],
    user_content: str,
    language: str = "en",
    images: list[dict] | None = None,
) -> BaseModel:
    """Ask the agent for one reply in `output_format`; retry once if the JSON is invalid.

    `language` (fi/en/sv) is the user's language: ElevenLabs tells the model to answer
    in the conversation's language, so it must match. `images` are screenshots
    ({media_type, data: base64}) uploaded to the conversation alongside the text.
    """
    request = f"{user_content}\n\nReply with only a {output_format.__name__} JSON object."
    images = (images or [])[-MAX_FILES:]
    reply = _ask(request, language, images)
    try:
        return _parse(output_format, reply)
    except ValueError as err:
        retry = (
            f"{request}\n\nYour previous reply was not a valid {output_format.__name__} "
            f"JSON object ({err}). Reply with only the JSON object."
        )
        try:
            return _parse(output_format, _ask(retry, language, images))
        except ValueError as err2:
            raise ElevenLabsError(f"Agent reply was not valid JSON twice: {err2}") from err2


def _parse(output_format: type[BaseModel], reply: str) -> BaseModel:
    text = _FENCE.sub("", reply.strip())
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("no JSON object in reply")
    try:
        return output_format.model_validate_json(text[start : end + 1])
    except ValidationError as err:
        raise ValueError(str(err).splitlines()[0]) from err


def _ask(text: str, language: str = "en", images: list[dict] | None = None) -> str:
    """Send one message; retry once in a new conversation if no reply came back
    (ElevenLabs closes the turn when the model is slow to start)."""
    try:
        return _ask_once(text, language, images or [])
    except ElevenLabsError as err:
        if "ELEVENLABS_AGENT_ID" in str(err):
            raise
        return _ask_once(text, language, images or [])


def _ask_once(text: str, language: str, images: list[dict]) -> str:
    """One text-only conversation: send a user message, return the agent's reply."""
    try:
        url = (
            client().conversational_ai.conversations.get_signed_url(agent_id=agent_id()).signed_url
        )
        with connect(url, max_size=16 * 1024 * 1024, open_timeout=20) as ws:
            override = {"agent": {"language": language if language in LANGUAGES else "en"}}
            ws.send(
                json.dumps(
                    {
                        "type": "conversation_initiation_client_data",
                        "conversation_config_override": override,
                    }
                )
            )
            sent = False
            deadline = time.monotonic() + REPLY_TIMEOUT_SECONDS
            while time.monotonic() < deadline:
                event = json.loads(ws.recv(timeout=max(1.0, deadline - time.monotonic())))
                kind = event.get("type")
                if kind == "ping":
                    ws.send(
                        json.dumps({"type": "pong", "event_id": event["ping_event"]["event_id"]})
                    )
                elif kind == "conversation_initiation_metadata" and not sent:
                    conversation_id = event["conversation_initiation_metadata_event"][
                        "conversation_id"
                    ]
                    ws.send(json.dumps(_message(text, _upload(conversation_id, images))))
                    sent = True
                elif kind == "agent_response" and sent:
                    return event["agent_response_event"]["agent_response"]
    except ElevenLabsError:
        raise
    except (WebSocketException, TimeoutError, OSError, KeyError) as err:
        raise ElevenLabsError(f"ElevenLabs conversation failed: {err!r}") from err
    except Exception as err:  # SDK HTTP errors (bad key, no credits, unknown agent)
        raise ElevenLabsError(f"ElevenLabs request failed: {err}") from err
    raise ElevenLabsError("ElevenLabs agent did not reply in time.")


def _upload(conversation_id: str, images: list[dict]) -> list[str]:
    """Attach screenshots to the conversation; returns their file ids."""
    files = client().conversational_ai.conversations.files
    ids = []
    for n, image in enumerate(images, start=1):
        extension = image["media_type"].split("/")[-1]
        upload = (
            f"screenshot-{n}.{extension}",
            base64.b64decode(image["data"]),
            image["media_type"],
        )
        ids.append(files.create(conversation_id=conversation_id, file=upload).file_id)
    return ids


def _message(text: str, file_ids: list[str]) -> dict:
    """A plain user message, or a multimodal one when screenshots are attached."""
    if not file_ids:
        return {"type": "user_message", "text": text}
    files = [{"type": "file_input", "file_id": file_id} for file_id in file_ids]
    return {
        "type": "multimodal_message",
        "text": {"type": "user_message", "text": text},
        "file": files[0],
        "files": files,
    }
