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

## 2026-11-06: Use MongoDB for storage

**Decision:** MongoDB through the official `mongodb` Node driver, without Mongoose.
**Why:** The team asked for MongoDB. Zod already covers schemas, so Mongoose would duplicate them.
**Alternatives considered:** Mongoose, SQLite, in-memory only.

## 2026-11-06: Base stack

**Decision:** Next.js (App Router) + TypeScript, Tailwind CSS + shadcn/ui, Claude API, Zod, all in one repo.
**Why:** One language for frontend, API and scripts, and a fast path to a deployable demo.
**Alternatives considered:** A separate Python backend.
