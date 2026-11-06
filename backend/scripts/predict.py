"""Answer cases in single-turn mode and write a submission file.

    .venv/bin/python scripts/predict.py --split dev --sample 60 --out ../runs/dev_sample.jsonl
    .venv/bin/python scripts/predict.py --split test --out ../test_predictions.jsonl

Resumable: case ids already in --out are skipped. With --split dev it also
writes the matching cases file (<out>.cases.jsonl) for the evaluator, so a
sample can be scored on its own.
"""

import argparse
import json
import random
import sys
import threading
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from assistant import engine, simset  # noqa: E402
from assistant.brain import BrainUnavailable  # noqa: E402


def stratified_sample(cases: list[dict], n: int, seed: int) -> list[dict]:
    """Roughly n cases, spread evenly over journeys."""
    by_journey = defaultdict(list)
    for c in cases:
        by_journey[c["journey"]].append(c)
    rng = random.Random(seed)
    per = max(1, n // len(by_journey))
    picked = [c for group in by_journey.values() for c in rng.sample(group, min(per, len(group)))]
    return sorted(picked, key=lambda c: c["case_id"])


def main() -> None:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--split", choices=["dev", "test"], required=True)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--sample", type=int, help="answer about this many cases, spread over journeys")
    ap.add_argument("--ids", help="comma-separated case ids to answer")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--workers", type=int, default=6)
    args = ap.parse_args()

    cases = simset.load_jsonl(simset.DEV_CASES if args.split == "dev" else simset.TEST_INPUTS)
    if args.ids:
        wanted = set(args.ids.split(","))
        cases = [c for c in cases if c["case_id"] in wanted]
    elif args.sample:
        cases = stratified_sample(cases, args.sample, args.seed)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    if args.split == "dev":
        cases_file = args.out.with_suffix(".cases.jsonl")
        with cases_file.open("w", encoding="utf-8") as f:
            f.writelines(json.dumps(c, ensure_ascii=False) + "\n" for c in cases)

    done = set()
    if args.out.exists():
        done = {
            json.loads(line)["case_id"] for line in args.out.open(encoding="utf-8") if line.strip()
        }
    todo = [c for c in cases if c["case_id"] not in done]
    print(f"{len(cases)} cases, {len(done)} already answered, {len(todo)} to go", file=sys.stderr)

    lock = threading.Lock()
    failed = []
    with args.out.open("a", encoding="utf-8") as out, ThreadPoolExecutor(args.workers) as pool:
        futures = {pool.submit(engine.single_turn, c): c["case_id"] for c in todo}
        for i, fut in enumerate(as_completed(futures), 1):
            case_id = futures[fut]
            try:
                sub = fut.result()
            except BrainUnavailable as err:
                failed.append(case_id)
                print(f"[{i}/{len(todo)}] {case_id} FAILED: {err}", file=sys.stderr)
                continue
            with lock:
                out.write(json.dumps(sub, ensure_ascii=False) + "\n")
                out.flush()
            print(
                f"[{i}/{len(todo)}] {case_id} {sub['primary_action']} ({sub['risk_level']})",
                file=sys.stderr,
            )

    if failed:
        print(f"{len(failed)} failed (rerun to retry): {','.join(failed)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
