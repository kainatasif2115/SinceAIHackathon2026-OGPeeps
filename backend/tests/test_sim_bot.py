import importlib.util
from pathlib import Path

from dsakit.simulator import UserSimulator, visible_case

from assistant import brain, simset
from tests.fakes import ask, done, final

spec = importlib.util.spec_from_file_location(
    "sim_bot", Path(__file__).resolve().parents[1] / "scripts" / "sim_bot.py"
)
sim_bot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sim_bot)


def test_bot_talks_to_the_organisers_simulated_user(monkeypatch):
    case = next(
        c
        for c in simset.load_jsonl(simset.DEV_CASES)
        if c["ground_truth"]["must_ask_topics"] == ["code_shared"] and c["language"] == "en"
    )
    replies = iter(
        [
            ask("Did you read the code out to the caller?", ["code_shared"]),
            done(final(primary_action="contact_operator_support", escalation_required=True)),
        ]
    )
    monkeypatch.setattr(brain, "decide_multi_turn", lambda *a, **k: next(replies))
    user = UserSimulator(case)
    state: dict = {}

    first = sim_bot.handle(
        {"type": "start", "case": visible_case(case), "max_assistant_turns": 6}, state
    )
    assert first["type"] == "question"
    reply_text = user.answer(first["text"], first["topics"])
    second = sim_bot.handle({"type": "user_reply", "text": reply_text}, state)

    assert "code_shared" in user.revealed
    assert second["type"] == "final"
    answer = second["answer"]
    assert answer["mode"] == "multi_turn"
    assert answer["question_topics"] == ["code_shared"]
    assert answer["escalation_target"] == "operator_support_agent"
