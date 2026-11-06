"""Fixed vocabularies from the organisers' pack, plus our step example phrasings."""

import json
from functools import cache
from pathlib import Path

from assistant import simset

DATA_DIR = Path(__file__).resolve().parent / "data"

RISK_LEVELS = ("none", "low", "medium", "high", "critical")
URGENCIES = ("none", "routine", "today", "immediate")
LANGUAGES = ("fi", "en", "sv")


@cache
def actions() -> dict[str, dict]:
    return simset.load_reference("action_vocabulary.json")["actions"]


@cache
def escalation_targets() -> dict[str, str]:
    return simset.load_reference("action_vocabulary.json")["escalation_targets"]


@cache
def journeys() -> dict[str, dict]:
    return simset.load_reference("action_vocabulary.json")["journeys"]


@cache
def steps() -> dict[str, dict]:
    return simset.load_reference("step_vocabulary.json")["steps"]


@cache
def step_phrases() -> dict[str, dict]:
    return json.loads((DATA_DIR / "step_phrases.json").read_text("utf-8"))


@cache
def question_topics() -> dict[str, dict]:
    return simset.load_reference("question_topics.json")["topics"]


@cache
def unsafe_claims() -> dict[str, dict]:
    return simset.load_reference("unsafe_claims.json")["claims"]


@cache
def signals() -> dict[str, dict]:
    return simset.load_reference("signal_dictionary.json")["signals"]


@cache
def jargon() -> dict[str, list[str]]:
    return simset.load_reference("jargon.json")


@cache
def guidance() -> dict[str, dict]:
    return {g["id"]: g for g in simset.guidance_corpus()}


def guidance_title(guidance_id: str, language: str) -> str:
    g = guidance()[guidance_id]
    return g["title_fi"] if language == "fi" else g["title_en"]


def action_label(action_id: str, language: str) -> str:
    spec = actions()[action_id]
    return spec["fi"] if language == "fi" else spec["en"]


def default_escalation_target(action_id: str, audience: str) -> str:
    if audience == "small_business":
        return "business_security_support"
    if action_id == "contact_operator_support":
        return "operator_support_agent"
    return "security_specialist"
