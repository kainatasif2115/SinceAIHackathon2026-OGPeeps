"""Turns engine output into what the chat page shows, in the user's language."""

from assistant import vocab

ACTION_TITLES = {
    "no_action_needed": {
        "en": "This looks genuine",
        "fi": "Tämä vaikuttaa aidolta",
        "sv": "Det här ser äkta ut",
    },
    "do_not_interact_and_delete": {
        "en": "Don't respond, and delete it",
        "fi": "Älä vastaa, ja poista viesti",
        "sv": "Svara inte, och radera det",
    },
    "verify_via_official_channel": {
        "en": "Check it yourself through an official channel",
        "fi": "Tarkista asia itse virallista kanavaa pitkin",
        "sv": "Kontrollera själv via en officiell kanal",
    },
    "contact_operator_support": {
        "en": "Contact operator customer service now",
        "fi": "Ota heti yhteyttä operaattorin asiakaspalveluun",
        "sv": "Kontakta operatörens kundtjänst nu",
    },
    "change_password_and_enable_mfa": {
        "en": "Change your password and turn on two-step login",
        "fi": "Vaihda salasana ja ota käyttöön vahva tunnistautuminen",
        "sv": "Byt lösenord och slå på tvåstegsinloggning",
    },
    "isolate_device_and_scan": {
        "en": "Disconnect the device and get it checked",
        "fi": "Katkaise laitteen verkkoyhteys ja tarkistuta se",
        "sv": "Koppla från enheten och låt kontrollera den",
    },
    "contact_bank_and_block_cards": {
        "en": "Contact your bank now",
        "fi": "Ota heti yhteyttä pankkiin",
        "sv": "Kontakta din bank nu",
    },
    "report_to_authority": {
        "en": "Report it to the police",
        "fi": "Tee ilmoitus poliisille",
        "sv": "Anmäl det till polisen",
    },
    "escalate_to_human": {
        "en": "Talk to a person now",
        "fi": "Puhu nyt ihmisen kanssa",
        "sv": "Prata med en person nu",
    },
    "decline_out_of_scope": {
        "en": "This is something we can't help with",
        "fi": "Tässä emme voi auttaa",
        "sv": "Det här kan vi inte hjälpa till med",
    },
}

ESCALATION_LABELS = {
    "operator_support_agent": {
        "en": "a person in our customer service",
        "fi": "asiakaspalvelumme ihminen",
        "sv": "en person i vår kundtjänst",
    },
    "security_specialist": {
        "en": "a security specialist",
        "fi": "tietoturva-asiantuntija",
        "sv": "en säkerhetsspecialist",
    },
    "human_advisor": {
        "en": "a trained advisor",
        "fi": "koulutettu neuvoja",
        "sv": "en utbildad rådgivare",
    },
    "business_security_support": {
        "en": "our business security support",
        "fi": "yritysasiakkaiden tietoturvatuki",
        "sv": "vårt säkerhetsstöd för företag",
    },
}

SIGNAL_LABELS = {
    "subscription.recent_events": {
        "en": "Recent changes to your subscription (SIM, eSIM, number transfers, orders)",
        "fi": "Liittymäsi viimeaikaiset muutokset (SIM, eSIM, numeronsiirrot, tilaukset)",
        "sv": "Senaste ändringar i ditt abonnemang (SIM, eSIM, nummerflytt, beställningar)",
    },
    "subscription.network_status": {
        "en": "Whether your line has network service right now",
        "fi": "Onko liittymälläsi juuri nyt verkkoyhteys",
        "sv": "Om din linje har nätverkstäckning just nu",
    },
    "device.recent_app_installs": {
        "en": "Apps recently installed on this device",
        "fi": "Tähän laitteeseen äskettäin asennetut sovellukset",
        "sv": "Appar som nyligen installerats på den här enheten",
    },
    "device.security_findings": {
        "en": "Security findings on this device (unknown profiles, remote-access apps)",
        "fi": "Laitteen tietoturvahavainnot (tuntemattomat profiilit, etäkäyttösovellukset)",
        "sv": "Säkerhetsfynd på enheten (okända profiler, fjärråtkomstappar)",
    },
    "operator_account.recent_logins": {
        "en": "Recent logins to your operator account",
        "fi": "Viimeaikaiset kirjautumiset operaattoritilillesi",
        "sv": "Senaste inloggningar på ditt operatörskonto",
    },
    "business.staff_accounts": {
        "en": "Your company's staff accounts and admin rights",
        "fi": "Yrityksesi henkilöstötilit ja ylläpito-oikeudet",
        "sv": "Företagets personalkonton och administratörsrättigheter",
    },
}


def _pick(labels: dict, language: str, fallback: str) -> str:
    return labels.get(language) or labels.get("en") or fallback


def answer(sub: dict, language: str) -> dict:
    target = sub.get("escalation_target") if sub.get("escalation_required") else None
    return {
        "risk_level": sub["risk_level"],
        "urgency": sub["urgency"],
        "primary_action": sub["primary_action"],
        "action_label": _pick(
            ACTION_TITLES.get(sub["primary_action"], {}), language, sub["primary_action"]
        ),
        "advice_text": sub["advice_text"],
        "steps": sub["steps"],
        "escalation_required": bool(sub.get("escalation_required")),
        "escalation_target": target,
        "escalation_label": _pick(ESCALATION_LABELS.get(target, {}), language, target)
        if target
        else None,
        "citations": [
            {"id": c, "title": vocab.guidance_title(c, language)} for c in sub.get("citations", [])
        ],
        "confidence": sub.get("confidence", 0.0),
    }


def turn(raw: dict, language: str) -> dict:
    if raw["type"] == "final":
        return {"type": "final", "answer": answer(raw["answer"], language)}
    if raw["type"] == "consent_request":
        fields = [
            {"path": f, "label": _pick(SIGNAL_LABELS.get(f, {}), language, f)}
            for f in raw["fields"]
        ]
        return {"type": "consent_request", "text": raw["text"], "fields": fields}
    return {"type": "question", "text": raw["text"], "topics": raw["topics"]}


def handoff_summary(conv, final: dict | None) -> str:
    """What a human agent receives: the situation, what was asked, and what we advised."""
    lines = [f"Customer type: {conv.case['audience'].replace('_', ' ')}"]
    lines.append(f"Language: {conv.case['language']}")
    lines.append(f"What the customer wrote: {conv.case['opening_message'][:400]}")
    for h in conv.history:
        if h["role"] == "assistant" and h["type"] == "question":
            lines.append(f"Assistant asked: {h['text']}")
        elif h["role"] == "user":
            lines.append(f"Customer answered: {h['text'][:300]}")
        elif h["role"] == "consent":
            choice = "allowed" if h["granted"] else "declined"
            lines.append(f"Customer {choice} access to: {', '.join(h['fields'])}")
    if final:
        lines.append(
            f"Assessment: risk {final['risk_level']}, urgency {final['urgency']}, "
            f"advised action {final['primary_action']}"
        )
        lines.append(f"Advice given: {final['advice_text']}")
    return "\n".join(lines)
