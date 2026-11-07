import logging
import os
import secrets
from datetime import UTC, datetime

from django.http import HttpResponse
from ninja import File, Form, NinjaAPI, Schema, Status
from ninja.errors import HttpError
from ninja.files import UploadedFile

from api import (
    accounts,
    campaigns,
    cases,
    db,
    demo,
    limits,
    presenter,
    redteam,
    results,
    sessions,
    teams,
    tickets,
    voice,
)
from api import agent_auth as agent_auth_mod
from api.accounts import customer_auth
from api.agent_auth import agent_auth
from api.schemas import (
    AccountOut,
    AgentLoginIn,
    AgentOut,
    ConsentIn,
    ConversationDetailOut,
    ConversationOut,
    DemoLoginIn,
    DemoStatusOut,
    HandoffOut,
    InviteIn,
    LoginIn,
    RedTeamIn,
    ReplyIn,
    ScenarioOut,
    SessionOut,
    SignUpIn,
    SpeakIn,
    StartIn,
    TeamConversationOut,
    TeamOut,
    TicketOut,
    TicketUpdateIn,
    TranscriptOut,
)
from assistant import brain, engine, simset
from assistant.brain import BrainUnavailable
from assistant.engine import Conversation

log = logging.getLogger(__name__)

# What the user "said" when they sent only a screenshot.
SCREENSHOT_ONLY = {
    "fi": "(Lähetin vain kuvakaappauksen.)",
    "sv": "(Jag skickade bara en skärmbild.)",
    "en": "(I sent only a screenshot.)",
}

# No cookie-based auth, so Ninja does not apply CSRF checks. In production the operator's
# app would authenticate the already-identified user here.
api = NinjaAPI(title="DNA Digital Security Assistant", version="0.2.0")


class Health(Schema):
    status: str
    simset_version: str
    guidance_passages: int
    claude_configured: bool
    brain_provider: str
    voice_configured: bool
    mongodb_configured: bool


@api.get("/health", response=Health)
def health(request):
    return {
        "status": "ok",
        "simset_version": simset.version(),
        "guidance_passages": len(simset.guidance_corpus()),
        # Whether the brain's model is reachable (directly or through ElevenLabs).
        "claude_configured": _brain_configured(),
        "brain_provider": brain.provider(),
        "voice_configured": voice.is_configured(),
        "mongodb_configured": db.is_configured(),
    }


def _brain_configured() -> bool:
    if brain.provider() == "mock":
        return True
    if brain.provider() == "elevenlabs":
        return bool(os.environ.get("ELEVENLABS_API_KEY") and os.environ.get("ELEVENLABS_AGENT_ID"))
    return bool(os.environ.get("ANTHROPIC_API_KEY"))


@api.get("/scenarios", response=list[ScenarioOut])
def list_scenarios(request):
    return [sessions.scenario_summary(c) for c in sessions.scenarios().values()]


@api.post("/sessions", response=SessionOut)
def start_session(request, body: StartIn):
    message = body.message.strip() or SCREENSHOT_ONLY[body.language]
    case = sessions.build_case(body.audience, body.language, message, body.scenario_id)
    conv = Conversation(case=case)
    conv.add_images([image.model_dump() for image in body.images], turn=0)
    session_id = sessions.new_id()
    doc = {"scenario_id": body.scenario_id, "started_at": datetime.now(UTC)}
    if user := accounts.current_user(request):
        doc["user_id"] = user["_id"]  # so it shows on the account page
        if body.audience == "small_business" and user.get("team_id"):
            doc["team_id"] = user["team_id"]  # shared with the company's owner
    # Only the typed message is fingerprinted (screenshots are not), and the note
    # is informational: it never changes the assistant's advice.
    campaign = campaigns.check_and_record(body.message, body.language, body.audience)
    return {**_advance(request, session_id, conv, doc), "campaign": campaign}


