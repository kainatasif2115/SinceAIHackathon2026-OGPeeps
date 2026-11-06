# Challenge brief (summary)

DNA × Since AI Hackathon 2026 · 6–8 Nov 2026 · Turku. Challenge partner: DNA Oyj.
This is our team's summary. The original brief is the source of truth.

## Challenge

**Digital Security Assistant: What Should I Do Now?**
Two audiences:

- **Consumers:** advice on personal security.
- **Small businesses:** advice on company security issues.

## Problem

Consumers and small businesses run into suspicious calls, messages, links and possible account compromise. Warnings often flag a risk but leave people unsure what to do.

Build an assistant that turns the user's description and the available risk signals into a **clear, proportionate next step**. It should:

- explain why
- ask only for the information it needs
- recognise uncertainty
- hand off to a human when needed

This is a prototype, not a live DNA security service. The intended setting is DNA's digital services, portal and apps, where the user is already identified.

## Guiding question

How can an AI assistant help a consumer or small business understand a possible digital threat and take the next safe action, without requiring cybersecurity expertise or giving unjustified certainty?

## Suggested approaches (optional)

- A conversational interface combined with rule-based safety checks
- Retrieval from trustworthy guidance
- Risk-signal fusion
- Explicit uncertainty and escalation logic

Possible inputs: a simulated call warning, link-risk result, device status, account or subscription context, and the user's own description. Any stack is allowed.

Constraints:

- Show the source or reason behind each piece of advice.
- Get clear consent before using optional information.
- Never take an irreversible action without human approval.

## Data

Since AI provides **SimSet v2.0.1**, now in [`simset/`](../simset/START_HERE.md):
- 588 development cases with reference answers;
- 335 test inputs without answers, which the organisers score;
- five sample journeys;
- a simulated user, a rules baseline and an evaluator.

Users write in Finnish, English and Swedish. Teams may add licensed public safety guidance and their own synthetic cases. All data is synthetic and is not DNA's advice.

There is **no access** to DNA production systems, customer records, real browsing or message history, network telemetry or live DNA APIs.

## Evaluation criteria

| Criterion                           | Weight | What it means                                                                                     |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| Security advice and correctness     | 25%    | Gives a secure, proportionate next step. Avoids harmful instructions and unjustified reassurance. |
| Clarity for both audiences          | 20%    | A non-expert understands the advice and why it matters.                                           |
| Uncertainty and escalation          | 20%    | Recognises missing evidence, declines to guess and hands off when necessary.                      |
| Working implementation and evidence | 20%    | Usable demo, five tested journeys, documented decisions and a plausible integration path.         |
| Privacy and consent                 | 15%    | Asks for as little input as possible and makes permission and data use clear.                     |

Test all five journeys. Report:

- how often the advice matched the reference action
- false alarms
- comprehension
- failure cases

Review the safety of the advice manually. Product packaging and pricing may be presented as a hypothesis.

## Deliverables

- [ ] `test_predictions.jsonl`: answers for all 335 test inputs
- [ ] Working demo or recorded walkthrough
- [ ] Source repository with setup instructions
- [ ] Short explanation of the architecture and safety boundaries ([`architecture.md`](architecture.md))
- [ ] Results for the five test journeys ([`journeys.md`](journeys.md))
- [ ] At least one failure or escalation example
- [ ] Evaluation results
- [ ] Short hypothesis for how DNA could package the service for consumers and small businesses

Production integration is not required.
