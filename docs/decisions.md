# Decision log

The brief asks for "documented decisions", so add an entry whenever the team settles something that's hard to change later. Put the newest entry at the top.

## Template

```md
## YYYY-MM-DD: Short title

**Decision:** What we chose.
**Why:** The reason, in one or two sentences.
**Alternatives considered:** What else we looked at and why we didn't pick it.
```

---

## 2026-11-06: A safe fallback answer when Claude is unavailable

**Decision:** If Claude errors, declines or returns unusable output, the chat gives a fixed safe answer: don't follow the message's instructions, check through an official channel, and a human handoff. The batch script instead leaves the case unanswered so it can be retried.
**Why:** In the chat a person must never be left without advice. In the batch run, a generic answer would hide a failure in the scores.
**Alternatives considered:** An error message, which leaves the user stuck. A rules-only fallback brain, which was too much to build for the time we had.

## 2026-11-06: Example step phrasings mined from the dev answers

**Decision:** For each of the 38 steps, extract short Finnish and English sentences from the dev reference answers that the evaluator's patterns recognise. Show them to Claude as examples, and use them as a fallback when a chosen step's wording isn't recognisable.
**Why:** The evaluator recognises steps with regular expressions, and only English has a canonical sentence. Unrecognised wording fails a case even when the advice is right.
**Alternatives considered:** Writing the patterns into the prompt (hard for the model to use), and translating the English sentences (they often don't match the Finnish patterns).

## 2026-11-06: The whole guidance corpus in the prompt, no vector search

**Decision:** Put all 55 guidance passages into the cached system prompt, and have Claude cite passage ids.
**Why:** 55 short passages fit easily, prompt caching makes them cheap, and Claude sees everything, so no retrieval step can miss the right passage.
**Alternatives considered:** Embeddings and a vector database (RAG), which are worth it only with hundreds of documents.

## 2026-11-06: Claude proposes, a deterministic checker enforces

**Decision:** Claude reads the case and proposes the answer. Code checks every answer before use: unsafe wording (the organisers' `dsakit` patterns, one rewrite, then removal), escalation consistency, consent-gated signal use, question limits, and recognisable steps.
**Why:** It combines the flexibility of a language model (three languages, unseen scenario families) with guarantees on rules that must always hold.
**Alternatives considered:** Rules only (the organisers' baseline, 60.5%), and the AI alone.

## 2026-11-06: Adopt the Anti-AI-UI design rulebooks

**Decision:** Add the Anti-AI-UI skills (MIT licence) to `.claude/skills/` and design the chat page by their rules: deep-teal brand colour, Lexend + Source Sans 3, no emoji icons, reduce-motion support. See `docs/design.md`.
**Why:** It gives the team one shared design standard, and AI coding tools follow it automatically.
**Alternatives considered:** shadcn defaults, which look like every other AI-built app.

## 2026-11-06: Include the organisers' SimSet in the repo unchanged

**Decision:** Copy SimSet v2.0.1 into `simset/` and never edit it.
**Why:** Everyone gets the same data and scoring with no setup, and our scores stay comparable with the organisers'. The licence allows it (code MIT, data CC BY 4.0).
**Alternatives considered:** Each person downloads it separately.

## 2026-11-06: Python backend with Django + Django Ninja

**Decision:** Move the brain to a Python backend (Django + Django Ninja). Next.js stays as the chat page in `frontend/`.
**Why:** All the organisers' tools are Python. Their `dsakit` text checks are exactly what the evaluator uses, so our safety checker can reuse them as-is. A TypeScript port risked mismatches, especially on Finnish text. We chose Django over FastAPI because the team prefers it. Speed is not a concern: Claude's response time dominates, and batch runs bypass the web server.
**Alternatives considered:** All TypeScript; FastAPI; all Python with Streamlit.

## 2026-11-06: Use MongoDB for storage

**Decision:** MongoDB through `pymongo` directly, not Django's ORM. Django's own tables use SQLite.
**Why:** The team asked for MongoDB. Django's ORM is built for SQL databases.
**Alternatives considered:** The MongoDB Django backend adapter, SQLite only, in-memory only.

## 2026-11-06: Base stack

**Decision:** Next.js (App Router) + TypeScript, Tailwind CSS + shadcn/ui, Claude API, all in one repo.
**Why:** A fast path to a polished demo. (The backend part was later moved to Python, see above.)
**Alternatives considered:** A separate Python backend.
