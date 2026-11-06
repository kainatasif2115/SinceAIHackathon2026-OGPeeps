"""The assistant's brain: decides the next step for a user's situation.

Plain Python with no Django imports, so the API, batch scripts and the
simulator bot can all use it.

Planned modules (not built yet):
- brain.py    Claude reads the case and proposes a question, consent request or final answer.
- checker.py  Deterministic safety checks on every answer, using the organisers' dsakit.
"""
