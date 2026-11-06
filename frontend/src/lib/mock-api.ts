/**
 * Canned backend responses for NEXT_PUBLIC_MOCK_API=1. Lets the UI be built
 * and demoed with no Django backend running. Content is synthetic and mirrors
 * the organisers' SimSet journeys; it is not real advice.
 *
 * Flows (picked from the scenario id or keywords in the first message):
 * - esim:    question -> consent_request -> final (critical, talk to a person)
 * - bill:    final straight away (no risk, benign control)
 * - ceo:     question -> final (the answer changes if money was already paid)
 * - default: question -> final (changes if the user typed something on the page)
 * Put "#error" in the first message to see the error state (503).
 */
import {
  ApiError,
  type Answer,
  type Handoff,
  type Health,
  type Language,
  type Scenario,
  type Session,
  type StartInput,
  type Turn,
} from "./api";

type Flow = "esim" | "bill" | "ceo" | "default";
type MockSession = {
  flow: Flow;
  language: Language;
  message: string;
  step: number;
  turnsUsed: number;
  consent: boolean | null;
  saidYes: boolean;
  final: Answer | null;
};

const MAX_TURNS = 4;
const sessions = new Map<string, MockSession>();

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const thinking = () => wait(900 + Math.random() * 900);

type Copy = { en: string; fi: string; sv?: string };
const pick = (copy: Copy, lang: Language) => (lang === "sv" ? (copy.sv ?? copy.en) : copy[lang]);
const pickList = (copy: { en: string[]; fi: string[]; sv?: string[] }, lang: Language) =>
  lang === "sv" ? (copy.sv ?? copy.en) : copy[lang];

const SCENARIOS: Scenario[] = [
  {
    id: "mock-esim-en",
    journey: "account_change",
    journey_label: "Change on my subscription",
    audience: "consumer",
    language: "en",
    title: "My phone lost signal after I read out a code",
    opening_message:
      "Someone called saying they were from DNA and asked me to read out a code from a text message to keep my number. Now my phone has no signal and the app says my eSIM was moved to a new device.",
  },
  {
    id: "mock-esim-fi",
    journey: "account_change",
    journey_label: "Muutos liittymässä",
    audience: "consumer",
    language: "fi",
    title: "eSIM siirtyi uuteen laitteeseen",
    opening_message:
      "Joku soitti DNA:n nimissä ja pyysi lukemaan tekstiviestillä tulleen koodin. Nyt puhelimessa ei ole kenttää ja sovellus sanoo, että eSIM on siirretty uuteen laitteeseen.",
  },
  {
    id: "mock-bill-en",
    journey: "suspicious_message",
    journey_label: "Suspicious message",
    audience: "consumer",
    language: "en",
    title: "Text saying my new bill is ready",
    opening_message:
      "I got a text from DNA saying my new bill is ready and I can see it in the app. There is no link. Is it real?",
  },
  {
    id: "mock-bill-sv",
    journey: "suspicious_message",
    journey_label: "Misstänkt meddelande",
    audience: "consumer",
    language: "sv",
    title: "Sms om att fakturan är klar",
    opening_message:
      "Jag fick ett sms från DNA om att fakturan är klar och finns i appen. Det finns ingen länk. Är det äkta?",
  },
  {
    id: "mock-parcel-fi",
    journey: "suspicious_message",
    journey_label: "Epäilyttävä viesti",
    audience: "consumer",
    language: "fi",
    title: "Pakettiviesti ja tullimaksu",
    opening_message:
      "Sain tekstiviestin, että pakettini on jumissa tullissa ja minun pitää maksaa 2,99 € linkin kautta tänään.",
  },
  {
    id: "mock-ceo-en",
    journey: "business_fraud",
    journey_label: "Payment request",
    audience: "small_business",
    language: "en",
    title: "Urgent payment request from the CEO",
    opening_message:
      "Our accountant got an email from our CEO asking her to pay a 9,800 € invoice to a new supplier today and keep it quiet. The CEO is travelling.",
  },
  {
    id: "mock-ceo-fi",
    journey: "business_fraud",
    journey_label: "Maksupyyntö",
    audience: "small_business",
    language: "fi",
    title: "Toimitusjohtajan kiireellinen maksupyyntö",
    opening_message:
      "Kirjanpitäjämme sai toimitusjohtajalta sähköpostin, jossa pyydetään maksamaan 9 800 € lasku uudelle toimittajalle vielä tänään ja pitämään asia omana tietona.",
  },
  {
    id: "mock-bank-sms-fi",
    journey: "suspicious_message",
    journey_label: "Epäilyttävä viesti",
    audience: "small_business",
    language: "fi",
    title: "Pankki: verkkopankkisi on suljettu",
    opening_message:
      "Yrityksen puhelimeen tuli pankin nimissä viesti, että verkkopankki on suljettu ja henkilöllisyys pitää vahvistaa linkistä tänään.",
  },
];

