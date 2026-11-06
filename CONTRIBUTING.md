# Contributing

How the team works in this repo during the hackathon.

## Setup

See the [README](README.md#setup). Use Node 22 (`nvm use` reads `.nvmrc`).

## Branches

- `main` should always build and run. Don't push to it directly.
- Create a branch per piece of work:
  - `feat/<short-name>`: new functionality
  - `fix/<short-name>`: bug fixes
  - `docs/<short-name>`: documentation only
  - `chore/<short-name>`: tooling, config, dependencies
- Keep branches short-lived and merge small PRs often. Big branches on day 3 are painful.

## Pull requests

1. Before pushing, run `npm run check` (format check, lint, typecheck).
2. Open a PR into `main` and fill in the template.
3. CI must pass. Ask a teammate for a quick look when you can.
4. Squash-merge, then delete the branch.

## Commits

Write short, imperative messages, e.g. `Add consent prompt to intake form`.

## Code conventions

- TypeScript everywhere. Avoid `any`.
- Formatting is Prettier's job: run `npm run format`.
- Validate external input (API bodies, dataset files, LLM output) with Zod.
- Server-only code (database, Claude API keys) stays in route handlers, server actions or `src/lib`. Never import it into client components.
- UI components from shadcn/ui go in `src/components/ui`. Add more with `npx shadcn@latest add <component>`.

## Secrets and data

- Never commit `.env.local`, API keys or connection strings. Add new variables to `.env.example` without values.
- Never commit real personal data. Use only synthetic or public data (see [`data/README.md`](data/README.md)).

## Decisions

When the team decides something that's hard to change later (architecture, data stored, safety rules), add an entry to [`docs/decisions.md`](docs/decisions.md). The judges ask for documented decisions.
