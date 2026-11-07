# Architecture and safety boundaries

## In one paragraph

A **Python brain** (`backend/assistant/`) turns a user's situation into one next step. **Claude** reads:
- the user's words, with any forwarded message treated as untrusted;
- the operator-side signals the user allowed;
- the organisers' 55 guidance passages;
- the fixed lists of actions, steps and question topics.

It proposes one of three things: a question, a consent request or a final answer.

A deterministic **safety checker** then corrects or blocks the answer before anyone sees it. It uses the organisers' own `dsakit` text checks. The same brain serves three uses:
- a **batch script** that writes `test_predictions.jsonl`;
- a **bot** for the organisers' simulated user;
- a **Django + Ninja chat API** behind the **Next.js frontend**: a DNA-style homepage (prototype) with the assistant in a slide-out chat panel, plus the assistant on its own at `/assistant`.

Users can type, **speak** (voice input), attach up to three **screenshots**, and have any answer **read aloud** (ElevenLabs voice) of the message that worries them. Conversations, including screenshots, are stored in **MongoDB** and deleted automatically after 24 hours.

```
user ─▶ Next.js page ─/api─▶ Django + Ninja API ─▶ engine ─▶ brain ─▶ ElevenLabs agent ─▶ Claude Sonnet
 (text, voice,                      │                  │        (policy prompt, text + screenshots)
  screenshots)                      │                  │        └─▶ proposal: question | consent | final
                                    │                  └─▶ checker: dsakit text checks + hard rules ─▶ answer
                                    └─▶ MongoDB sessions (deleted after 24 h)

batch:  scripts/predict.py ─▶ engine.single_turn ─▶ test_predictions.jsonl ─▶ simset/eval/evaluate.py
sim:    simset/sim/run_conversation.py ⇄ scripts/sim_bot.py ─▶ engine.Conversation
```

## Components

