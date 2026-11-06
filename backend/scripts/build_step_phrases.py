"""Build example phrasings for each step vocabulary entry, per language.

The evaluator recognises steps with regular expressions. Only English has a
canonical sentence per step, so we mine the dev reference answers for short
sentences that match exactly one step, in Finnish and English. The brain shows
these to Claude as examples, and the checker uses them as a fallback.

    .venv/bin/python scripts/build_step_phrases.py
"""

import json
import re
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from assistant import simset  # noqa: E402

OUT = Path(__file__).resolve().parents[1] / "assistant" / "data" / "step_phrases.json"
MAX_WORDS = 18


def main() -> None:
    tc = simset.textcheck
    steps = simset.load_reference("step_vocabulary.json")["steps"]
    candidates: dict[str, dict[str, Counter]] = {
        s: {"fi": Counter(), "en": Counter()} for s in steps
    }
    shared: dict[str, dict[str, Counter]] = {s: {"fi": Counter(), "en": Counter()} for s in steps}

    for case in simset.load_jsonl(simset.DEV_CASES):
        gt = case["ground_truth"]
        for lang in ("fi", "en"):
            for sentence in tc.sentences(gt[f"reference_answer_{lang}"]):
                sentence = sentence.strip()
                found = tc.find_steps(sentence)
                words = len(tc.words(sentence))
                # Short and free of case-specific numbers or brands.
                if not found or words > MAX_WORDS or re.search(r"\d|[A-Z]\w+[A-Z]", sentence[1:]):
                    continue
                pool = candidates if len(found) == 1 else shared
                for step_id in found:
                    pool[step_id][lang][sentence] += 1

    phrases = {}
    for step_id, spec in steps.items():
        phrases[step_id] = {"en_canonical": spec["en"]}
        for lang in ("fi", "en"):
            best = [s for s, _ in candidates[step_id][lang].most_common(3)]
            if not best:  # fall back to the shortest sentences that also mention other steps
                best = sorted(shared[step_id][lang], key=len)[:2]
            phrases[step_id][lang] = best
    OUT.write_text(json.dumps(phrases, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    missing = {lang: [s for s in phrases if not phrases[s][lang]] for lang in ("fi", "en")}
    print(f"wrote {OUT.name}: {len(phrases)} steps; missing fi={missing['fi']} en={missing['en']}")


if __name__ == "__main__":
    main()
