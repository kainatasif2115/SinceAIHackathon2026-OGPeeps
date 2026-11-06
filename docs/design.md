# Design system: Security assistant

The frontend (`frontend/`) is a single-page, phone-first assistant that sits inside an operator's
app. It should feel like a bank or health app: calm, plain and trustworthy. It should not look like
a hacker tool or a marketing page. This document records the choices and why we made them. The
rules come from `.claude/skills/anti-ai-slop` and `.claude/skills/component-reference-design`.

Tokens live in `frontend/src/app/globals.css`, fonts in `frontend/src/app/layout.tsx`, components
in `frontend/src/components/assistant/`.

## Colour

One brand hue (deep teal, OKLCH hue 195), warm neutral greys (hue 70–85, very low chroma), and a
separate set of risk colours. We use a 60-30-10 split: warm off-white or near-black background
(60), card and muted surfaces (30), teal for primary actions, selection and focus (10). There are
no gradients, no glow and no glass effects. Dark mode follows `prefers-color-scheme`.

| Token                    | Light                           | Dark                            | Use                            |
| ------------------------ | ------------------------------- | ------------------------------- | ------------------------------ |
| `--background`           | `oklch(0.982 0.004 85)` #faf9f6 | `oklch(0.185 0.008 70)` #15120f | Page                           |
| `--card`                 | `oklch(0.998 0.002 85)` #fffefd | `oklch(0.225 0.009 70)` #1f1b17 | Cards, header                  |
| `--foreground`           | `oklch(0.24 0.012 70)` #231e19  | `oklch(0.945 0.006 85)` #efece8 | Body text                      |
| `--muted-foreground`     | `oklch(0.47 0.013 70)` #605a53  | `oklch(0.74 0.012 80)` #afaaa3  | Secondary text                 |
| `--primary` (brand teal) | `oklch(0.45 0.08 195)` #006363  | `oklch(0.76 0.085 195)` #6ac2c2 | Primary button, selected, ring |
| `--accent`               | `oklch(0.95 0.022 195)` #dff3f3 | `oklch(0.28 0.035 195)` #112e2e | Permission card, handoff panel |
| `--border`               | #dddad5                         | #393530                         | Dividers (decorative)          |
| `--input`                | #8a857e                         | #6d6861                         | Text field outline             |

### Contrast (WCAG 2.x, computed from the OKLCH values)

| Pair                              | Light  | Dark   |
| --------------------------------- | ------ | ------ |
| foreground on background          | 15.6:1 | 15.9:1 |
| muted-foreground on background    | 6.5:1  | 8.1:1  |
| muted-foreground on muted         | 6.0:1  | 6.5:1  |
| primary-foreground on primary     | 6.8:1  | 8.7:1  |
| primary (links, icons) on card    | 7.1:1  | 8.3:1  |
| accent-foreground on accent       | 9.1:1  | 9.6:1  |
| input outline on card (UI, ≥ 3:1) | 3.6:1  | 3.1:1  |

All body text pairs pass AA (4.5:1); most pass AAA. The focus ring is a solid 2px teal outline with
a 2px offset (≥ 3:1 in both themes).

## Risk levels

Colour is never the only signal. Every level has its own icon and a written label, and the answer
card repeats the urgency in words.

| Level      | Label (en)    | Icon (lucide)              | Colour | Text on tint (light / dark) | Outline on card |
| ---------- | ------------- | -------------------------- | ------ | --------------------------- | --------------- |
| `none`     | No risk found | `CircleCheck`              | Green  | 8.1 / 9.7                   | 3.4 / 4.2       |
| `low`      | Low risk      | `Info`                     | Green  | 8.1 / 9.7                   | 3.4 / 4.2       |
| `medium`   | Medium risk   | `CircleExclamationPoint`   | Amber  | 7.6 / 9.5                   | 4.0 / 5.9       |
| `high`     | High risk     | `TriangleExclamationPoint` | Orange | 6.5 / 8.5                   | 3.3 / 5.7       |
| `critical` | Critical risk | `OctagonExclamationPoint`  | Red    | 6.7 / 8.3                   | 4.7 / 5.1       |

Urgency labels: `none` Nothing to do · `routine` When you have time · `today` Today ·
`immediate` Right now. The mapping is in `components/assistant/risk.tsx` and `lib/i18n.ts`.

