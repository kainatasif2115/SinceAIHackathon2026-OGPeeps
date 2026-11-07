# Design system: Security assistant

The frontend (`frontend/`) has two surfaces:

1. **`/`, a DNA-style homepage (prototype).** It shows how the assistant would sit inside an operator's website. Every entry point (hero box, examples, help topics, the floating "Ask security" button) opens the assistant in a slide-out chat panel. It's labelled "Prototype – synthetic data – not a live DNA service" at the top.
2. **`/assistant`, the assistant on its own.** It's phone-first, as it would sit inside an operator's app.

The assistant should feel like a bank or health app: calm, plain and trustworthy. Not a hacker tool, not a marketing page. The rules come from `.claude/skills/anti-ai-slop` and `.claude/skills/component-reference-design`.

Tokens live in `frontend/src/app/globals.css` and fonts in `frontend/src/app/layout.tsx`. The homepage is in `frontend/src/components/site/`, the assistant in `frontend/src/components/assistant/`.

## Colour: two themes

| Theme | Where | Brand hue | Mode |
|---|---|---|---|
| **DNA theme** (`.theme-dna`) | Homepage and its chat panel | Magenta `#da0070`, near-black ink `#121212`, cool greys | Light only |
| **Default theme** | `/assistant` | Deep teal `#006363` (OKLCH hue 195), warm greys | Light and dark (`prefers-color-scheme`) |

Both use a 60-30-10 split: plain background (60), cards and muted surfaces (30), and the brand colour only for primary actions, selection and focus (10). Neither uses gradients, glow or glass effects. Risk colours are separate from the brand in both themes.

### DNA theme tokens

| Token | Value | Use |
|---|---|---|
| `--brand` / `--primary` | `oklch(0.56 0.225 358)` #da0070 | Primary buttons (Send, Check it), focus ring, selected segments |
| `--brand-foreground` | white | Text on magenta (5.0:1) |
| `--brand-soft` / `--accent` | #fdeef4 | Permission card, handoff panel tint |
| `--accent-foreground` | #a1004f | Text on the soft tint |
| `--foreground` | #121212 | Body text |
| `--muted-foreground` | #5c5c63 | Secondary text (6.6:1 on white) |
| `--input` | `oklch(0.62 0.006 286)` | Text field outline |

### Default theme tokens (`/assistant`)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | #faf9f6 | #15120f | Page |
| `--card` | #fffefd | #1f1b17 | Cards, header |
| `--foreground` | #231e19 | #efece8 | Body text |
| `--muted-foreground` | #605a53 | #afaaa3 | Secondary text |
| `--primary` (teal) | #006363 | #6ac2c2 | Primary button, selected, ring |
| `--accent` | #dff3f3 | #112e2e | Permission card, handoff panel |

Contrast (computed from the OKLCH values): body text 15.6:1 light and 15.9:1 dark; muted text at least 6.0:1; text on teal 6.8:1 light and 8.7:1 dark. Every body-text pair passes AA, and most pass AAA. The focus ring is a solid 2px brand-colour outline with a 2px offset in both themes.

## Risk levels

Colour is never the only signal. Every level has its own icon and a written label, and the answer card repeats the urgency in words.

| Level | Label (en) | Icon (lucide) | Colour |
|---|---|---|---|
| `none` | No risk found | `CircleCheck` | Green |
| `low` | Low risk | `Info` | Green |
| `medium` | Medium risk | `CircleExclamationPoint` | Amber |
| `high` | High risk | `TriangleExclamationPoint` | Orange |
| `critical` | Critical risk | `OctagonExclamationPoint` | Red |

Urgency labels: `none` Nothing to do · `routine` When you have time · `today` Today · `immediate` Right now. The mapping is in `components/assistant/risk.tsx` and `lib/i18n.ts`. In the default theme, text on each risk tint is 6.5:1 or better.

## Typography

- **Lexend** for headings: designed for reading ease, calm without being generic.
- **Source Sans 3** for body text: a humanist sans with good Nordic diacritics.
- Both load through `next/font/google` with `latin` + `latin-ext` subsets, for ä, ö and å.
- **The assistant** uses two weights: 400 for body text, 500 for headings, labels and buttons. The scale is a minor third (1.2) on a 17px body: 13 / 15 / 17 / 20.4 / 24.5 / 29.4px.
- **The homepage** also uses 600 and 700 for its large marketing headings, to match an operator website's look.
- Paragraphs are capped at `max-w-prose` (65ch) and always left-aligned.

