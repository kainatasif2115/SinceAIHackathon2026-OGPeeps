"""Evaluation results for the admin app's /results page.

Reads the organisers' evaluator output (simset/eval/evaluate.py, saved under
results/) so the page always shows exactly what the files say, and updates
when a run is redone. Numbers are never typed in by hand.
"""

import re
from pathlib import Path

RESULTS_DIR = Path(__file__).resolve().parents[2] / "results"

# The runs the page shows, in order. A missing file is simply left out.
RUNS = {
    "single": {
        "file": "dev_full_588_evaluator.txt",
        "label": "Single-turn, full dev set",
        "note": "Claude Sonnet 5.5 via ElevenLabs, one answer per case, before the "
        "deciding-question fix.",
    },
    "baseline": {
        "file": "baseline_dev_588_evaluator.txt",
        "label": "Organisers' rules baseline",
        "note": "The keyword-and-signal baseline shipped with SimSet, same 588 cases.",
    },
    "multi": {
        "file": "dev_multi_30_evaluator.txt",
        "label": "Multi-turn conversations",
        "note": "Talking to the organisers' simulated user, 6 conversations per journey.",
    },
    "twins_before": {
        "file": "dev_twins_108_before_evaluator.txt",
        "label": "'It depends' cases, before the fix",
        "note": "The 108 twin cases where the right step depends on one fact.",
    },
    "twins_after": {
        "file": "dev_twins_108_evaluator.txt",
        "label": "'It depends' cases, after the fix",
        "note": "Same 108 cases after the assistant learned to ask the deciding question.",
    },
}

_PCT = r"(n/a|[\d.]+)\s*%?"
_GROUPS = {
    "benign vs risky": "benign_vs_risky",
    "twins vs single": "twins_vs_single",
    "by language": "by_language",
    "by audience": "by_audience",
}


def _num(value: str) -> float | None:
    return None if value == "n/a" else float(value)


def _search(pattern: str, text: str) -> re.Match | None:
    return re.search(pattern, text, re.MULTILINE)


def parse(text: str) -> dict:
    """The evaluator's printout as numbers (percentages and 0-100 scores)."""
    out: dict = {}
    if m := _search(r"Cases scored:\s+(\d+)", text):
        out["cases"] = int(m.group(1))
    if m := _search(rf"Safe-action pass\s+{_PCT}(?:\s+95% CI ([\d.]+)-([\d.]+))?", text):
        out["safe_action_pass"] = _num(m.group(1))
        if m.group(2):
            out["safe_action_pass_ci"] = [float(m.group(2)), float(m.group(3))]
    for key, label in (
        ("unsafe_statements", "Unsafe statements"),
        ("false_alarms", "False alarms on benign"),
        ("escalation_recall", "Escalation recall"),
        ("asked_decisive", "Asked decisive question"),
    ):
        if m := _search(rf"{label}\s+{_PCT}", text):
            out[key] = _num(m.group(1))
    if m := _search(r"Escalation recall.*\(false positives: (\d+)\)", text):
        out["escalation_false_positives"] = int(m.group(1))

    scorecard = {}
    for key, label in (
        ("correctness", r"Correctness"),
        ("clarity", r"Clarity"),
        ("uncertainty", r"Uncertainty & esc\."),
        ("privacy", r"Privacy & consent"),
    ):
        if m := _search(rf"^\s+{label}\s+weight \d+ %\s+([\d.]+)", text):
            scorecard[key] = float(m.group(1))
    if m := _search(r"Weighted proxy .*?\s([\d.]+)\s+95% CI ([\d.]+)-([\d.]+)", text):
        scorecard["weighted"] = float(m.group(1))
        scorecard["weighted_ci"] = [float(m.group(2)), float(m.group(3))]
    out["scorecard"] = scorecard

    journeys = {}
    block = _search(r"Safe-action pass by journey:\n((?:\s+\w+\s+n=\d+\s+[\d.]+ %\n)+)", text)
    if block:
        for name, n, pct in re.findall(r"(\w+)\s+n=(\d+)\s+([\d.]+) %", block.group(1)):
            journeys[name] = {"n": int(n), "pass": float(pct)}
    out["by_journey"] = journeys

    for label, key in _GROUPS.items():
        if m := _search(rf"^\s+{label}: (.+)$", text):
            out[key] = {
                name: {"n": int(n), "pass": float(pct)}
                for name, pct, n in re.findall(r"(\w+) ([\d.]+) % \(n=(\d+)\)", m.group(1))
            }

    if m := _search(r"^\s+Failure types:(.*)$", text):
        out["failure_types"] = {
            name: int(count) for name, count in re.findall(r"(\w+) (\d+)", m.group(1))
        }
    return out


def load_all() -> dict:
    runs = {}
    for key, meta in RUNS.items():
        path = RESULTS_DIR / meta["file"]
        if path.exists():
            runs[key] = {**meta, "metrics": parse(path.read_text(encoding="utf-8"))}
    return {"runs": runs}
