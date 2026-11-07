"""Scam-campaign radar: "you're the Nth person to ask about this today".

An operator sees many customers at once; a chatbot sees one. When someone
starts a chat, their message is reduced to a fingerprint: link domains, a
salted hash of each phone number and content word, and a broad theme. The
message text itself is never stored. Messages that share a domain or phone
number, or enough words, count as the same campaign. A customer is only told
once at least MIN_REPORTS other people reported something similar in the last
24 hours, and the note never changes the advice. Reports expire after 24 h.
"""

import hashlib
import re
import secrets
import threading
from collections import Counter
from datetime import UTC, datetime, timedelta

from django.conf import settings

from . import db

WINDOW = timedelta(hours=24)
MIN_REPORTS = 5  # others needed before a customer is told; keeps single reports private
STEM = 5  # words are compared by their first letters, so "pankki" and "pankista" match
MIN_SHARED_STEMS = 3  # enough on their own…
WORD_OVERLAP = 0.3  # …or 2 shared stems that make up this much of both messages

_DOMAIN = re.compile(r"\b((?:[a-z0-9-]+\.)+[a-z]{2,})(?=[/\s.,!?)]|$)", re.IGNORECASE)
_PHONE = re.compile(r"\+?\d[\d\s-]{6,}\d")
_WORD = re.compile(r"[^\W\d_]{4,}")

# Common words in Finnish, Swedish and English that say nothing about a campaign.
_STOP = set(
    """
    that this with have from your they what there about been were said someone asked told just
    then them which would could should because will when where while into also only here very
    some more than like know does done didn want need please help really still message text
    email phone call called number today yesterday received sent got getting thing things
    että tämä tämän joka jotka mutta myös vain kuin kanssa minulle minun sinun meidän heidän
    olen olin oliko onko ovat sain saanut viesti viestin soitti puhelu tänään eilen joku jotain
    mitä miten miksi koska sitten vielä nyt
    detta denna som har från till med och inte bara mycket fick meddelande samtal ringde idag
    igår någon något vad varför eftersom sedan
    """.split()
)

# Broad themes for the console, matched on word prefixes before hashing.
THEMES: list[tuple[str, tuple[str, ...]]] = [
    (
        "Parcel or customs fee",
        ("parcel", "package", "deliver", "custom", "paket", "tull", "toimit", "posti"),
    ),
    ("Bank code request", ("bank", "pankk", "code", "koodi", "kod", "verif", "tunnist")),
    ("SIM or eSIM change", ("esim", "sim", "signal", "kentt", "porting", "siirto")),
    (
        "Invoice or payment change",
        ("invoice", "lasku", "faktura", "iban", "payment", "maksu", "supplier", "toimittaja"),
    ),
    (
        "Login or password alert",
        ("login", "password", "salasan", "kirjaut", "lösenord", "microsoft", "account"),
    ),
    ("Prize or giveaway", ("prize", "winner", "voit", "arvont", "vinst", "giveaway")),
    ("Offer from the operator", ("offer", "tarjo", "erbjud", "upgrade", "5g")),
    ("Remote access request", ("anydesk", "teamviewer", "remote", "etäyht", "fjärr")),
]

_memory: list[dict] = []
_lock = threading.Lock()


def _hash(value: str) -> str:
    key = settings.SECRET_KEY.encode()
    return hashlib.blake2b(value.encode(), key=key[:64], digest_size=8).hexdigest()


def fingerprint(message: str) -> dict:
    """What is kept of a message: no text, only domains, hashed numbers and words, a theme."""
    text = message.lower()
    domains = sorted({d.removeprefix("www.") for d in _DOMAIN.findall(text)})
    phones = sorted({_hash(re.sub(r"\D", "", p)) for p in _PHONE.findall(text)})
    words = {w for w in _WORD.findall(text) if w not in _STOP}
    scores = Counter(
        theme for theme, stems in THEMES for w in words for stem in stems if w.startswith(stem)
    )
    return {
        "domains": domains,
        "phones": phones,
        "words": sorted({_hash(w[:STEM]) for w in words}),
        "theme": scores.most_common(1)[0][0] if scores else "Other",
    }


def similar(a: dict, b: dict) -> bool:
    if set(a["domains"]) & set(b["domains"]) or set(a["phones"]) & set(b["phones"]):
        return True
    wa, wb = set(a["words"]), set(b["words"])
    shared = len(wa & wb)
    return shared >= MIN_SHARED_STEMS or (
        shared >= 2 and shared / max(1, len(wa | wb)) >= WORD_OVERLAP
    )


# --- Storage ----------------------------------------------------------------------------


def _collection():
    coll = db.get_db()["campaign_reports"]
    coll.create_index("expires_at", expireAfterSeconds=0)
    return coll


