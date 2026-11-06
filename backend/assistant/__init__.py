"""The assistant's brain: decides the next step for a user's situation.

Plain Python with no Django imports, so the API, batch scripts and the
simulator bot can all use it.

- brain.py    Claude reads the case and proposes a question, consent request or final answer.
- checker.py  Deterministic safety checks on every answer, using the organisers' dsakit.
- engine.py   Runs the two together: single answers and multi-turn conversations.
- prompt.py   The policy prompt plus the organisers' vocabularies and guidance.
"""

# Importing simset puts the organisers' pack on sys.path, so `dsakit` imports work
# anywhere below, whatever order a module imports things in.
from assistant import simset as _simset  # noqa: F401