## Typography

- **Lexend** for headings. It was designed for reading ease and is calm without being generic.
- **Source Sans 3** for body text. It is a humanist sans with good Nordic diacritics.
- Both load through `next/font/google` with `latin` + `latin-ext` subsets for ä, ö and å.
- Weights: 400 (body) and 500 (headings, labels, buttons). That makes two weights; the cap is three.
- The scale is a minor third (1.2) on a 17px body:

| Token       | Size   | Line height | Use                                |
| ----------- | ------ | ----------- | ---------------------------------- |
| `text-xs`   | 13px   | 1.45        | Meta, prototype note, footer       |
| `text-sm`   | 15px   | 1.5         | Secondary text, labels             |
| `text-base` | 17px   | 1.6         | Body                               |
| `text-lg`   | 20.4px | 1.4         | Assistant questions, card headings |
| `text-xl`   | 24.5px | 1.25        | Answer headline (`action_label`)   |
| `text-2xl`  | 29.4px | 1.2         | Page heading "What happened?"      |

Paragraphs are capped at `max-w-prose` (65ch) and always left-aligned.

## Radius, spacing, layout

- Radius scale: `sm` 4px (segment thumbs, tags), `md` 6px (inputs, buttons, inner panels), `lg`
  10px (cards, scenario list), `xl` 14px (reserved for dialogs). `rounded-full` is used only for
  the step-number discs.
- Single column, `max-w-2xl`, left-aligned, 16px side gutter. It works at 375px with no horizontal
  scroll (we checked `scrollWidth`).
- Gaps grow with structure: 4–8px inside a row, 12–16px inside a card, 24px between turns, 48px
  between the start form and the examples.
- Touch targets: primary buttons are 44px tall, other buttons 40px, segments 36px.

## Motion

- New turns enter with fade + 4px slide over 200ms, ease-out (`tw-animate-css`). Hover changes
  take 150ms and touch colour only, or move the scenario arrow by 2px.
- The only continuous animation is the 16px spinner shown while waiting.
- New turns scroll into view instantly; we do not use smooth-scrolling across long cards.
- A global `@media (prefers-reduced-motion: reduce)` block brings every animation and transition
  down to ~0ms.

## Component anatomy

### Header

Product name with a teal `ShieldCheck` icon. Two segmented controls follow: audience (Consumer /
Small business) and language (FI / EN / SV). Both are native radio groups, so arrow keys work, and
screen readers hear the full language name. Below sits a muted strip with "Prototype – synthetic
data, not real DNA advice." The audience switch is locked during a conversation; "Start over"
unlocks it.

### Start view

Heading "What happened?", a one-line explanation, a text box labelled by the heading, and the send
button. Next comes a muted privacy box: "We keep this conversation for 24 hours, then delete it.
Never type passwords, card numbers or codes here." Last is "Or try an example": a divided list
(not a card grid) of `/api/scenarios` for the selected audience, current language first, four
shown plus "Show N more". Picking an example fills the box and sets `scenario_id`, audience and
language. A removable "Using example: …" line shows that an example is active.

### Question turn

A small "Assistant" label with the shield icon, then the question in Lexend `text-lg`. The answer
box below it is labelled "Your answer". Enter sends on devices with a fine pointer; on touch
devices Enter adds a line and you tap the button to send.

### Permission card (`consent_request`)

- A teal-tinted surface, set apart from the plain question turns.
- A lock icon and the heading "Can I check this?".
- The backend's `text` (why), then "What I would look at" with a bullet list of `fields[].label`.
- The reassurance line: "Only used for this conversation. Saying no is fine: you still get advice,
  it may just be less certain."
- **Allow** and **Not now** are the same component, variant, size and width (a two-column grid).
  Neither is pre-selected or highlighted. This avoids the dark pattern of making refusal harder.
- After a choice, the buttons are replaced by a sentence saying what was chosen.

### Answer card (`final`)

This is the one dominant element: a 2px risk-coloured outline and a small shadow.

1. Risk strip: tinted band with icon + risk label + clock icon + "When: …" urgency.
2. Headline: `action_label` in `text-xl` (receives focus on arrival).
3. `advice_text` as a plain paragraph.
4. Confidence in words: ≥ 0.8 "fairly sure", ≥ 0.6 "somewhat sure… talk to a person", below that
   "not sure, please talk to a person" (amber text).
