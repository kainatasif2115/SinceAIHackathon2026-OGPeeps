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
