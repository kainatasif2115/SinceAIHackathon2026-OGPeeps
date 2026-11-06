"""Print the results template's five-journey table for a submission file.

Runs the organisers' evaluator once per journey (and once for all cases), so
every number comes from their scoring code.

    python3 backend/scripts/journey_table.py \
        --cases simset/data/dev/cases.jsonl --submission runs/dev_single.jsonl
"""

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
EVALUATE = REPO / "simset" / "eval" / "evaluate.py"
JOURNEYS = {
    "suspicious_message": "Suspicious message",
    "clicked_link": "Clicked link",
    "suspicious_call": "Suspicious call",
    "breach_notice": "Breach notice",
    "smb_incident": "Small-business incident",
}


def evaluate(cases: list[dict], subs: list[dict]) -> dict:
    with tempfile.TemporaryDirectory() as tmp:
        cases_path, subs_path = Path(tmp, "cases.jsonl"), Path(tmp, "subs.jsonl")
        cases_path.write_text("".join(json.dumps(c) + "\n" for c in cases), encoding="utf-8")
        subs_path.write_text("".join(json.dumps(s) + "\n" for s in subs), encoding="utf-8")
        out = subprocess.run(
            [
                sys.executable,
                str(EVALUATE),
                "--cases",
                str(cases_path),
                "--submission",
                str(subs_path),
                "--json",
                "--no-ci",
            ],
            capture_output=True,
            text=True,
            check=True,
        )
    return json.loads(out.stdout)


def fmt(value, suffix=" %") -> str:
    return "–" if value is None else f"{value:.1f}{suffix}"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cases", required=True, type=Path)
    ap.add_argument("--submission", required=True, type=Path)
    args = ap.parse_args()

    subs = [json.loads(line) for line in args.submission.open(encoding="utf-8") if line.strip()]
    answered = {s["case_id"] for s in subs}
    cases = [
        c for c in map(json.loads, args.cases.open(encoding="utf-8")) if c["case_id"] in answered
    ]

    print("| Journey | Cases | Safe-action pass | False alarms (benign) | Escalation recall |")
    print("|---|---|---|---|---|")
    groups = [(label, [c for c in cases if c["journey"] == j]) for j, label in JOURNEYS.items()]
    for label, group in [*groups, ("**All**", cases)]:
        if not group:
            continue
        ids = {c["case_id"] for c in group}
        head = evaluate(group, [s for s in subs if s["case_id"] in ids])["headline"]
        cells = [
            head["safe_action_pass_pct"],
            head["false_alarm_rate_on_benign_pct"],
            head["escalation_recall_pct"],
        ]
        print(f"| {label} | {len(group)} | " + " | ".join(fmt(c) for c in cells) + " |")


if __name__ == "__main__":
    main()
