import os

from ninja import NinjaAPI, Schema

from api import db
from assistant import simset

api = NinjaAPI(title="DNA Digital Security Assistant", version="0.1.0")


class Health(Schema):
    status: str
    simset_version: str
    guidance_passages: int
    claude_configured: bool
    mongodb_configured: bool


@api.get("/health", response=Health)
def health(request):
    return {
        "status": "ok",
        "simset_version": simset.version(),
        "guidance_passages": len(simset.guidance_corpus()),
        "claude_configured": bool(os.environ.get("ANTHROPIC_API_KEY")),
        "mongodb_configured": db.is_configured(),
    }