function detectFlow(input: StartInput): Flow {
  const id = input.scenario_id ?? "";
  if (id.startsWith("mock-esim")) return "esim";
  if (id.startsWith("mock-bill")) return "bill";
  if (id.startsWith("mock-ceo")) return "ceo";
  const text = input.message.toLowerCase();
  if (/\be?sim\b|esim|koodi|\bcode\b|\bkod\b/.test(text)) return "esim";
  if (/bill is ready|new bill|lasku on valmis|uusi lasku|fakturan är klar|ny faktura/.test(text))
    return "bill";
  if (/\bceo\b|toimitusjohtaja|\bvd\b|invoice|supplier|toimittaja|leverantör/.test(text))
    return "ceo";
  return "default";
}

const YES =
  /\b(yes|yeah|yep|i did|we did|already|kyllä|joo|juu|jo|maksoin|maksettiin|ja|jag gjorde)\b|paid|betal/i;

function session(id: string): MockSession {
  const s = sessions.get(id);
  if (!s) throw new ApiError(404, "Session not found or expired");
  return s;
}

function out(id: string, s: MockSession, turn: Turn): Session {
  s.turnsUsed += 1;
  if (turn.type === "final") s.final = turn.answer;
  return { session_id: id, turn, turns_used: s.turnsUsed, max_turns: MAX_TURNS };
}

// ---------- eSIM moved after a code was read out ----------

const esimQuestion: Copy = {
  en: "Did you read out or type a code from a text message to anyone in the last 24 hours?",
  fi: "Luitko tai kirjoititko jollekulle tekstiviestillä tulleen koodin viimeisen vuorokauden aikana?",
};

const esimConsent: Copy = {
  en: "To see whether your number has been moved, I would like to check two things on your DNA account. I only use them in this conversation. You will get advice either way.",
  fi: "Jotta näen, onko numerosi siirretty, haluaisin tarkistaa kaksi asiaa DNA-tililtäsi. Käytän niitä vain tässä keskustelussa. Saat neuvon joka tapauksessa.",
};

const esimFields = {
  en: [
    {
      path: "subscription.recent_events",
      label: "Recent SIM and eSIM changes on your subscription",
    },
    { path: "operator_account.recent_logins", label: "Recent logins to your DNA account" },
  ],
  fi: [
    {
      path: "subscription.recent_events",
      label: "Liittymäsi viimeaikaiset SIM- ja eSIM-muutokset",
    },
    { path: "operator_account.recent_logins", label: "Viimeaikaiset kirjautumiset DNA-tilillesi" },
  ],
};

function esimFinal(lang: Language, granted: boolean): Answer {
  const checked: Copy = granted
    ? {
        en: "Your account shows your eSIM was moved to a new device 40 minutes ago, from a login you did not make. Someone is very likely using your number to receive your bank codes.",
        fi: "Tililläsi näkyy, että eSIM siirrettiin uuteen laitteeseen 40 minuuttia sitten kirjautumisesta, jota et tehnyt. Joku käyttää todennäköisesti numeroasi vastaanottaakseen pankkikoodisi.",
      }
    : {
        en: "I did not look at your account, so I cannot confirm it. But a code read out to a caller followed by lost signal is the typical sign that someone has moved your number to their own phone.",
        fi: "En katsonut tiliäsi, joten en voi varmistaa tätä. Puhelimessa luettu koodi ja sen jälkeen kadonnut kenttä ovat kuitenkin tyypillinen merkki siitä, että joku on siirtänyt numerosi omaan puhelimeensa.",
      };
  return {
    risk_level: "critical",
    urgency: "immediate",
    primary_action: "contact_operator_support",
    action_label: pick(
      {
        en: "Call DNA customer service now to stop the eSIM change",
        fi: "Soita heti DNA:n asiakaspalveluun ja pysäytä eSIM-siirto",
      },
      lang,
    ),
    advice_text: pick(checked, lang),
    steps: pickList(
      {
        en: [
          "Call DNA customer service from another phone and say your eSIM was moved without your permission.",
          "Call your bank and ask them to block online banking and cards until your number is back.",
          "Do not read out or type any more codes, even if the caller says it is to fix the problem.",
          "When your number works again, change your email password and turn on two-step login.",
        ],
        fi: [
          "Soita DNA:n asiakaspalveluun toisesta puhelimesta ja kerro, että eSIM siirrettiin ilman lupaasi.",
          "Soita pankkiisi ja pyydä sulkemaan verkkopankki ja kortit, kunnes numerosi on taas sinulla.",
          "Älä lue tai kirjoita enää yhtään koodia, vaikka soittaja sanoisi sen korjaavan ongelman.",
          "Kun numero toimii taas, vaihda sähköpostisi salasana ja ota kaksivaiheinen kirjautuminen käyttöön.",
        ],
      },
      lang,
    ),
    escalation_required: true,
    escalation_target: "operator_support_agent",
    escalation_label: pick(
      { en: "DNA customer service (SIM and eSIM)", fi: "DNA:n asiakaspalvelu (SIM ja eSIM)" },
      lang,
    ),
    citations: [
      {
        id: "guidance_sim_swap",
        title: pick(
          {
            en: "SIM and eSIM changes you did not ask for",
            fi: "SIM- ja eSIM-muutokset, joita et pyytänyt",
          },
          lang,
        ),
      },
      {
        id: "guidance_one_time_codes",
        title: pick(
          { en: "One-time codes and PINs", fi: "Kertakäyttöiset koodit ja tunnusluvut" },
          lang,
        ),
      },
    ],
    confidence: granted ? 0.93 : 0.74,
  };
}