@api.post("/sessions/{session_id}/reply", response=SessionOut)
def reply(request, session_id: str, body: ReplyIn):
    conv, doc = _load(session_id)
    _require_pending(doc, "question")
    sessions.add_link_check(conv.case, body.text)
    text = body.text.strip() or SCREENSHOT_ONLY[conv.case["language"]]
    conv.record_answer(text, [image.model_dump() for image in body.images])
    return _advance(request, session_id, conv, doc)


@api.post("/sessions/{session_id}/consent", response=SessionOut)
def consent(request, session_id: str, body: ConsentIn):
    conv, doc = _load(session_id)
    pending = _require_pending(doc, "consent_request")
    conv.record_consent(pending["fields"], body.granted)
    return _advance(request, session_id, conv, doc)


@api.post("/sessions/{session_id}/handoff", response=HandoffOut)
def handoff(request, session_id: str):
    conv, doc = _load(session_id)
    final = doc.get("final")
    reference = doc.get("handoff_reference") or f"DSA-{secrets.token_hex(3).upper()}"
    sessions.save(session_id, conv, {**_extra(doc), "handoff_reference": reference})
    tickets.create(tickets.from_conversation(reference, session_id, conv, final))
    return {"reference": reference, "summary": presenter.handoff_summary(conv, final)}


@api.delete("/sessions/{session_id}", response={204: None})
def delete_session(request, session_id: str):
    """ "Delete now" from the privacy card: a soft delete (see sessions.delete). A handoff
    ticket, if one was made, keeps its own copy of the summary for the human agent and
    expires on its own."""
    if not sessions.delete(session_id):
        raise HttpError(404, "Conversation not found or expired.")
    return Status(204, None)


# Optional customer accounts (api/accounts.py) and business teams (api/teams.py).
# The assistant works without an account.


def _sign_in(request, response: HttpResponse, user: dict) -> dict:
    response.set_cookie(
        accounts.COOKIE,
        accounts.issue_token(user),
        max_age=accounts.MAX_AGE,
        httponly=True,
        samesite="Strict",
        secure=request.is_secure(),
    )
    return teams.profile(user)


@api.post("/account/signup", response=AccountOut)
def account_signup(request, response: HttpResponse, body: SignUpIn):
    try:
        user = teams.sign_up(body.email, body.name, body.password, body.kind, body.company)
    except accounts.SignUpError as err:
        raise HttpError(400, str(err)) from err
    return _sign_in(request, response, user)


@api.post("/account/login", response=AccountOut)
def account_login(request, response: HttpResponse, body: LoginIn):
    try:
        user = accounts.authenticate(body.email, body.password)
    except accounts.LockedOut as err:
        raise HttpError(429, "Too many wrong passwords. Try again in 15 minutes.") from err
    if not user:
        raise HttpError(401, "Wrong email or password.")
    return _sign_in(request, response, user)


@api.get("/account/demo", response=DemoStatusOut)
def demo_status(request):
    return {"enabled": demo.enabled()}


@api.post("/account/demo", response=AccountOut)
def demo_login(request, response: HttpResponse, body: DemoLoginIn):
    """Sign in as a freshly rebuilt demo account (see api/demo.py)."""
    if not demo.enabled():
        raise HttpError(404, "Not available.")
    # Rebuilding takes a few database writes, so a visitor can't hammer it.
    if not limits.allow_demo(request):
        raise HttpError(429, "Please wait a moment before trying again.")
    return _sign_in(request, response, demo.start(body.kind))


@api.post("/account/logout", response={204: None})
def account_logout(request, response: HttpResponse):
    response.delete_cookie(accounts.COOKIE, samesite="Strict")
    return Status(204, None)


@api.get("/account/me", response=AccountOut, auth=customer_auth)
def account_me(request):
    return teams.profile(request.auth)


@api.get("/account/conversations", response=list[ConversationOut], auth=customer_auth)
def account_conversations(request):
    return _summaries(sessions.for_user(request.auth["_id"]))