def _recent() -> list[dict]:
    _seed_demo()
    since = datetime.now(UTC) - WINDOW
    if db.is_configured():
        found = list(_collection().find({"at": {"$gte": since}}))
        for r in found:  # MongoDB returns naive UTC datetimes
            if r["at"].tzinfo is None:
                r["at"] = r["at"].replace(tzinfo=UTC)
        return found
    with _lock:
        return [r for r in _memory if r["at"] >= since]


def _store(report: dict) -> None:
    report = {**report, "expires_at": report["at"] + WINDOW}
    if db.is_configured():
        _collection().insert_one({**report, "_id": report["id"]})
    else:
        with _lock:
            _memory.append(report)


def check_and_record(message: str, language: str, audience: str) -> dict | None:
    """Records this message's fingerprint; returns the campaign note to show, if any."""
    fp = fingerprint(message)
    matches = [r for r in _recent() if similar(fp, r)]
    now = datetime.now(UTC)
    _store(
        {
            "id": secrets.token_hex(8),
            "at": now,
            "language": language,
            "audience": audience,
            "demo": False,
            **fp,
        }
    )
    if len(matches) < MIN_REPORTS:
        return None
    return {
        "others": len(matches),
        "theme": Counter(r["theme"] for r in matches).most_common(1)[0][0],
        "first_seen": min(r["at"] for r in matches),
    }


def clusters() -> list[dict]:
    """Recent reports grouped into campaigns (single-link), newest activity first."""
    reports = sorted(_recent(), key=lambda r: r["at"])
    groups: list[list[dict]] = []
    for r in reports:
        group = next((g for g in groups if any(similar(r, m) for m in g)), None)
        if group is None:
            groups.append([r])
        else:
            group.append(r)

    now = datetime.now(UTC)
    out = []
    for g in groups:
        hourly = [0] * 24
        for r in g:
            hours_ago = int((now - r["at"]).total_seconds() // 3600)
            if 0 <= hours_ago < 24:
                hourly[23 - hours_ago] += 1
        out.append(
            {
                "theme": Counter(r["theme"] for r in g).most_common(1)[0][0],
                "domains": sorted({d for r in g for d in r["domains"]}),
                "reports": len(g),
                "first_seen": g[0]["at"],
                "last_seen": g[-1]["at"],
                "hourly": hourly,
                "rising": sum(hourly[-2:]) > sum(hourly[-4:-2]),
                "languages": dict(Counter(r["language"] for r in g)),
                "audiences": dict(Counter(r["audience"] for r in g)),
                "shown_to_customers": len(g) > MIN_REPORTS,
                "demo": any(r.get("demo") for r in g),
            }
        )
    return sorted(out, key=lambda c: (c["reports"] < 2, -c["reports"], c["last_seen"]))


# --- Demo reports -----------------------------------------------------------------------
# Synthetic messages written for this prototype, fingerprinted like real ones so the
# radar is not empty on stage. Marked demo=true.

_DEMO: list[tuple[str, str, str, list[float]]] = [
    (
        "Your parcel is on hold at customs. Pay the 1.99 EUR customs fee within 24 h: "
        "parcel-hold.example/pay",
        "en",
        "consumer",
        [9.5, 7.2, 5.8, 3.1, 1.6, 0.9, 0.4],
    ),
    (
        "Pakettisi odottaa tullissa. Maksa 1,99 euron tullimaksu 24 tunnin kuluessa: "
        "parcel-hold.example/pay",
        "fi",
        "consumer",
        [6.4, 2.2],
    ),
    (
        "Someone from the bank security team called and asked me to read out the verification "
        "code from my bank app so they could stop a payment",
        "en",
        "consumer",
        [11.0, 8.4, 4.9, 2.7, 1.2],
    ),
    (
        "Our supplier emailed new bank details and asked us to pay the next invoice to the new "
        "IBAN urgently, invoice-update.example",
        "en",
        "small_business",
        [20.0, 14.5, 9.8, 6.1, 3.3],
    ),
    (
        "Text from the operator: faster 5G at the same price for three months, see the offer "
        "in the app or at operator.example.net",
        "en",
        "consumer",
        [12.0, 10.1, 7.7, 5.0, 2.4, 0.7],
    ),
]


def _seed_demo() -> None:
    if db.is_configured():
        if _collection().count_documents({"demo": True}, limit=1):
            return
    else:
        with _lock:
            if any(r.get("demo") for r in _memory):
                return
    now = datetime.now(UTC)
    for text, language, audience, hours in _DEMO:
        fp = fingerprint(text)
        for h in hours:
            _store(
                {
                    "id": secrets.token_hex(8),
                    "at": now - timedelta(hours=h),
                    "language": language,
                    "audience": audience,
                    "demo": True,
                    **fp,
                }
            )