// ---------- Benign: "your bill is ready" ----------

function billFinal(lang: Language): Answer {
  return {
    risk_level: "none",
    urgency: "none",
    primary_action: "no_action_needed",
    action_label: pick(
      {
        en: "This looks like a normal bill notice. You do not need to do anything.",
        fi: "Tämä näyttää tavalliselta laskuilmoitukselta. Sinun ei tarvitse tehdä mitään.",
        sv: "Det här ser ut som ett vanligt fakturameddelande. Du behöver inte göra något.",
      },
      lang,
    ),
    advice_text: pick(
      {
        en: "The message has no link, asks for nothing and tells you to look in the app you already use. That is how genuine notices look.",
        fi: "Viestissä ei ole linkkiä, se ei pyydä mitään ja ohjaa katsomaan sovelluksesta, jota jo käytät. Juuri tältä aidot ilmoitukset näyttävät.",
        sv: "Meddelandet har ingen länk, ber inte om något och hänvisar till appen du redan använder. Så ser äkta meddelanden ut.",
      },
      lang,
    ),
    steps: pickList(
      {
        en: ["If you want to be sure, open the DNA app yourself and check the bill there."],
        fi: ["Jos haluat varmistua, avaa DNA-sovellus itse ja katso lasku sieltä."],
        sv: ["Om du vill vara säker, öppna DNA-appen själv och titta på fakturan där."],
      },
      lang,
    ),
    escalation_required: false,
    escalation_target: null,
    escalation_label: null,
    citations: [
      {
        id: "guidance_legitimate_notifications",
        title: pick(
          {
            en: "What a genuine notification looks like",
            fi: "Miltä aito ilmoitus näyttää",
            sv: "Hur ett äkta meddelande ser ut",
          },
          lang,
        ),
      },
    ],
    confidence: 0.88,
  };
}

// ---------- Small business: CEO fraud ----------

const ceoQuestion: Copy = {
  en: "Has any money been paid to the new account yet?",
  fi: "Onko uudelle tilille jo maksettu rahaa?",
};

