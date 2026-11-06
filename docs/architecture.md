# Architecture and safety boundaries

> **Status: to be decided by the team.** Record each choice in [`decisions.md`](decisions.md) and summarise the result here. This page is a required deliverable.

## What is fixed so far

- **App:** Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui
- **Database:** MongoDB, through the official `mongodb` driver ([`src/lib/mongodb.ts`](../src/lib/mongodb.ts))
- **LLM provider:** Claude API (`@anthropic-ai/sdk`)
- **Validation:** Zod

## Open questions

- How the assistant is structured: a chat flow or a guided form, and how much of the decision is rules versus LLM.
- Whether to use retrieval over safety guidance (RAG), and if so, which sources and how they're stored.
- How risk signals (call warning, link risk, device status, account context) are combined.
- When the assistant asks a follow-up question, and when it hands off to a human.
- What is stored in MongoDB, for how long, and with what consent.
- How the five journeys are evaluated (see [`journeys.md`](journeys.md)).

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