@api.get("/account/conversations/{session_id}", response=ConversationDetailOut, auth=customer_auth)
def account_conversation(request, session_id: str):
    """One of your own conversations, to reopen it from the history. Finished ones are
    shown as they ended; one waiting for your answer can be continued."""
    loaded = sessions.load(session_id)
    if not loaded or loaded[1].get("user_id") != request.auth["_id"]:
        raise HttpError(404, "Conversation not found or expired.")
    conv, doc = loaded
    language = conv.case["language"]
    messages = [{"role": "user", "text": conv.case["opening_message"]}]
    for i, entry in enumerate(conv.history):
        if entry["role"] == "user":
            messages.append({"role": "user", "text": entry["text"]})
        elif entry["role"] == "assistant":
            choice = None
            if entry["type"] == "consent_request":
                after = conv.history[i + 1] if i + 1 < len(conv.history) else None
                choice = after["granted"] if after and after["role"] == "consent" else None
            messages.append(
                {"role": "assistant", "turn": presenter.turn(entry, language), "choice": choice}
            )
    if doc.get("final"):
        final = {"type": "final", "answer": doc["final"]}
        messages.append({"role": "assistant", "turn": presenter.turn(final, language)})
    return {
        "session_id": session_id,
        "language": language,
        "audience": conv.case["audience"],
        "turns_used": conv.turns_used,
        "max_turns": conv.max_turns,
        "updated_at": doc["updated_at"],
        "messages": messages,
    }


@api.delete("/account", response={204: None}, auth=customer_auth)
def account_delete(request, response: HttpResponse):
    """Deletes the account and its conversations now. An owner's team is closed and its
    members keep their accounts as private ones. Handoff tickets keep their own copy
    for the support agent and expire after 24 hours like everything else."""
    user = request.auth
    if user.get("role") == "owner" and (team := teams.team_of(user)):
        teams.dissolve(team)
    sessions.delete_for_user(user["_id"])
    accounts.delete(user["_id"])
    response.delete_cookie(accounts.COOKIE, samesite="Strict")
    return Status(204, None)


@api.get("/account/team", response=TeamOut, auth=customer_auth)
def team_view(request):
    return teams.view(_my_team(request), request.auth)


@api.post("/account/team/invites", response=TeamOut, auth=customer_auth)
def team_invite(request, body: InviteIn):
    team = _my_team(request, owner=True)
    try:
        teams.invite(team, body.email)
    except teams.TeamError as err:
        raise HttpError(400, str(err)) from err
    return teams.view(team, request.auth)


@api.delete("/account/team/invites/{email}", response=TeamOut, auth=customer_auth)
def team_cancel_invite(request, email: str):
    team = _my_team(request, owner=True)
    teams.cancel_invite(team, email)
    return teams.view(team, request.auth)


@api.delete("/account/team/members/{email}", response=TeamOut, auth=customer_auth)
def team_remove_member(request, email: str):
    team = _my_team(request, owner=True)
    try:
        teams.remove_member(team, email)
    except teams.TeamError as err:
        raise HttpError(400, str(err)) from err
    return teams.view(team, request.auth)


@api.post("/account/team/join", response=AccountOut, auth=customer_auth)
def team_join(request):
    user = request.auth
    if teams.team_of(user):
        raise HttpError(409, "You're already in a team. Leave it first.")
    team = teams.find_invite(user["email"])
    if not team:
        raise HttpError(404, "There's no invite for this email.")
    teams.join(user, team)
    return teams.profile(accounts.get(user["_id"]))


@api.post("/account/team/leave", response=AccountOut, auth=customer_auth)
def team_leave(request):
    _my_team(request)
    if request.auth.get("role") == "owner":
        raise HttpError(409, "The owner can't leave. Delete the account to close the team.")
    teams.leave(request.auth)
    return teams.profile(accounts.get(request.auth["_id"]))