| Part | Where | What it does |
|---|---|---|
| Homepage | `frontend/src/components/site/` | DNA-style operator homepage (prototype, clearly labelled): a hero with its own "What happened?" box and example scams, help topics, "how it works", current scams and a trust band. Every entry point opens the assistant in a slide-out chat panel. |
| Assistant | `frontend/src/components/assistant/`, also at `/assistant` | The chat: question bubbles, a permission card (Allow / Not now at equal weight), and an answer card (risk, action, steps, why, sources, "Talk to a person"). The message box is one card with a toolbar: screenshot, microphone, send. Has a mock mode for working without the backend. |
| Voice input | `frontend/src/components/assistant/use-speech-input.ts` | Speak instead of type, using the browser's speech recognition in Finnish, Swedish or English. The text lands in the message box to check before sending. The button is hidden where the browser doesn't support it. |
| Screenshots | `frontend/src/lib/media.ts`, `api/schemas.py` | Up to three per message, by picking, pasting or dropping. They're shrunk to at most 1568 px in the browser, which also strips EXIF data such as GPS location, then sent to the AI as untrusted evidence, like a forwarded message. |
| API | `backend/api/` | Django + Django Ninja. `POST /api/sessions`, `/reply`, `/consent`, `/handoff`, `GET /api/scenarios`, `/health`. Interactive docs at `/api/docs`. |
| Handoff tickets | `backend/api/tickets.py`, staff console at `/agent` | "Talk to a person" (or "anyway", when the advice didn't call for one) opens a ticket with the summary and only what the customer chose to share. Priority follows the assessed risk; the team follows the escalation target. Staff picking a ticket up assigns it and stamps the time. The customer's *Your checks* shows only their own ticket: place in line (same team, most urgent first, then oldest), the agent's name and the timeline, never another ticket's contents. Tickets are deleted with the chat after 24 hours. |
| Policy prompt | `backend/assistant/prompt.py` | How to decide (risk levels, benign look-alikes, decisive questions, escalation targets, consent, special cases) and how to write the answer. It also includes the organisers' vocabularies and all guidance passages. About 13k tokens, cached. |
| Brain | `backend/assistant/brain.py` | One model call per step. By default Claude Sonnet 5.5 runs through an ElevenLabs agent in text-only mode (`elevenlabs_llm.py`): the agent holds the policy prompt, and we parse its JSON reply with Pydantic, retrying once if it's invalid. Screenshots are uploaded to the conversation and sent as one multimodal message. Alternatively the Anthropic API with structured outputs. |
| Voice API | `backend/api/voice.py` | ElevenLabs text-to-speech (`POST /api/voice/speak`, JSON `{text, language}` → MP3) powers **"Read aloud"** under every assistant message and on the answer card, with the browser's own voice as a fallback. ElevenLabs speech-to-text (`POST /api/voice/transcribe`) is ready too; the microphone currently uses the browser's recognition. Both are tested in Finnish, and the key stays on the backend. |
| Checker | `backend/assistant/checker.py` | Deterministic rules applied to every answer (see below). |
| Engine | `backend/assistant/engine.py` | Single-turn answers and multi-turn conversations. Retries once if the answer contains unsafe wording. Gives a safe fallback answer if Claude is unavailable. |
| Step phrasings | `backend/scripts/build_step_phrases.py` → `assistant/data/step_phrases.json` | Short Finnish and English example sentences for each of the 38 steps, mined from the dev reference answers. They help the advice use wording the evaluator recognises. |
| Live risk signals | `backend/api/link_check.py`, `api/sessions.py` | For situations typed live (not the dataset's examples): any link in the message or a later reply gets a **simulated link-reputation check** in the dataset's format, marked `simulated_demo_check`. Official Finnish domains are clean; shorteners are unknown; brand look-alikes, lure words, risky endings, raw IPs and disguised characters are suspicious or malicious; anything else is unknown, never clean. The demo customer's account data behind the permission card is realistic but unremarkable: a paid invoice, logins from a known device, everyday apps. In production, DNA's real systems would supply these signals. |
| Storage | MongoDB via `pymongo` (`api/sessions.py`) | Session state with a 24-hour TTL index. Falls back to process memory when `MONGODB_URI` is not set. |
| Data and scoring | `simset/` | The organisers' SimSet v2.0.1, unchanged. |

## Why this design

- **AI plus checker, not either alone.** A rules-only approach (the organisers' baseline) reaches 60.5% and breaks on wording, three languages and unseen scenario families. An AI alone is flexible but can't guarantee the must-have rules. Claude does the understanding and writing; code enforces what has to be true every time.
- **No vector search.** The 55 guidance passages fit in the prompt and are cached. Claude sees all of them and cites passage ids, so there's no retrieval step that could pick the wrong passage.
- **Python backend.** We reuse the organisers' `dsakit` as-is. That means our checker flags exactly what their evaluator flags, including Finnish negation handling.

## Safety boundaries

| Boundary | How we enforce it |
|---|---|
| No harmful instructions | The prompt lists the organisers' 23 unsafe statements as "never say" (pay the fee, share the code, install the app, wait and see, …). The checker runs `dsakit.find_unsafe` on every answer. If anything is found, Claude rewrites once with feedback. If it's still there, the offending sentences are removed. Covered by tests. |
| No unjustified reassurance | `no_action_needed` is allowed only with evidence (the prompt lists what counts). The checker forces risk to none or low and no handoff for that action. Phrases like "you're safe" are on the unsafe list. |
| Declines to guess | When the right step depends on a fact only the user knows, the assistant asks that one question. In multi-turn it asks before deciding. In single-turn it asks while giving the step that is safe if the riskier answer is true. Each answer also carries a confidence value. |
| Hands off to a human when needed | Escalation targets: operator support, security specialist, trained advisor, business security support. The checker adds a target when a handoff is set. The handoff endpoint creates a reference and a summary for the human agent. If Claude is unavailable, the fallback answer always hands off. |
| Uses optional data only with consent | Consent-gated signals are hidden (shown as `available_with_consent`, using the organisers' own `visible_case`) until the user taps Allow. The checker removes any gated signal the user didn't grant from `signals_used`. Single-turn answers report consent only for data actually used, never as a blanket request. |
| No irreversible action without human approval | The assistant only gives advice. It can't block cards, move numbers or change accounts. Those actions go to a human through the handoff. |
| Shows the source or reason | Every answer cites guidance passage ids, shown as titles on the answer card. The advice explains why in plain words. The sources are labelled as the organisers' synthetic guidance, not official advice. |
| Untrusted content | Forwarded messages, screenshots and user replies are marked as data in the prompt. Text addressed to AI assistants inside a scam message or screenshot is treated as a red flag, never as an instruction. If a screenshot shows a password, card number or one-time code, the assistant must not repeat it. |
| Data minimisation | MongoDB keeps a session, including any screenshots, for 24 hours (TTL index), then deletes it. Screenshots are shrunk and stripped of EXIF location data in the browser before upload. Nothing is used for training. The handoff summary contains only what the user wrote and chose in the chat. |

## Integration path (how this would plug into DNA)

- The user is already identified in DNA's app or business portal, so the API would sit behind DNA's existing authentication. The `case` the brain reads is built from DNA's own systems instead of the simulated signals:
  - the forwarded message or call warning;
  - link reputation;
  - subscription events;
  - device findings from the security app;
  - account logins.
- Consent maps to DNA's existing privacy settings (`pre_granted`), plus the in-chat Allow / Not now for anything else.
- The handoff endpoint would open a ticket or a live chat in DNA's customer-service tool, with the summary attached. Our `/agent` console and ticket store stand in for that tool; status, assignee and timestamps are the fields a real integration would sync back.
- The model runs through ElevenLabs (or the Anthropic API). Model and provider are environment settings (`ELEVENLABS_LLM`, `BRAIN_PROVIDER`). Voice works the same way inside DNA's app, and could later extend to phone calls.
