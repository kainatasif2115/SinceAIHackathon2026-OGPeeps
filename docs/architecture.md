# Architecture and safety boundaries

> **Status: setup done, assistant not built yet.** Record each choice in [`decisions.md`](decisions.md) and summarise the result here. This page is a required deliverable.

## Components

| Part | Where | Tools |
|---|---|---|
| Chat page (demo) | `frontend/` | Next.js, TypeScript, Tailwind, shadcn/ui. Proxies `/api/*` to Django. |
| API | `backend/api/` | Django + Django Ninja (Pydantic schemas) |
| Brain and safety checker | `backend/assistant/` | Plain Python, Claude API (`anthropic` SDK), the organisers' `dsakit` |
| Storage | MongoDB via `pymongo` | Conversations and consent records. Django's internal tables use SQLite. |
| Data and scoring | `simset/` | The organisers' SimSet v2.0.1: 588 dev cases, 335 test inputs, simulated user, evaluator |

## Planned design

One brain, used three ways:

1. **Brain.** Claude reads the case: the user's message, any forwarded message as untrusted data, the risk signals the user allowed, the 55 guidance passages and the official action, step and question-topic vocabularies. It proposes one of: ask one question, ask permission to use optional data, or give the final answer.
2. **Safety checker.** Code, not an LLM, runs on every proposed answer before the user sees it. It:
   - rejects answers with unsafe statements (the organisers' `unsafe_claims` patterns via `dsakit`);
   - forces a human handoff when the risk is critical;
   - makes sure consent-gated signals were only used with permission and reports them correctly;
   - checks the required steps are recognisable;
   - keeps questions to at most three topics.
3. **Uses of the brain:**
   - a batch run that writes `test_predictions.jsonl` (single-turn);
   - a bot for the organisers' simulated user (multi-turn);
   - the chat API behind the demo page.

## Open questions

- Which 5 journeys we show in the demo.
- What exactly is stored in MongoDB, for how long, and how we explain it to the user.
- Which model we use for practice runs vs final runs.

## Safety boundaries (to fill in)

| Boundary                                            | How we enforce it |
| --------------------------------------------------- | ----------------- |
| No harmful or unjustified advice                    |                   |
| No unjustified reassurance ("you're safe")          |                   |
| Declines to guess when evidence is missing          |                   |
| Hands off to a human when needed                    |                   |
| Uses optional data only with consent                |                   |
| No irreversible action without human approval       |                   |
| Shows the source or reason for each piece of advice |                   |

## Integration path (to fill in)

How this could plug into DNA's apps and portal, where the user is already identified.
