# Packaging hypothesis for DNA

> A hypothesis to test, not a result. Prices and numbers below are assumptions for discussion, not research findings.

## The idea in one line

**"What should I do now?"**: one calm, specific next step when something feels wrong, inside the DNA app and business portal, with a person one tap away.

## Who it's for

| Segment | The moment it helps | Why DNA is the right one to offer it |
|---|---|---|
| **Consumers** | A parcel-fee text, a "bank security" call, a link already clicked, a sudden eSIM change | DNA already sees signals nobody else can combine: call warnings, SIM and eSIM events, network status, its own account logins. It can act on number takeovers directly. |
| **Small businesses (1–20 staff, no IT department)** | CEO-fraud emails, supplier bank-detail changes, an ex-employee's access, a locked laptop | They have no security person. DNA already sells them mobile, broadband and devices, and the handoff goes to DNA's business support. |

## Packaging options

| Option | What's included | Price idea | Why |
|---|---|---|---|
| **A. Free in the DNA app for all customers** (recommended starting point) | The assistant, the five journeys, and handoff to customer service for SIM, eSIM and porting issues | Included | Fewer fraud losses and fewer long support calls. Number-takeover cases are expensive for the operator too. Builds trust in the DNA brand. |
| **B. Part of an existing security add-on** (e.g. bundled with DNA's security or device-protection products) | Option A plus device checks from the security app, which give richer signals, and priority human help | Existing add-on price | Gives the add-on an everyday, visible benefit. The device signals make the advice better. |
| **C. Business tier for small companies** | Option B plus staff-account checks, payment-fraud journeys, and handoff to business security support, with a monthly "what we caught" summary | Per company per month, e.g. a low two-digit € amount | Small businesses pay to avoid one bad payment. Competes with "call your nephew who knows computers". |

## What we would measure in a pilot

- **Share of conversations that end in a clear next step without a human.** Target: most of the benign and simple-phishing cases.
- **Handoffs that the human agent agrees were needed.** This checks we don't over-escalate.
- **Repeat contacts within 48 hours.** If people come back unsure, the advice wasn't clear.
- **Fraud-loss and number-takeover incidents** among users vs a comparison group.
- **Comprehension:** can the user say what to do next in their own words? (The brief's comprehension check, at scale.)

## Risks to test

- People may trust the assistant too much. Mitigation: it states uncertainty, never says "you're safe" without evidence, and hands off.
- Model cost per conversation at scale. Mitigation: prompt caching, a cheaper model for simple cases, single-call answers for most journeys.
- Regulatory: advice must not look like official authority guidance, and data use must follow the user's consent (GDPR). Mitigation: consent per data type, 24-hour retention, sources clearly labelled.
