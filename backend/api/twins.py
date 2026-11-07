"""Twin pairs for the "Same message, different truth" explorer.

The organisers built 54 pairs of dev cases with the identical opening message,
where one fact only the customer knows (did they read out the code, has the
money gone) changes the right answer. Each pair is shown with the deciding
question, both customers' replies, and our answer and official verdict for
each branch, from the twin conversations run (or the single-turn run).
"""

from . import cases

RISK_ORDER = {"none": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}


def _first(transcript: list[dict], role: str, types: tuple[str, ...]) -> str | None:
    return next(
        (t.get("text") for t in transcript if t.get("role") == role and t.get("type") in types),
        None,
    )


def pairs(run: str) -> list[dict]:
    groups: dict[str, list[dict]] = {}
    for row in cases._run(run):
        group = row["case"]["ground_truth"].get("twin_group")
        if group:
            groups.setdefault(group, []).append(row)

    out = []
    for group, rows in sorted(groups.items()):
        if len(rows) < 2:
            continue
        rows.sort(key=lambda r: -RISK_ORDER.get(r["case"]["ground_truth"]["risk_level"], 0))
        first = rows[0]["case"]
        topics = list(
            dict.fromkeys(t for r in rows for t in r["case"]["ground_truth"]["must_ask_topics"])
        )
        branches = []
        for r in rows:
            case, sub, score = r["case"], r["sub"], r["score"]
            gt = case["ground_truth"]
            facts = (case.get("simulation") or {}).get("facts") or {}
            transcript = sub.get("transcript") or []
            branches.append(
                {
                    "case_id": case["case_id"],
                    "branch": gt.get("branch"),
                    "hidden_fact": next((facts[t] for t in topics if t in facts), None),
                    "question": _first(transcript, "assistant", ("question",))
                    or next(iter(sub.get("questions_asked") or []), None),
                    "reply": _first(transcript, "user", ("answer",)),
                    "expected": {
                        "risk_level": gt["risk_level"],
                        "action": cases._label(gt["primary_action"]),
                        "handoff": bool((gt.get("escalation") or {}).get("required")),
                    },
                    "ours": {
                        "risk_level": sub.get("risk_level"),
                        "action": cases._label(sub.get("primary_action")),
                        "handoff": bool(sub.get("escalation_required")),
                        "advice_text": sub.get("advice_text", ""),
                    },
                    "passed": bool(score.get("passed")),
                    "failures": cases._failures(score),
                }
            )
        out.append(
            {
                "group": group,
                "journey": first["journey"],
                "audience": first["audience"],
                "language": first["language"],
                "message": first["opening_message"],
                "deciding_topics": topics,
                "branches": branches,
            }
        )
    return out
