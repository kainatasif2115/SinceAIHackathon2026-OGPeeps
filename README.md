# Digital Security Assistant: What Should I Do Now?

Team OGPeeps · DNA × Since AI Hackathon 2026 (Turku, 6–8 Nov)

A prototype assistant that helps consumers and small businesses who have run into a suspicious call, message or link, or a possible account compromise. It gives them one clear, proportionate next step. It explains why, asks only for what it needs, says when it's unsure, and hands off to a human when needed.

> Prototype only, not a live DNA security service. Uses synthetic data; no DNA production systems or real customer data.

- Challenge summary and judging criteria: [`docs/challenge-brief.md`](docs/challenge-brief.md)
- Architecture and safety boundaries: [`docs/architecture.md`](docs/architecture.md) (to be decided)
- Decision log: [`docs/decisions.md`](docs/decisions.md)
- Test journeys and results: [`docs/journeys.md`](docs/journeys.md)
- How we work: [`CONTRIBUTING.md`](CONTRIBUTING.md)

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- MongoDB (official `mongodb` driver)
- Claude API (`@anthropic-ai/sdk`)
- Zod for validation
- `tsx` for scripts

## Setup

Requires Node 22+ (`nvm use`).

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:3000.

| Variable            | Purpose                                                                             |
| ------------------- | ----------------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY` | Claude API key                                                                      |
| `MONGODB_URI`       | MongoDB connection string: the team's Atlas cluster, or `mongodb://localhost:27017` |
| `MONGODB_DB`        | Database name (default `security_assistant`)                                        |

## Scripts

| Command             | What it does                                      |
| ------------------- | ------------------------------------------------- |
| `npm run dev`       | Start the dev server                              |
| `npm run build`     | Production build                                  |
| `npm run check`     | Format check, lint and typecheck (also run in CI) |
| `npm run format`    | Format all files with Prettier                    |
| `npm run lint`      | Lint                                              |
| `npm run typecheck` | TypeScript check                                  |

## Project structure

```
.github/            PR template and CI workflow
data/               Synthetic test data (no real personal data)
docs/               Brief summary, architecture, decisions, journey results
scripts/            Standalone scripts (evaluation, seeding), run with tsx
src/
  app/              Next.js routes, pages and API route handlers
  components/ui/    shadcn/ui components
  lib/              Shared server and client code
    mongodb.ts      MongoDB connection helper (server only)
public/             Static assets
```
