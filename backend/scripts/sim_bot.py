"""Our assistant as a bot for the organisers' simulated user (JSON lines on stdin/stdout).

    python3 simset/sim/run_conversation.py --cases simset/data/dev/cases.jsonl \\
        --bot "backend/.venv/bin/python backend/scripts/sim_bot.py" --out runs/mt.jsonl --limit 10

See simset/sim/PROTOCOL.md.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from assistant import engine  # noqa: E402
from assistant.brain import BrainUnavailable  # noqa: E402


def handle(event: dict, state: dict) -> dict:
    kind = event["type"]
    if kind == "start":
        state["conv"] = engine.Conversation(
            case=event["case"], max_turns=event.get("max_assistant_turns", 6)
        )
        state["pending"] = None
    conv: engine.Conversation = state["conv"]
    if kind == "user_reply":
        conv.record_answer(event["text"])
    elif kind == "consent_reply":
        if event.get("granted"):
            conv.record_consent(event["granted"], True, event.get("signals"))
        if event.get("refused"):
            conv.record_consent(event["refused"], False)
    elif kind == "turn_limit":
        conv.max_turns = conv.turns_used

    try:
        turn = conv.next_turn()
    except BrainUnavailable as err:
        print(f"{conv.case['case_id']}: {err}", file=sys.stderr)
        answer = engine.to_submission(
            conv.case["case_id"], engine.fallback_answer(conv.case), "multi_turn"
        )
        return {"type": "final", "answer": answer}
    if turn["type"] == "final":
        return turn
    if turn["type"] == "question":
        return {"type": "question", "text": turn["text"], "topics": turn["topics"]}
    return {"type": "consent_request", "fields": turn["fields"], "text": turn["text"]}


def main() -> None:
    state: dict = {}
    for line in sys.stdin:
        if not line.strip():
            continue
        reply = handle(json.loads(line), state)
        sys.stdout.write(json.dumps(reply, ensure_ascii=False) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
