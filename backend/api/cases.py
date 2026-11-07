"""Test cases with our answers, for the admin app's case browser.

Joins the organisers' dev cases (SimSet, CC BY 4.0) with a saved run of ours
and scores every case with their own scoring.score_case, so the pass/fail
shown is the official verdict, not ours.
"""

from functools import cache

from assistant import simset, vocab

from .results import RESULTS_DIR

RUNS = {
    "multi": {
        "file": "dev_multi_30_predictions.jsonl",
        "label": "Multi-turn conversations (30)",
    },
    "single": {
        "file": "dev_full_588_predictions.jsonl",
        "label": "Single-turn answers (588)",
    },
}


def _label(action: str | None) -> str | None:
    if not action:
        return None
    try:
        return vocab.action_label(action, "en")
    except KeyError:
        return action.replace("_", " ")


@cache
def _cases() -> dict[str, dict]:
    return {c["case_id"]: c for c in simset.load_jsonl(simset.DEV_CASES)}


@cache
def _run(run: str) -> list[dict]:
    """Every case in the run: the case, our submission and the official score."""
    path = RESULTS_DIR / RUNS[run]["file"]
    if not path.exists():
        return []
    # dsakit lives in simset/, which importing assistant.simset puts on sys.path.
    from dsakit import scoring

    interv = scoring._intervention()  # the evaluator's own action table
    cases = _cases()
    rows = []
    for sub in simset.load_jsonl(path):
        case = cases.get(sub.get("case_id"))
        if case:
            rows.append({"case": case, "sub": sub, "score": scoring.score_case(case, sub, interv)})
    return rows


def _excerpt(text: str, limit: int = 140) -> str:
    text = " ".join(text.split())
    return text if len(text) <= limit else text[: limit - 1].rsplit(" ", 1)[0] + "…"


def _failures(score: dict) -> list[str]:
    return list(dict.fromkeys(f["type"] for f in score.get("failures", [])))


def summaries(run: str) -> list[dict]:
    out = []
    for row in _run(run):
        case, sub, score = row["case"], row["sub"], row["score"]
        gt = case["ground_truth"]
        out.append(
            {
                "case_id": case["case_id"],
                "journey": case["journey"],
                "audience": case["audience"],
                "language": case["language"],
                "opening": _excerpt(case["opening_message"]),
                "passed": bool(score.get("passed")),
                "failures": _failures(score),
                "benign": gt["is_benign_control"],
                "twin": bool(gt.get("twin_group")),
                "our_risk": sub.get("risk_level"),
                "expected_risk": gt["risk_level"],
                "our_action": _label(sub.get("primary_action")),
            }
        )
    return out


def detail(run: str, case_id: str) -> dict | None:
    row = next((r for r in _run(run) if r["case"]["case_id"] == case_id), None)
    if not row:
        return None
    case, sub, score = row["case"], row["sub"], row["score"]
    gt = case["ground_truth"]

    # Multi-turn runs carry the whole conversation; a single-turn answer is
    # shown as the opening message followed by the one final answer.
    transcript = sub.get("transcript") or [
        {"role": "user", "type": "opening", "text": case["opening_message"]},
        {"role": "assistant", "type": "final", "text": sub.get("advice_text", "")},
    ]
    escalation = gt.get("escalation") or {}
    return {
        "case_id": case["case_id"],
        "journey": case["journey"],
        "audience": case["audience"],
        "language": case["language"],
        "mode": score.get("mode", "single_turn"),
        "passed": bool(score.get("passed")),
        "failures": score.get("failures", []),
        "transcript": [
            {
                "role": t.get("role"),
                "type": t.get("type"),
                "text": t.get("text") or "",
                "fields": t.get("fields") or [],
                # consent replies: which requested fields the user allowed / refused
                "granted": t.get("granted") if isinstance(t.get("granted"), list) else [],
                "refused": t.get("refused") or [],
            }
            for t in transcript
        ],
        "ours": {
            "risk_level": sub.get("risk_level"),
            "urgency": sub.get("urgency"),
            "action": _label(sub.get("primary_action")),
            "advice_text": sub.get("advice_text", ""),
            "steps": sub.get("steps") or [],
            "questions_asked": sub.get("questions_asked") or [],
            "escalation_required": bool(sub.get("escalation_required")),
            "escalation_target": sub.get("escalation_target"),
            "confidence": sub.get("confidence"),
        },
        "expected": {
            "risk_level": gt["risk_level"],
            "urgency": gt["urgency"],
            "action": _label(gt["primary_action"]),
            "also_acceptable": [_label(a) for a in gt.get("acceptable_actions") or []],
            "escalation_required": bool(escalation.get("required")),
            "escalation_target": escalation.get("target"),
            "must_ask_topics": gt.get("must_ask_topics") or [],
            "benign": gt["is_benign_control"],
            "rationale": gt.get("rationale_en") or "",
            "reference_answer": gt.get("reference_answer_en") or "",
        },
    }
