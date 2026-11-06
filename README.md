# Digital Security Assistant: What Should I Do Now?

Team OGPeeps · DNA × Since AI Hackathon 2026 (Turku, 6–8 Nov)

A prototype assistant that helps consumers and small businesses who have run into a suspicious call, message or link, or a possible account compromise. It gives them one clear, proportionate next step. It explains why, asks only for what it needs, says when it's unsure, and hands off to a human when needed.

> Prototype only, not a live DNA security service. Uses synthetic data; no DNA production systems or real customer data.

- Challenge summary and judging criteria: [`docs/challenge-brief.md`](docs/challenge-brief.md)
- Architecture and safety boundaries: [`docs/architecture.md`](docs/architecture.md)
- Decision log: [`docs/decisions.md`](docs/decisions.md)
- Test journeys and results: [`docs/journeys.md`](docs/journeys.md)
- Options explained in plain language: [`docs/options-for-the-team.html`](docs/options-for-the-team.html)
- How we work: [`CONTRIBUTING.md`](CONTRIBUTING.md)

## How it fits together

```
frontend/  Next.js chat page ──/api/*──▶  backend/  Django + Django Ninja API
                                                      │
                                                      ├─ assistant/  the brain (Claude) + safety checker
                                                      ├─ MongoDB     conversations, consent records
                                                      └─ simset/     organisers' data, vocabularies, dsakit
```

The Next.js app proxies `/api/*` to Django, so the browser only ever talks to one origin.

## Stack

| Part | Tools |
|---|---|
| Frontend | Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Python 3.12+, Django, Django Ninja (Pydantic) |
| AI | Claude API (`anthropic` Python SDK) |
| Database | MongoDB via `pymongo` (Django's internal tables use SQLite) |
| Evaluation | The organisers' SimSet v2.0.1 in [`simset/`](simset/START_HERE.md): data, simulated user, evaluator |

## Setup

Requires Python 3.12+ and Node 22+ (`nvm use`).

```bash
make setup
```

This creates `backend/.venv`, installs both apps' dependencies and creates `backend/.env` and `frontend/.env.local` from the examples. Then add your keys to `backend/.env`:

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key |
| `CLAUDE_MODEL` | Model ID (default `claude-opus-5-5`) |
| `MONGODB_URI` | MongoDB connection string: the team's Atlas cluster, or `mongodb://localhost:27017` |
| `MONGODB_DB` | Database name (default `security_assistant`) |
| `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS` | Django settings (defaults are fine locally) |

Run the two apps in separate terminals:

```bash
make backend
```

```bash
make frontend
```

Open http://localhost:3000. The page shows whether it can reach the backend. The API docs are at http://127.0.0.1:8000/api/docs.

## Commands

| Command | What it does |
|---|---|
| `make setup` | Install everything and create env files |
| `make backend` | Run the Django API on port 8000 |
| `make frontend` | Run the Next.js app on port 3000 |
| `make test` | Run backend tests |
| `make check` | Format check, lint and tests for both apps (same as CI) |
| `make baseline` | Score the organisers' rules baseline on the 588 dev cases |
| `make validate FILE=…` | Check a submission file before handing it in |

## Project structure

```
.github/              PR template and CI (backend + frontend jobs)
backend/
  config/             Django project settings and URLs
  api/                Django app: API endpoints (Ninja) and MongoDB helper
  assistant/          The brain and safety checker (plain Python, no Django)
  tests/              pytest tests
frontend/
  src/app/            Next.js pages
  src/components/ui/  shadcn/ui components
docs/                 Brief summary, architecture, decisions, journey results
simset/               Organisers' pack, unchanged (code MIT, data CC BY 4.0, © 2026 Since AI ry)
runs/                 Local evaluation output (git-ignored)
Makefile              Common commands
```

## Deliverables checklist

- [ ] `test_predictions.jsonl` at the repo root: answers for all 335 test inputs, validated with `make validate`
- [ ] Evaluator results on the dev cases (single-turn, and multi-turn if built)
- [ ] Filled-in results template ([`simset/templates/RESULTS_TEMPLATE.md`](simset/templates/RESULTS_TEMPLATE.md))
- [ ] Working demo or recorded walkthrough
- [ ] Architecture and safety boundaries ([`docs/architecture.md`](docs/architecture.md))
- [ ] Packaging hypothesis for DNA