@api.get("/account/team/conversations", response=list[TeamConversationOut], auth=customer_auth)
def team_conversations(request):
    """The checks colleagues made in business mode (the owner's own are in their list).
    Owner only; private-mode checks never appear here."""
    team = _my_team(request, owner=True)
    me = request.auth["_id"]
    docs = [d for d in sessions.for_team(team["_id"]) if d.get("user_id") != me]
    names = {u["_id"]: u["name"] for u in accounts.in_team(team["_id"])}
    return [
        {**summary, "author": names.get(doc.get("user_id"), "Former member")}
        for doc, summary in zip(docs, _summaries(docs), strict=True)
    ]


def _my_team(request, owner: bool = False) -> dict:
    team = teams.team_of(request.auth)
    if not team:
        raise HttpError(404, "You're not in a team.")
    if owner and request.auth.get("role") != "owner":
        raise HttpError(403, "Only the team's owner can do this.")
    return team


def _summaries(docs: list[dict]) -> list[dict]:
    handoffs = tickets.handoffs(
        [d["handoff_reference"] for d in docs if d.get("handoff_reference")]
    )
    out = []
    for d in docs:
        case = d["conversation"]["case"]
        final = d.get("final")
        reference = d.get("handoff_reference")
        out.append(
            {
                "session_id": d["_id"],
                "title": sessions.excerpt(case["opening_message"]),
                "language": case["language"],
                "started_at": d.get("started_at") or d["updated_at"],
                "expires_at": d["expires_at"],
                "state": "answered" if final else "in_progress",
                "risk_level": final["risk_level"] if final else None,
                "action_label": presenter.answer(final, "en")["action_label"] if final else None,
                "handoff_reference": reference,
                "handoff_status": handoffs[reference]["status"] if reference in handoffs else None,
                "handoff": handoffs.get(reference) if reference else None,
            }
        )
    return out


# Support-agent console. The prototype has one demo staff account (api/agent_auth.py);
# in production this sits behind DNA's staff single sign-on.


@api.post("/redteam")
def red_team(request, body: RedTeamIn):
    """ "Try to trick it": runs an attack through the real pipeline and reports what
    the safety checker caught. Public, like the chat itself."""
    if not limits.allow(request):
        raise HttpError(429, "Too many tries for now. Please come back in an hour.")
    return redteam.attack(body.message, body.language, body.audience)


@api.post("/agent/login", response=AgentOut)
def agent_login(request, response: HttpResponse, body: AgentLoginIn):
    if not agent_auth_mod.is_configured():
        raise HttpError(503, "The demo staff login is not set up (AGENT_DEMO_PASSWORD).")
    if not agent_auth_mod.check(body.username, body.password):
        raise HttpError(401, "Wrong username or password.")
    response.set_cookie(
        agent_auth_mod.COOKIE,
        agent_auth_mod.issue_token(),
        max_age=agent_auth_mod.MAX_AGE,
        httponly=True,
        samesite="Strict",
        secure=request.is_secure(),
    )
    return {"name": agent_auth_mod.DISPLAY_NAME}


@api.post("/agent/logout", response={204: None})
def agent_logout(request, response: HttpResponse):
    response.delete_cookie(agent_auth_mod.COOKIE, samesite="Strict")
    return Status(204, None)


@api.get("/agent/me", response=AgentOut, auth=agent_auth)
def agent_me(request):
    return {"name": request.auth}


@api.get("/agent/tickets", response=list[TicketOut], auth=agent_auth)
def list_tickets(request):
    return tickets.all_tickets()


@api.get("/agent/results", auth=agent_auth)
def evaluation_results(request):
    """The evaluator's output for each saved run (results/*.txt), as numbers."""
    return results.load_all()


@api.get("/journeys")
def journeys(request):
    """The five journeys as saved conversations, for the public /journeys page. Synthetic
    organisers' dev cases and our answers; nothing here comes from a customer."""
    return {"journeys": cases.journeys()}


@api.get("/agent/cases", auth=agent_auth)
def list_cases(request, run: str = "multi"):
    """Dev cases in a saved run, each with the official pass/fail."""
    if run not in cases.RUNS:
        raise HttpError(404, "Unknown run.")
    return {"run": run, "runs": cases.RUNS, "cases": cases.summaries(run)}


