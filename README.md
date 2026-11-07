# Digital Security Assistant: What Should I Do Now?

Team OGPeeps · DNA × Since AI Hackathon 2026 (Turku, 6–8 Nov)

A prototype assistant that helps consumers and small businesses who have run into a suspicious call, message or link, or a possible account compromise. It gives them one clear, proportionate next step. It explains why, asks only for what it needs, says when it's unsure, and hands off to a human when needed.

**Live demo:** https://ogpeeps-frontend-349509127423.europe-north1.run.app (Google Cloud Run, Finland; see [`docs/deploy.md`](docs/deploy.md)). The first request after a quiet period can take a few seconds while it starts.

> Prototype only, not a live DNA security service. Uses synthetic data; no DNA production systems or real customer data.

**What it does:**
- A DNA-style homepage (prototype) with the assistant in a slide-out chat panel. It's also available on its own at `/assistant`.
- Users describe what happened by typing, **speaking** (voice input in Finnish, Swedish or English), or attaching up to three **screenshots** of the message. Any answer can be **read aloud** with an ElevenLabs voice.
- The assistant asks at most a couple of questions, asks permission before looking at personal data, and gives one clear next step with steps, sources and a human handoff when needed.
- In Finnish, English or Swedish, for consumers and small businesses.

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

**Accounts are optional.** Anyone can check a message without signing up. Customers who create an account (`/signup`, `/login`) get an account page (`/account`) with their recent checks, the status of any handoff, and a "delete my account" button. Support staff sign in separately at `/agent`.

## Stack

| Part | Tools |
|---|---|
| Frontend | Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Python 3.12+, Django, Django Ninja (Pydantic) |
| AI | Claude Sonnet 5.5, run through an **ElevenLabs agent** (paid from ElevenLabs credits) or the Anthropic API directly |
| Voice | ElevenLabs speech-to-text (Scribe) and text-to-speech endpoints (`/api/voice/*`), in Finnish, English and Swedish |
| Database | MongoDB via `pymongo` (Django's internal tables use SQLite) |
| Evaluation | The organisers' SimSet v2.0.1 in [`simset/`](simset/START_HERE.md): data, simulated user, evaluator |

## Setup

Requires Python 3.12+ and Node 22+ (`nvm use`).

```bash
make setup
```

This creates `backend/.venv`, installs both apps' dependencies and creates `backend/.env` and `frontend/.env.local` from the examples.

**Connect the AI (ElevenLabs).**
1. Claim the free ElevenLabs Creator month from the hackathon: in the ElevenLabs Discord, go to #coupon-codes → Start Redemption → Since AI Hackathon, using your registration email.
2. In ElevenLabs, open Developers → API Keys → Create. Give it access to Text to Speech, Speech to Text, ElevenAgents (Write) and Voices (Read).
3. Put the key in `backend/.env` as `ELEVENLABS_API_KEY=...`.
4. Create the agent that runs the brain. This adds `ELEVENLABS_AGENT_ID` to `backend/.env`:

```bash
make agent
```

Rerun `make agent` whenever `backend/assistant/prompt.py` changes, so the agent gets the new prompt.

| Variable | Purpose |
|---|---|
| `ELEVENLABS_API_KEY` | ElevenLabs key: the AI brain and voice |
| `ELEVENLABS_AGENT_ID` | Set by `make agent` |
| `ELEVENLABS_LLM` | Model inside the agent (default `claude-sonnet-5-5`) |
| `ELEVENLABS_VOICE_ID`, `ELEVENLABS_TTS_MODEL` | Voice for "read aloud" (default: first voice on the account, `eleven_flash_v2_5`) |
| `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`, `BRAIN_PROVIDER` | Optional: call Claude directly instead (`BRAIN_PROVIDER=anthropic`) |
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
| `make agent` | Create or update the ElevenLabs agent that runs the brain |
| `make db` | Start a local MongoDB in Docker (`docker-compose.yml`) |
| `make backend` | Run the Django API on port 8000 |
| `make frontend` | Run the Next.js app on port 3000 |
| `make test` | Run backend tests |
| `make check` | Format check, lint and tests for both apps |
| `make baseline` | Score the organisers' rules baseline on the 588 dev cases |
| `make eval-sample N=60` | Answer and score N dev cases spread over the five journeys (uses Claude) |
| `make eval-dev` | Answer and score all 588 dev cases, single-turn (uses Claude) |
| `make eval-multi N=30` | Talk to the organisers' simulated user on N dev cases and score it (uses Claude) |
| `make predict-test` | Answer all 335 test inputs into `test_predictions.jsonl` and validate it (uses Claude) |
| `make validate FILE=…` | Check a submission file before handing it in |
| `make deploy GCP_PROJECT=…` | Build and deploy both apps to Google Cloud Run ([`docs/deploy.md`](docs/deploy.md)) |

Commands marked "uses AI credits" need the ElevenLabs setup above (or an Anthropic key) and use credits. As a rough guide, one answer costs a few cents' worth. Runs are resumable: rerun the same command to fill in any cases that failed.

## Project structure

```
.github/              PR template
backend/
  config/             Django project settings and URLs
  api/                Django app: API endpoints (Ninja) and MongoDB helper
  assistant/          The brain (Claude), safety checker and conversation engine (plain Python)
  scripts/            predict.py (batch answers), sim_bot.py (simulated-user bot), journey_table.py
  tests/              pytest tests (Claude replaced by scripted fakes, so they run offline)
frontend/
  src/app/                   Next.js pages: / (DNA-style homepage), /assistant (assistant only)
  src/components/site/       Homepage: header, hero, sections, chat panel
  src/components/assistant/  The assistant: chat, message box, voice input, screenshots, answer card
  src/components/ui/         shadcn/ui components
docs/                 Brief summary, architecture, results, design, packaging, decisions
.claude/skills/       Anti-AI-UI design rulebooks (MIT), used by AI coding tools in this repo
simset/               Organisers' pack, unchanged (code MIT, data CC BY 4.0, © 2026 Since AI ry)
runs/                 Local evaluation output (git-ignored)
Makefile              Common commands
```

## Deliverables checklist

- [x] `test_predictions.jsonl` at the repo root: answers for all 335 test inputs, validated OK (Claude Sonnet via ElevenLabs, regenerated 2026-11-07 with the deciding-question fix). To regenerate, delete the file first and run `make predict-test`; it resumes, so it skips cases already in the file.
- [x] Evaluator results on dev cases: the full 588 single-turn cases (82.5% safe-action pass vs the baseline's 60.5%) and 30 multi-turn conversations (90.0%). See [`docs/results.md`](docs/results.md) and [`results/`](results/).
- [x] Results template filled in ([`docs/results.md`](docs/results.md)), with the human review and comprehension check still to do by the team
- [x] At least one failure and one escalation example ([`docs/results.md`](docs/results.md#5-failure-and-escalation-examples))
- [x] Architecture and safety boundaries ([`docs/architecture.md`](docs/architecture.md))
- [x] Packaging hypothesis for DNA ([`docs/packaging.md`](docs/packaging.md))
- [ ] Working demo or recorded walkthrough: the chat page is built; record the walkthrough once the API limit is raised
