"""Simulated link-reputation check for links people type or paste in the chat.

In the organisers' dataset every case comes with a link check from the
operator's (simulated) reputation service. For situations typed live, we stand
in for that service with transparent rules, in the same shape, marked
`"source": "simulated_demo_check"`. A real deployment would call DNA's own
link-reputation system here instead.

The rules never call an unfamiliar link "clean": brand-new scam domains look
ordinary, so anything not on the official list is at best "unknown".
"""

import ipaddress
import re
from datetime import UTC, datetime

# Official domains (and their subdomains) of organisations people get impersonated as.
OFFICIAL = {
    "dna.fi",
    "posti.fi",
    "op.fi",
    "nordea.fi",
    "s-pankki.fi",
    "danskebank.fi",
    "aktia.fi",
    "handelsbanken.fi",
    "omasp.fi",
    "saastopankki.fi",
    "vero.fi",
    "kela.fi",
    "poliisi.fi",
    "suomi.fi",
    "traficom.fi",
    "kyberturvallisuuskeskus.fi",
    "mobilepay.fi",
    "elisa.fi",
    "telia.fi",
    "postnord.fi",
    "dhl.fi",
}
SHORTENERS = {
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "is.gd",
    "cutt.ly",
    "rb.gy",
    "t.ly",
    "ow.ly",
    "shorturl.at",
}
BRANDS = (
    "dna",
    "posti",
    "nordea",
    "pankki",
    "bank",
    "vero",
    "kela",
    "poliisi",
    "mobilepay",
    "aktia",
    "elisa",
    "telia",
    "postnord",
    "dhl",
    "netflix",
    "paypal",
    "microsoft",
    "apple",
    "google",
    "amazon",
    "facebook",
    "instagram",
    "whatsapp",
)
LURES = (
    "pay",
    "maksu",
    "maksa",
    "verify",
    "vahvist",
    "login",
    "kirjaudu",
    "signin",
    "secure",
    "update",
    "paivit",
    "päivit",
    "refund",
    "palautus",
    "customs",
    "tulli",
    "prize",
    "voitto",
    "lahja",
    "gift",
    "account",
    "tili",
    "unlock",
    "suspend",
    "confirm",
    "parcel",
    "paketti",
    "delivery",
    "toimitus",
    "invoice",
    "lasku",
    "wallet",
    "bonus",
)
RISKY_TLDS = {
    "top",
    "xyz",
    "click",
    "link",
    "shop",
    "online",
    "site",
    "live",
    "icu",
    "buzz",
    "rest",
    "cfd",
    "sbs",
    "info",
    "support",
    "help",
    "work",
    "zip",
    "mov",
}
URL = re.compile(
    r"(?:https?://|www\.)[^\s<>\"'()]+"
    r"|\b(?:[a-z0-9-]+\.)+(?:fi|se|com|net|org|eu|io|me|co|ly|app|"
    + "|".join(sorted(RISKY_TLDS))
    + r")\b(?:/[^\s<>\"'()]*)?",
    re.IGNORECASE,
)


def find_links(text: str) -> list[str]:
    return [m.group(0).rstrip(".,;:!?") for m in URL.finditer(text or "")]


def _host(url: str) -> str:
    host = re.sub(r"^https?://", "", url, flags=re.IGNORECASE).split("/")[0].split(":")[0]
    host = host.lower().strip(".")
    return host[4:] if host.startswith("www.") else host


def check(url: str) -> dict:
    """Reputation verdict for one link, in the organisers' link_check shape."""
    host = _host(url)
    path = url.lower().split(host, 1)[-1] if host in url.lower() else ""
    result = {
        "url": url,
        "verdict": "unknown",
        "confidence": 0.4,
        "categories": [],
        "domain_age_days": None,
        "checked_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "source": "simulated_demo_check",
    }
    if any(host == d or host.endswith("." + d) for d in OFFICIAL):
        return {**result, "verdict": "clean", "confidence": 0.9, "domain_age_days": 7000}
    if host in SHORTENERS:
        return {**result, "categories": ["url_shortener"]}

    score, categories = 0, []
    try:
        ipaddress.ip_address(host)
        score, categories = score + 2, [*categories, "raw_ip_address"]
    except ValueError:
        pass
    labels = host.split(".")
    if "xn--" in host:
        score, categories = score + 2, [*categories, "lookalike_characters"]
    if any(brand in host for brand in BRANDS):
        score, categories = score + 2, [*categories, "brand_impersonation"]
    if any(lure in host or lure in path for lure in LURES):
        score, categories = score + 1, [*categories, "lure_words"]
    if labels[-1] in RISKY_TLDS:
        score, categories = score + 1, [*categories, "risky_tld"]
    if host.count("-") >= 2 or len(labels) >= 4 or any(ch.isdigit() for ch in labels[0]):
        score, categories = score + 1, [*categories, "unusual_domain"]

    if score >= 3:
        return {
            **result,
            "verdict": "malicious",
            "confidence": 0.75,
            "categories": ["phishing", *categories],
        }
    if score >= 1:
        return {**result, "verdict": "suspicious", "confidence": 0.6, "categories": categories}
    return result


def check_text(text: str) -> dict | None:
    """The most worrying link in a message, or None if it has no links."""
    order = {"malicious": 0, "suspicious": 1, "unknown": 2, "clean": 3}
    results = [check(url) for url in find_links(text)]
    return min(results, key=lambda r: order[r["verdict"]]) if results else None