function ceoFinal(lang: Language, paid: boolean): Answer {
  const citations = [
    {
      id: "guidance_ceo_fraud",
      title: pick(
        {
          en: "Payment requests that claim to come from a manager",
          fi: "Esihenkilön nimissä tulevat maksupyynnöt",
        },
        lang,
      ),
    },
    {
      id: "guidance_payment_verification",
      title: pick(
        {
          en: "Verifying a payment or bank detail change",
          fi: "Maksun tai tilinumeron muutoksen varmistaminen",
        },
        lang,
      ),
    },
  ];
  if (paid) {
    return {
      risk_level: "critical",
      urgency: "immediate",
      primary_action: "contact_bank_and_block_cards",
      action_label: pick(
        {
          en: "Call your bank now and ask them to stop the payment",
          fi: "Soita heti pankkiin ja pyydä pysäyttämään maksu",
        },
        lang,
      ),
      advice_text: pick(
        {
          en: "A secret, urgent payment to a new supplier is the classic pattern of CEO fraud. Banks can sometimes stop a transfer if they hear about it within hours.",
          fi: "Salainen ja kiireellinen maksu uudelle toimittajalle on toimitusjohtajahuijauksen tyypillinen kuvio. Pankki voi joskus pysäyttää siirron, jos se saa tiedon muutamassa tunnissa.",
        },
        lang,
      ),
      steps: pickList(
        {
          en: [
            "Call your bank's business line and ask them to recall the payment. Have the amount, date and receiving account ready.",
            "Call the CEO on a number you already have, not one from the email, to confirm.",
            "Report the crime to the police and keep the email as evidence.",
          ],
          fi: [
            "Soita pankin yritysasiakkaiden numeroon ja pyydä perumaan maksu. Pidä summa, päivämäärä ja vastaanottajan tili käsillä.",
            "Soita toimitusjohtajalle numeroon, jonka jo tiedät, älä sähköpostissa olevaan.",
            "Tee rikosilmoitus poliisille ja säilytä sähköposti todisteena.",
          ],
        },
        lang,
      ),
      escalation_required: true,
      escalation_target: "business_security_support",
      escalation_label: pick(
        { en: "DNA business security support", fi: "DNA:n yritysasiakkaiden tietoturvatuki" },
        lang,
      ),
      citations,
      confidence: 0.86,
    };
  }
  return {
    risk_level: "high",
    urgency: "today",
    primary_action: "verify_via_official_channel",
    action_label: pick(
      {
        en: "Do not pay. Call the CEO on a number you already know.",
        fi: "Älä maksa. Soita toimitusjohtajalle numeroon, jonka jo tiedät.",
      },
      lang,
    ),
    advice_text: pick(
      {
        en: "Urgency, secrecy and a new bank account together are the warning signs of CEO fraud. A real request will still be real after a two-minute phone call.",
        fi: "Kiire, salailu ja uusi tilinumero yhdessä ovat toimitusjohtajahuijauksen varoitusmerkit. Aito pyyntö on yhä aito kahden minuutin puhelun jälkeen.",
      },
      lang,
    ),
    steps: pickList(
      {
        en: [
          "Do not reply to the email and do not make the payment.",
          "Call the CEO on a number from your own contacts and ask about the invoice.",
          "Agree that new payment details are always confirmed by phone by two people.",
        ],
        fi: [
          "Älä vastaa sähköpostiin äläkä tee maksua.",
          "Soita toimitusjohtajalle omista yhteystiedoistasi löytyvään numeroon ja kysy laskusta.",
          "Sopikaa, että uudet maksutiedot vahvistetaan aina puhelimitse kahden ihmisen kesken.",
        ],
      },
      lang,
    ),
    escalation_required: false,
    escalation_target: null,
    escalation_label: null,
    citations,
    confidence: 0.82,
  };
}

// ---------- Default: suspicious message with a link ----------

const defaultQuestion: Copy = {
  en: "Did you open the link, or type anything on the page it showed?",
  fi: "Avasitko linkin tai kirjoititko jotain sivulle, joka aukesi?",
};

function defaultFinal(lang: Language, typed: boolean): Answer {
  const citations = [
    {
      id: "guidance_smishing_basics",
      title: pick({ en: "Recognising a scam message", fi: "Huijausviestin tunnistaminen" }, lang),
    },
  ];
  if (typed) {
    return {
      risk_level: "high",
      urgency: "today",
      primary_action: "change_password_and_enable_mfa",
      action_label: pick(
        {
          en: "Change the password you typed in, today",
          fi: "Vaihda syöttämäsi salasana vielä tänään",
        },
        lang,
      ),
      advice_text: pick(
        {
          en: "If you typed login details on a page opened from a message, assume someone else now has them. Changing the password quickly makes them useless.",
          fi: "Jos kirjoitit tunnuksia viestin kautta auenneelle sivulle, oleta että joku muu tietää ne nyt. Nopea salasanan vaihto tekee niistä hyödyttömiä.",
        },
        lang,
      ),
      steps: pickList(
        {
          en: [
            "Open the service's own app or type its address yourself, and change the password.",
            "Use the same new password nowhere else.",
            "Turn on two-step login if the service offers it.",
            "If you typed card details, call your bank and block the card.",
          ],
          fi: [
            "Avaa palvelun oma sovellus tai kirjoita sen osoite itse ja vaihda salasana.",
            "Älä käytä uutta salasanaa missään muualla.",
            "Ota kaksivaiheinen kirjautuminen käyttöön, jos palvelu tarjoaa sitä.",
            "Jos syötit korttitietoja, soita pankkiin ja sulje kortti.",
          ],
        },
        lang,
      ),
      escalation_required: false,
      escalation_target: null,
      escalation_label: null,
      citations: [
        ...citations,
        {
          id: "guidance_credential_compromise",
          title: pick(
            { en: "After credentials have been disclosed", fi: "Kun tunnukset ovat paljastuneet" },
            lang,
          ),
        },
      ],
      confidence: 0.78,
    };
  }
  return {
    risk_level: "medium",
    urgency: "routine",
    primary_action: "do_not_interact_and_delete",
    action_label: pick(
      {
        en: "Do not open the link. Delete the message.",
        fi: "Älä avaa linkkiä. Poista viesti.",
      },
      lang,
    ),
    advice_text: pick(
      {
        en: "A message that asks you to act quickly through a link is a common scam. Since you have not typed anything, nothing has been lost.",
        fi: "Viesti, joka kehottaa toimimaan nopeasti linkin kautta, on yleinen huijaus. Koska et kirjoittanut mitään, mitään ei ole menetetty.",
      },
      lang,
    ),
    steps: pickList(
      {
        en: [
          "Do not reply and do not open the link.",
          "If you are unsure, check the matter in the organisation's own app.",
          "Delete the message.",
        ],
        fi: [
          "Älä vastaa äläkä avaa linkkiä.",
          "Jos olet epävarma, tarkista asia organisaation omasta sovelluksesta.",
          "Poista viesti.",
        ],
      },
      lang,
    ),
    escalation_required: false,
    escalation_target: null,
    escalation_label: null,
    citations,
    confidence: 0.8,
  };
}

