"""Create or update the ElevenLabs agent that runs the assistant's brain.

    .venv/bin/python scripts/create_elevenlabs_agent.py      (or: make agent)

The agent gets our policy prompt (assistant/prompt.py), the JSON shapes it must
answer in, text-only mode and the model from ELEVENLABS_LLM (default Claude
Sonnet 5.5). Rerun after changing the prompt. On first run the new agent id is
added to backend/.env as ELEVENLABS_AGENT_ID.
"""

import json
import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from dotenv import load_dotenv  # noqa: E402

ENV_FILE = BACKEND / ".env"
load_dotenv(ENV_FILE)

from assistant import elevenlabs_llm  # noqa: E402
from assistant.models import Decision, FinalAnswer  # noqa: E402
from assistant.prompt import system_prompt  # noqa: E402

NAME = "DNA security assistant (brain)"

OUTPUT_RULES = """\

# Output format

You are called by a program, not a person. Every message ends by naming the JSON shape to reply with (FinalAnswer or Decision). Reply with exactly one JSON object of that shape and nothing else: no prose before or after, no code fences. Use null for absent optional values and [] for empty lists. The JSON Schemas:
"""


def agent_prompt() -> str:
    schemas = {
        "FinalAnswer": FinalAnswer.model_json_schema(),
        "Decision": Decision.model_json_schema(),
    }
    return system_prompt() + OUTPUT_RULES + json.dumps(schemas, ensure_ascii=False)


def conversation_config() -> dict:
    return {
        "agent": {
            "first_message": "",
            "language": "en",
            "prompt": {
                "prompt": agent_prompt(),
                "llm": os.environ.get("ELEVENLABS_LLM", "claude-sonnet-5-5"),
                "max_tokens": 4000,
                "ignore_default_personality": True,
                # By default ElevenLabs silently switches to a backup model (Gemini Flash)
                # when the first one is slow to start. We want every answer from the same
                # model; if it fails, our own safe fallback answer takes over.
                "backup_llm_config": {"preference": "disabled"},
                # ElevenLabs fails a turn if the model has not started replying in time;
                # medium effort stayed within that in testing; 15 s is the longest wait allowed.
                "reasoning_effort": os.environ.get("ELEVENLABS_REASONING_EFFORT", "medium"),
                "cascade_timeout_seconds": 15,
            },
        },
        "conversation": {"text_only": True},
    }


def platform_settings() -> dict:
    # ElevenLabs tells the model to answer in the agent's language, so each
    # conversation sets it to the user's language (fi/en/sv).
    return {"overrides": {"conversation_config_override": {"agent": {"language": True}}}}


def main() -> None:
    if not os.environ.get("ELEVENLABS_API_KEY"):
        sys.exit("ELEVENLABS_API_KEY is missing from backend/.env")
    agents = elevenlabs_llm.client().conversational_ai.agents
    existing = os.environ.get("ELEVENLABS_AGENT_ID")
    if existing:
        agents.update(
            agent_id=existing,
            name=NAME,
            conversation_config=conversation_config(),
            platform_settings=platform_settings(),
        )
        print(f"Updated agent {existing} ({len(agent_prompt()):,} prompt characters).")
        return
    agent = agents.create(
        name=NAME, conversation_config=conversation_config(), platform_settings=platform_settings()
    )
    with ENV_FILE.open("a", encoding="utf-8") as f:
        f.write(f"\nELEVENLABS_AGENT_ID={agent.agent_id}\n")
    print(f"Created agent {agent.agent_id} and saved ELEVENLABS_AGENT_ID to backend/.env.")


if __name__ == "__main__":
    main()