5. If `escalation_required`, a handoff panel: "This needs a person", the `escalation_label` and a
   primary **Talk to a person** button. When the handoff succeeds, the panel shows the reference
   number and "This is what we will pass on" with the summary.
6. "What to do": numbered `steps`, with teal number discs.
7. "Where this advice comes from": `citations[].title`, plus a note that these are the organisers'
   synthetic guidance texts, not official advice.
8. Footer: **Start over**.

### Waiting and errors

- Waiting: `role="status"` reads "Thinking…". After 8 seconds it changes to "Still working on it.
  This can take up to 20 seconds."
- Errors: a `role="alert"` card with a plain cause, **Try again** (repeats the failed call) and
  Start over. It always includes "If this is urgent, call your bank or the operator's customer
  service directly." Each status has its own message: network or timeout, 503/502/429 busy, 404
  expired, contract mismatch, and other server errors.

### Accessibility

- Semantic structure: one `h1`, landmarks (`header`, `main`, `footer`) and a skip link. The
  conversation is an `ol`.
- A polite live region announces each new assistant turn (question text, consent request, or risk
  - action).
- If the control you used disappears (consent buttons, handoff button), focus moves to the new
  content.
- While waiting, the text box is read-only, not disabled, so focus is not lost.
- `<html lang>` follows the language switch, and example titles carry their own `lang`.

## Do / don't

| Do                                                        | Don't (anti-slop rule)                                 |
| --------------------------------------------------------- | ------------------------------------------------------ |
| One teal hue, warm greys, semantic risk colours           | Purple/indigo accents, gradients, glow, glassmorphism  |
| Lexend + Source Sans 3, two weights, 1.2 scale            | Inter/Geist everywhere, extrabold tight-tracked titles |
| One dominant answer card; examples as a plain list        | Three identical feature cards, uniform `rounded-2xl`   |
| Icon + label + colour for risk                            | Colour-only status, emoji, decorative dots             |
| Equal Allow / Not now                                     | Bright "Allow" next to a grey "No thanks" link         |
| Plain verbs: "Call DNA customer service now", "Try again" | "Supercharge", "Get started", "Learn more", hype       |
| ≤ 200ms, transform/opacity, reduced-motion honoured       | Scroll-triggered fade-ins, `hover:scale-105`, bounce   |
| Solid header with a border                                | Floating blurred navbar, mega footer                   |

## Pre-delivery slop audit (run 2026-11-06)

**Colour & type**

- [x] No indigo, violet or purple. Teal is the only brand hue.
- [x] No gradient text or gradient elements.
- [x] Display font is Lexend, not Inter/Geist. Two weights. Modular 1.2 scale.
- [x] Body text ≥ 4.5:1 in light and dark (table above).

**Layout & cards**

- [x] Widths vary: content `max-w-2xl`, paragraphs `max-w-prose`, header strip full-bleed. Padding
      differs between the start, conversation and footer.
- [x] No repeated three-column grid. Each view has one dominant element (start: the text box;
      result: the answer card).
- [x] Radius is a scale (4/6/10/14px).
- [x] No `border-l-4` accent, no glassmorphism, no emoji (checked by grep).

**Copy**

- [x] No hype words. CTAs are specific ("Talk to a person", "Start over", "Try again").
- [x] No invented metrics or testimonials. The prototype and synthetic-source notes are explicit.
- [x] No Lorem ipsum, placeholders or TODOs.

**Motion & accessibility**

- [x] Global `prefers-reduced-motion: reduce` block.
- [x] Transitions 150–200ms, transform/opacity or colour only, no scale on hover.
- [x] The form has a label, an empty or too-long error with `aria-invalid`, and a success path (the
      message appears in the conversation). Focus is visible on every control.
- [x] Colour is never the only indicator. There are no images.

**Gestalt check**

- [x] The product is specific (permission card, risk strip, handoff reference), so swapping the
      logo would not make it look like a competitor's.
- [x] None of the Instant-Death Signature tells are present.

Known compromise: the start view is centred in a `max-w-2xl` column on desktop. This is
deliberate, because the app is phone-first and embedded in another app, so there is no
asymmetric hero.