// ---------- Endpoints ----------

export async function mockScenarios(): Promise<Scenario[]> {
  await wait(250);
  return SCENARIOS;
}

export async function mockStart(input: StartInput): Promise<Session> {
  await thinking();
  if (input.message.includes("#error")) {
    throw new ApiError(503, "The assistant is temporarily unavailable (mock)");
  }
  const id = `mock-${Math.random().toString(36).slice(2, 10)}`;
  const s: MockSession = {
    flow: detectFlow(input),
    language: input.language,
    message: input.message,
    step: 0,
    turnsUsed: 0,
    consent: null,
    saidYes: false,
    final: null,
  };
  sessions.set(id, s);
  const lang = s.language;
  switch (s.flow) {
    case "bill":
      return out(id, s, { type: "final", answer: billFinal(lang) });
    case "esim":
      return out(id, s, {
        type: "question",
        text: pick(esimQuestion, lang),
        topics: ["code_shared"],
      });
    case "ceo":
      return out(id, s, {
        type: "question",
        text: pick(ceoQuestion, lang),
        topics: ["money_sent"],
      });
    default:
      return out(id, s, {
        type: "question",
        text: pick(defaultQuestion, lang),
        topics: ["credentials_entered"],
      });
  }
}

export async function mockReply(id: string, text: string): Promise<Session> {
  await thinking();
  const s = session(id);
  if (s.final) throw new ApiError(409, "This conversation already has an answer");
  s.saidYes = YES.test(text);
  s.step += 1;
  const lang = s.language;
  switch (s.flow) {
    case "esim":
      return out(id, s, {
        type: "consent_request",
        text: pick(esimConsent, lang),
        fields: lang === "fi" ? esimFields.fi : esimFields.en,
      });
    case "ceo":
      return out(id, s, { type: "final", answer: ceoFinal(lang, s.saidYes) });
    default:
      return out(id, s, { type: "final", answer: defaultFinal(lang, s.saidYes) });
  }
}

export async function mockConsent(id: string, granted: boolean): Promise<Session> {
  await thinking();
  const s = session(id);
  s.consent = granted;
  return out(id, s, { type: "final", answer: esimFinal(s.language, granted) });
}

export async function mockHandoff(id: string): Promise<Handoff> {
  await thinking();
  const s = session(id);
  const reference = `DSA-${Math.floor(100000 + Math.random() * 900000)}`;
  const lang = s.language;
  const action = s.final?.action_label ?? "";
  const consentLine =
    s.consent === null
      ? ""
      : s.consent
        ? pick({ en: " Account check allowed.", fi: " Tilin tarkistus sallittu." }, lang)
        : pick({ en: " Account check declined.", fi: " Tilin tarkistuksesta kieltäydytty." }, lang);
  const summary = pick(
    {
      en: `Customer reports: "${s.message}" Assistant's advice so far: ${action}.${consentLine}`,
      fi: `Asiakas kertoo: "${s.message}" Avustajan neuvo tähän asti: ${action}.${consentLine}`,
    },
    lang,
  );
  return { reference, summary };
}

export async function mockHealth(): Promise<Health> {
  return {
    status: "mock",
    simset_version: "2.0.1",
    guidance_passages: 55,
    claude_configured: false,
    mongodb_configured: false,
  };
}
