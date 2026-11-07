# Contributing

How the team works in this repo during the hackathon.

## Setup

See the [README](README.md#setup): `make setup`. Use Python 3.12+ and Node 22 (`nvm use` reads `.nvmrc`).

## Branches

- `main` should always build and run. Don't push to it directly.
- Create a branch per piece of work:
  - `feat/<short-name>`: new functionality
  - `fix/<short-name>`: bug fixes
  - `docs/<short-name>`: documentation only
  - `chore/<short-name>`: tooling, config, dependencies
- Keep branches short-lived and merge small PRs often. Big branches on day 3 are painful.

## Pull requests

1. Before pushing, run `make check` (format check, lint and tests for both apps).
2. Open a PR into `main` and fill in the template.
3. Ask a teammate for a quick look when you can.
4. Squash-merge, then delete the branch.

## Commits

Write short, imperative messages, e.g. `Add consent prompt to intake form`.

## Code conventions

**Backend (Python)**

- Formatting and linting are Ruff's job: `cd backend && .venv/bin/ruff format . && .venv/bin/ruff check --fix .`
- Use type hints. Validate API bodies and Claude output with Pydantic (Ninja schemas).
- Keep `assistant/` free of Django imports so the batch scripts and simulator bot can use it.
- Claude API keys and the database stay in the backend. The frontend never calls Claude or MongoDB directly.
- Don't edit `simset/`. It's the organisers' pack; keep it identical so our scores match theirs.

**Frontend (TypeScript)**

- Avoid `any`. Formatting is Prettier's job: `cd frontend && npm run format`.
- Call the backend through `/api/...` (proxied to Django by `next.config.ts`).
- UI components from shadcn/ui go in `src/components/ui`. Add more with `npx shadcn@latest add <component>`.

## Secrets and data

- Never commit `backend/.env`, `frontend/.env.local`, API keys or connection strings. Add new variables to the matching `.env.example` without values.
- Never commit real personal data. Use only the organisers' synthetic data in `simset/`, or synthetic cases we write ourselves.

## Decisions

When the team decides something that's hard to change later (architecture, data stored, safety rules), add an entry to [`docs/decisions.md`](docs/decisions.md). The judges ask for documented decisions.