## Radius, spacing, layout

- Radius scale: 4px (tags, segment thumbs), 6px (buttons, inner panels), 10px (cards, example list), 16px (`rounded-2xl`, for the message box card and the homepage's large cards). Pills (`rounded-full`) are used for the example-scam chips, the floating "Ask security" button and the icon buttons in the message box.
- The assistant is a single column, `max-w-2xl`, with a 16px side gutter. Both surfaces work at 375px with no horizontal scroll (checked with `scrollWidth`).
- Touch targets: primary buttons are 44px tall; icon buttons and other buttons are 40px.

## Motion

- New chat turns enter with a fade plus a 4px slide over 200ms (ease-out). Hover changes take 150ms and touch colour only.
- The only continuous animations are the waiting spinner and the pulse on the microphone while it's listening.
- A global `@media (prefers-reduced-motion: reduce)` block brings every animation and transition down to about 0ms.

## Component anatomy

### Homepage (`components/site/`)

- **Top strip:** Private / Business switch (it sets the assistant's audience), plus the prototype notice.
- **Header:** DNA wordmark with "Security", page-section links, and a "Check a message" button that opens the assistant.
- **Hero** (magenta band):
  - left side: the headline "Not sure about a message? Ask before you act.", a short explanation, a "What happened?" box (text, screenshot, microphone, "Check it") and example-scam chips;
  - right side: a phone mock-up showing a sample scam SMS and the assistant's answer.
- **Sections:**
  - help topics (open the assistant);
  - how it works (three steps);
  - scams right now (example cases from `/api/scenarios`);
  - a trust band ("what we never ask for");
  - the footer.
- **Chat panel:** a slide-out `role="dialog"` with `aria-modal`. It takes focus on open, closes on Escape, and returns focus to the button that opened it. Starting from the hero or an example opens it with that message already sent.

### Header (inside the assistant)

The product name with a shield icon, then two segmented controls: audience (Consumer / Small business) and language (FI / EN / SV). Both are native radio groups, so arrow keys work. A muted strip follows: "Prototype – synthetic data, not real DNA advice." The audience switch is locked during a conversation; "Start over" unlocks it.

### Message box (the composer)

Chat-app style: **one rounded card** (16px) holds the text area and a toolbar underneath.
- The toolbar has an outlined **screenshot** button on the left, then the **microphone** and a square brand-colour **arrow Send** button on the right. All are 40px.
- The whole card shows the focus ring while you type.
- "Enter to send, Shift + Enter for a new line" is read by screen readers but not shown, as in chat apps. On touch devices Enter adds a line and you tap Send.
- Near the 2,000-character limit a counter appears in the toolbar.
- Screenshots can also be pasted or dragged onto the box; a dashed outline shows the drop zone.

### Voice input

- The microphone uses the browser's speech recognition in the selected language (fi-FI, sv-SE, en-GB).
- While listening, the button turns red with a stop icon and a pulse, and a live status line says it's listening.
- The words appear in the message box, so the user can check them before sending.
- The button is hidden in browsers without speech recognition (e.g. Firefox).
- Errors (permission denied, nothing heard) show a plain message under the box.

### Copy and read aloud

Every assistant message, including questions and the answer card, has two small icon buttons underneath: **Copy** (with a check mark when done) and **Read aloud**. Read aloud uses the backend's ElevenLabs voice in the conversation's language; if that isn't available, it falls back to the browser's built-in speech. While playing, the button becomes **Stop**.

### Screenshots

- Up to three per message, by picking, pasting or dropping.
- They're shown as thumbnails in a tray inside the card, each with a remove button.
- The browser shrinks them to at most 1568px and re-encodes them, which strips EXIF location data.
- They're kept with the conversation for 24 hours, like the text.
- The privacy line reminds users never to type passwords, card numbers or codes.

### Account pages (`/signup`, `/login`, `/account`)

- Same DNA theme and header as the homepage, with a "Home" link. The homepage header shows **Log in**, or the first name once signed in.
- **Sign-up / login:** one centred card. Labels sit above fields, the password has a show/hide button, and sign-up lists the password rules under the field. Errors from the server appear in a `role="alert"` line. A note says what is stored and that accounts are optional.
- **Account page:** a greeting with the email, a **Check a message** button, "Your recent checks" (title, time, risk badge with icon and label, the action, and handoff status in words), then **Log out** and **Delete my account**. Deleting asks once more in a tinted box that says what is removed and that it can't be undone.

### Start view

- The heading "What happened?", a one-line explanation, the message box, then a muted privacy box: "We keep this conversation for 24 hours, then delete it. Never type passwords, card numbers or codes here."
- Last comes "Or try an example": a divided list (not a card grid) from `/api/scenarios` for the selected audience. Four are shown, plus "Show N more".

### Question turn

A small "Assistant" label with the shield icon, then the question in Lexend `text-lg`. The message box below it is labelled "Your answer".

### Permission card (`consent_request`)

- A tinted surface, set apart from the plain question turns, with a lock icon and the heading "Can I check this?".
- The backend's reason, then "What I would look at" with a bullet list of what it would check.
- "Only used for this conversation. Saying no is fine: you still get advice, it may just be less certain."
- **Allow** and **Not now** are the same component, variant, size and width. Neither is pre-selected, which avoids the dark pattern of making refusal harder. After a choice, a sentence says what was chosen.

### Answer card (`final`)

The one dominant element: a 2px risk-coloured outline and a small shadow.

1. Risk strip: icon, risk label, and "When: …" urgency.
2. Headline: the action (receives focus on arrival).
3. The advice as a plain paragraph.
4. Confidence in words: "fairly sure", "somewhat sure… talk to a person", or "not sure, please talk to a person" (amber).
5. If a handoff is needed: "This needs a person" with a **Talk to a person** button. Afterwards it shows the reference number and "This is what we will pass on".
6. "What to do": numbered steps.
7. "Where this advice comes from": source titles, noted as the organisers' synthetic guidance, not official advice.
8. Footer: **Start over**.

### Waiting and errors

- Waiting: a `role="status"` line reads "Thinking…". After 8 seconds it says "Still working on it. This can take up to 20 seconds."
- Errors: a `role="alert"` card with a plain cause, **Try again** and Start over. It always includes "If this is urgent, call your bank or the operator's customer service directly."

### Accessibility

- Semantic structure: landmarks, a skip link, and the conversation as a list.
- A polite live region announces each new assistant turn.
- If the control you used disappears (consent buttons, handoff button), focus moves to the new content.
- While waiting, the text box is read-only, not disabled, so focus isn't lost.
- `<html lang>` follows the language switch.
- Every icon-only button has a screen-reader label and a tooltip.

## Do / don't

| Do | Don't (anti-slop rule) |
|---|---|
| One brand hue per theme, plus semantic risk colours | Purple/indigo accents, gradients, glow, glassmorphism |
| Lexend + Source Sans 3, a modular scale | Inter/Geist everywhere |
| One dominant answer card; examples as a plain list | Three identical feature cards |
| Icon + label + colour for risk | Colour-only status, emoji |
| Equal Allow / Not now | A bright "Allow" next to a grey "No thanks" link |
| Plain verbs: "Check it", "Talk to a person", "Start over" | "Supercharge", "Get started", hype |
| ≤ 200ms, transform/opacity, reduced motion honoured | Scroll-triggered fade-ins, `hover:scale-105`, bounce |

## Slop audit (updated 2026-11-07)

**Passes**
- [x] No indigo, violet or purple. Brand hues are DNA magenta (homepage) and teal (`/assistant`).
- [x] No gradient text or gradient elements, no glassmorphism, no emoji, no `border-l-4` accent cards.
- [x] Body text ≥ 4.5:1 in every theme.
- [x] No hype words. CTAs are specific.
- [x] No invented metrics or testimonials. Prototype and synthetic-source notes are visible.
- [x] Global reduced-motion support. Transitions ≤ 200ms, no scale on hover.
- [x] A visible focus ring on every control, including the screenshot and microphone buttons (added 2026-11-07; they had none).
- [x] Colour is never the only indicator.

**Known deviations, kept on purpose**
- The homepage uses four font weights (400–700) and several `rounded-2xl` cards, to read like an operator website. The assistant itself stays at two weights.
- Pills are used for the example chips and the floating launcher. Both are tag- or chip-like, which the rules allow.
- The DNA theme is light-only. `/assistant` keeps dark mode.
