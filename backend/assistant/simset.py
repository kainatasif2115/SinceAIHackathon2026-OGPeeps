"""Access to the organisers' simulation pack in `simset/`.

The pack's own `dsakit` library is imported as-is, so our safety checks use
exactly the same text heuristics as the organisers' evaluator.
"""

import json
import os
import sys
from functools import cache
from pathlib import Path

SIMSET_DIR = Path(os.environ.get("SIMSET_DIR", Path(__file__).resolve().parents[2] / "simset"))
REFERENCE_DIR = SIMSET_DIR / "data" / "reference"
DEV_CASES = SIMSET_DIR / "data" / "dev" / "cases.jsonl"
TEST_INPUTS = SIMSET_DIR / "data" / "test" / "inputs.jsonl"

if str(SIMSET_DIR) not in sys.path:
    sys.path.insert(0, str(SIMSET_DIR))

from dsakit import textcheck  # noqa: E402

__all__ = [
    "DEV_CASES",
    "TEST_INPUTS",
    "guidance_corpus",
    "load_jsonl",
    "load_reference",
    "textcheck",
    "version",
]


@cache
def version() -> str:
    return json.loads((SIMSET_DIR / "MANIFEST.json").read_text("utf-8"))["version"]


@cache
def load_reference(name: str) -> dict:
    """A JSON file from `data/reference/`, e.g. "action_vocabulary.json"."""
    return json.loads((REFERENCE_DIR / name).read_text("utf-8"))


def load_jsonl(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


@cache
def guidance_corpus() -> list[dict]:
    return load_jsonl(REFERENCE_DIR / "guidance_corpus.jsonl")