@api.get("/agent/cases/{run}/{case_id}", auth=agent_auth)
def case_detail(request, run: str, case_id: str):
    """One case as a chat: the transcript, our answer, the expected answer, the verdict."""
    found = cases.detail(run, case_id) if run in cases.RUNS else None
    if not found:
        raise HttpError(404, "Case not found in this run.")
    return found


@api.patch("/agent/tickets/{reference}", response=TicketOut, auth=agent_auth)
def update_ticket(request, reference: str, body: TicketUpdateIn):
    ticket = tickets.update_status(reference, body.status, agent=request.auth)
    if not ticket:
        raise HttpError(404, "Ticket not found or expired.")
    return ticket


MAX_AUDIO_BYTES = 10 * 1024 * 1024


@api.post("/voice/transcribe", response=TranscriptOut)
def transcribe(request, audio: File[UploadedFile], language: Form[str] = ""):
    """Microphone recording -> text, so people can speak instead of type."""
    if not voice.is_configured():
        raise HttpError(503, "Voice input is not available right now.")
    if not limits.allow(request):
        raise HttpError(429, "Voice input is busy. Please try again later.")
    if audio.size > MAX_AUDIO_BYTES:
        raise HttpError(413, "Recording is too long.")
    try:
        text = voice.transcribe(audio.read(), audio.name or "recording.webm", language or None)
    except Exception as err:
        log.warning("Transcription failed: %s", err)
        raise HttpError(503, "Voice input is not available right now.") from err
    return {"text": text}


@api.post("/voice/speak")
def speak(request, body: SpeakIn):
    """Text -> speech (MP3), for "read it aloud"."""
    if not voice.is_configured():
        raise HttpError(503, "Reading aloud is not available right now.")
    if not limits.allow(request):
        raise HttpError(429, "Reading aloud is busy. Please try again later.")
    try:
        audio = voice.speak(body.text, body.language)
    except Exception as err:
        log.warning("Text to speech failed: %s", err)
        raise HttpError(503, "Reading aloud is not available right now.") from err
    return HttpResponse(audio, content_type="audio/mpeg")


def _load(session_id: str) -> tuple[Conversation, dict]:
    loaded = sessions.load(session_id)
    if not loaded:
        raise HttpError(404, "Conversation not found or expired.")
    return loaded


def _require_pending(doc: dict, kind: str) -> dict:
    pending = doc.get("pending")
    if not pending or pending["type"] != kind:
        raise HttpError(409, f"The assistant is not waiting for a {kind.replace('_', ' ')}.")
    return pending


def _extra(doc: dict) -> dict:
    keep = (
        "scenario_id",
        "pending",
        "final",
        "handoff_reference",
        "user_id",
        "team_id",
        "started_at",
        "sample",
    )
    return {k: doc[k] for k in keep if k in doc}


def _advance(request, session_id: str, conv: Conversation, doc: dict) -> dict:
    try:
        if not limits.allow(request):
            raise BrainUnavailable("usage limit reached")
        raw = conv.next_turn()
    except BrainUnavailable as err:
        # The assistant must never leave someone without advice: give the safe generic
        # answer with a human handoff, and log why. This also covers the usage limits
        # (api/limits.py), so running out of budget costs no AI credits.
        log.warning("Brain unavailable for session %s: %s", session_id, err)
        answer = engine.fallback_answer(conv.case)
        raw = {
            "type": "final",
            "answer": engine.to_submission(conv.case["case_id"], answer, "multi_turn"),
        }

    extra = _extra(doc)
    if raw["type"] == "final":
        final = raw["answer"]
        if raw.get("shown_steps"):
            final = {**final, "shown_steps": raw["shown_steps"]}
        extra.update(pending=None, final=final)
    else:
        extra.update(pending=raw)
    sessions.save(session_id, conv, extra)
    return {
        "session_id": session_id,
        "turn": presenter.turn(raw, conv.case["language"]),
        "turns_used": conv.turns_used,
        "max_turns": conv.max_turns,
    }
