import pytest

# Importing assistant.simset puts the organisers' pack on sys.path, so test
# modules can import dsakit directly.
import assistant.simset  # noqa: F401

# Django settings load backend/.env, which may hold real keys. Tests must never
# spend credits, so every test starts without them and sets what it needs.
REAL_CREDENTIALS = (
    "ELEVENLABS_API_KEY",
    "ELEVENLABS_AGENT_ID",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_AUTH_TOKEN",
    "BRAIN_PROVIDER",
    "VOICE_ENABLED",
)


@pytest.fixture(autouse=True)
def no_real_credentials(monkeypatch):
    for name in REAL_CREDENTIALS:
        monkeypatch.delenv(name, raising=False)


@pytest.fixture(autouse=True)
def fresh_usage_limits():
    from api import limits

    limits._memory.clear()
