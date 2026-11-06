# Digital Security Assistant: What Should I Do Now?

Team OGPeeps · DNA × Since AI Hackathon 2026 (Turku, 6–8 Nov)

A prototype assistant that turns a consumer's or small business's description of a suspicious call, message, link or possible account compromise — plus any available risk signals — into one clear, proportionate next step. It explains why, asks only for what it needs, says when it is unsure, and hands off to a human when needed.

> Prototype only — not a live DNA security service. Uses synthetic data; no DNA production systems or real customer data.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Claude API (`@anthropic-ai/sdk`) for fact extraction and plain-language explanation
- Deterministic TypeScript rules engine for risk level, next action and escalation
- MongoDB (official `mongodb` driver) for conversations, consent records, test cases and eval results
- Zod for shared schemas (test cases, LLM output, rules output)
- `tsx` for the evaluation script

## Setup

Requires Node 20+.

```bash
npm install
cp .env.example .env.local   # then add ANTHROPIC_API_KEY and MONGODB_URI
npm run dev
```

`MONGODB_URI` can point at the team's shared MongoDB Atlas cluster or a local instance (`mongodb://localhost:27017`). The connection helper is `src/lib/mongodb.ts`: call `getDb()` from server code (route handlers, server actions, scripts) only.

Open http://localhost:3000.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | Lint |
