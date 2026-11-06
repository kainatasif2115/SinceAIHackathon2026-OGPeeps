# Digital Security Assistant: What Should I Do Now?

Team OGPeeps · DNA × Since AI Hackathon 2026 (Turku, 6–8 Nov)

A prototype assistant that helps consumers and small businesses who have run into a suspicious call, message or link, or a possible account compromise. It gives them one clear, proportionate next step. It explains why, asks only for what it needs, says when it's unsure, and hands off to a human when needed.

> Prototype only, not a live DNA security service. Uses synthetic data; no DNA production systems or real customer data.

- Challenge summary and judging criteria: [`docs/challenge-brief.md`](docs/challenge-brief.md)
- Architecture and safety boundaries: [`docs/architecture.md`](docs/architecture.md)
- Results (five journeys, false alarms, failures): [`docs/results.md`](docs/results.md)
- Design system: [`docs/design.md`](docs/design.md)
- Packaging hypothesis for DNA: [`docs/packaging.md`](docs/packaging.md)
- Decision log: [`docs/decisions.md`](docs/decisions.md)
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
| `MONGODB_URI` | MongoDB connection string: the team's Atlas cluster, or `mongodb://localhost:27017` after `make db`. Leave empty to keep chats in memory. |
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
| `make db` | Start a local MongoDB in Docker (`docker-compose.yml`) |
| `make backend` | Run the Django API on port 8000 |
| `make frontend` | Run the Next.js app on port 3000 |
| `make test` | Run backend tests |
| `make check` | Format check, lint and tests for both apps (same as CI) |
| `make baseline` | Score the organisers' rules baseline on the 588 dev cases |
| `make eval-sample N=60` | Answer and score N dev cases spread over the five journeys (uses Claude) |
| `make eval-dev` | Answer and score all 588 dev cases, single-turn (uses Claude) |
| `make eval-multi N=30` | Talk to the organisers' simulated user on N dev cases and score it (uses Claude) |
| `make predict-test` | Answer all 335 test inputs into `test_predictions.jsonl` and validate it (uses Claude) |
| `make validate FILE=…` | Check a submission file before handing it in |

Commands marked "uses Claude" need `ANTHROPIC_API_KEY` in `backend/.env` and cost money. As a rough guide, one answer costs a few cents. Runs are resumable: rerun the same command to fill in any cases that failed.

## Project structure

```
.github/              PR template and CI (backend + frontend jobs)
backend/
  config/             Django project settings and URLs
  api/                Django app: API endpoints (Ninja) and MongoDB helper
  assistant/          The brain (Claude), safety checker and conversation engine (plain Python)
  scripts/            predict.py (batch answers), sim_bot.py (simulated-user bot), journey_table.py
  tests/              pytest tests (Claude replaced by scripted fakes, so they run offline)
frontend/
  src/app/            Next.js pages
  src/components/ui/  shadcn/ui components
docs/                 Brief summary, architecture, results, design, packaging, decisions
.claude/skills/       Anti-AI-UI design rulebooks (MIT), used by AI coding tools in this repo
simset/               Organisers' pack, unchanged (code MIT, data CC BY 4.0, © 2026 Since AI ry)
runs/                 Local evaluation output (git-ignored)
Makefile              Common commands
```

## Deliverables checklist

- [ ] `test_predictions.jsonl` at the repo root: answers for all 335 test inputs. Blocked by the API usage limit; run `make predict-test` (it validates the file too).
- [x] Evaluator results on dev cases: a 60-case sample so far, in [`docs/results.md`](docs/results.md) and [`results/`](results/). The full run is `make eval-dev`; multi-turn is `make eval-multi`.
- [x] Results template filled in ([`docs/results.md`](docs/results.md)), with the human review and comprehension check still to do by the team
- [x] At least one failure and one escalation example ([`docs/results.md`](docs/results.md#5-failure-and-escalation-examples))
- [x] Architecture and safety boundaries ([`docs/architecture.md`](docs/architecture.md))
- [x] Packaging hypothesis for DNA ([`docs/packaging.md`](docs/packaging.md))
- [ ] Working demo or recorded walkthrough: the chat page is built; record the walkthrough once the API limit is raised
