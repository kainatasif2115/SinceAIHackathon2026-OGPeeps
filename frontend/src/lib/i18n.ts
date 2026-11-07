/**
 * All UI strings in Finnish, English and Swedish. The assistant's own answers
 * come from the backend in the conversation language; these strings are only
 * the interface around them.
 */
import type { Audience, Language, RiskLevel, Urgency } from "./api";

const en = {
  productName: "Security assistant",
  skipToContent: "Skip to content",
  prototypeNote: "Prototype – synthetic data, not real DNA advice.",
  closePanel: "Close security assistant",
  expandPanel: "Open full screen",
  collapsePanel: "Exit full screen",
  audienceLegend: "Who is this for?",
  audience: { consumer: "Consumer", small_business: "Small business" } satisfies Record<
    Audience,
    string
  >,
  audienceLocked: "Start over to change this.",
  languageLegend: "Language",
  languageNames: { fi: "Suomi", en: "English", sv: "Svenska" } satisfies Record<Language, string>,

  startHeading: "What happened?",
  startIntro:
    "Tell me about the message, call or change that worries you. I may ask one or two questions, then give you one clear next step.",
  startPlaceholder: "For example: I got a text saying my parcel is stuck in customs…",
  privacyStored: "We keep this conversation for 24 hours, then delete it.",
  privacyNoSecrets: "Never type passwords, card numbers or codes here.",
  send: "Send",
  sendHint: "Enter to send, Shift + Enter for a new line",
  voiceStart: "Speak instead of typing",
  voiceStop: "Stop listening",
  voiceListening: "Listening… speak now. Press the microphone again when you’re done.",
  voiceDenied: "Microphone access is blocked. Allow it in your browser, or type instead.",
  voiceNoSpeech: "I didn’t hear anything. Try again or type instead.",
  voiceUnavailable: "Voice input isn’t working in this browser right now. Please type instead.",
  attachImage: "Add a screenshot",
  removeImage: (name: string) => `Remove ${name}`,
  screenshotAlt: (n: number) => `Screenshot ${n}`,
  imageHint: "Cover any codes or card numbers before you share a screenshot.",
  imageTooMany: (max: number) => `You can add up to ${max} screenshots.`,
  imageUnreadable: "That file couldn’t be read as an image. Try a PNG or JPEG screenshot.",
  imageTooBig: "That image is too large (over 20 MB).",
  dropHere: "Drop the screenshot here",
  emptyError: "Write a few words about what happened.",
  tooLong: (max: number) => `Please keep it under ${max} characters.`,
  usingExample: "Using example:",
  clearExample: "Remove example",

  examplesHeading: "Or try an example",
  examplesLoading: "Loading examples…",
  examplesError: "Examples could not be loaded. You can still describe your own situation.",
  examplesEmpty: "No examples for this group yet.",
  showMore: (n: number) => `Show ${n} more`,
  exampleLanguage: (lang: string) => `Written in ${lang}`,

  you: "You",
  assistant: "Assistant",
  turnCounter: (used: number, max: number) => `Turn ${used} of ${max}`,
  startOver: "Start over",
  answerLabel: "Your answer",
  answerPlaceholder: "Type your answer…",
  thinking: "Thinking…",
  thinkingSlow: "Still working on it. This can take up to 20 seconds.",

  consentHeading: "Can I check this?",
  consentWhat: "What I would look at",
  consentReassure:
    "Only used for this conversation. Saying no is fine: you still get advice, it may just be less certain.",
  allow: "Allow",
  notNow: "Not now",
  consentAllowed: "You allowed me to check this.",
  consentDeclined: "You chose not now. I did not look at it.",

  riskHeading: "Risk",
  urgencyLabel: "When",
  whatToDo: "What to do",
  whyHeading: "Where this advice comes from",
  readAloud: "Read aloud",
  copy: "Copy",
  copied: "Copied",
  copyFailed: "Couldn’t copy",
  readAloudStop: "Stop reading",
  readAloudLoading: "Preparing audio…",
  readAloudError: "Reading aloud isn’t working right now.",
  sourcesNote:
    "These are the hackathon organisers' synthetic guidance texts, not official DNA or authority advice.",
  confidence: (c: number): string =>
    c >= 0.8
      ? "I am fairly sure about this."
      : c >= 0.6
        ? "I am somewhat sure. If anything does not match your situation, talk to a person."
        : "I am not sure. Please talk to a person before acting.",

  escalationHeading: "This needs a person",
  escalationBody: (who: string | null) =>
    who
      ? `This is best handled by a person: ${who}.`
      : "This is best handled together with a person who can act on your account.",
  talkToPerson: "Talk to a person",
  handoffLoading: "Connecting…",
  handoffDone: "A person will take over",
  handoffReference: "Your reference",
  handoffSummary: "This is what we will pass on",
  handoffError: "We could not reach customer service from here.",

  errorHeading: "Something went wrong",
  errorNetwork: "We could not reach the service. Check your connection and try again.",
  errorBusy: "The service is busy or unavailable right now.",
  errorServer: "Something went wrong on our side.",
  errorExpired: "This conversation has expired. Please start over.",
  errorUnexpected: "The service sent an answer we could not read.",
  retry: "Try again",
  urgentFallback: "If this is urgent, call your bank or the operator's customer service directly.",

  statusChecking: "Checking service…",
  statusOk: (version: string) => `Service connected · SimSet ${version}`,
  statusMock: "Demo mode: canned answers, no backend",
  statusDown: "Service not reachable",

  risk: {
    none: "No risk found",
    low: "Low risk",
    medium: "Medium risk",
    high: "High risk",
    critical: "Critical risk",
  } satisfies Record<RiskLevel, string>,
  urgency: {
    none: "Nothing to do",
    routine: "When you have time",
    today: "Today",
    immediate: "Right now",
  } satisfies Record<Urgency, string>,
};

export type Dictionary = typeof en;

const fi: Dictionary = {
  productName: "Tietoturva-avustaja",
  skipToContent: "Siirry sisältöön",
  prototypeNote: "Prototyyppi – keksittyä dataa, ei oikeaa DNA:n neuvontaa.",
  closePanel: "Sulje turva-avustaja",
  expandPanel: "Avaa koko näytölle",
  collapsePanel: "Poistu koko näytöstä",
  audienceLegend: "Kenelle?",
  audience: { consumer: "Kuluttaja", small_business: "Pienyritys" },
  audienceLocked: "Aloita alusta vaihtaaksesi tämän.",
  languageLegend: "Kieli",
  languageNames: { fi: "Suomi", en: "English", sv: "Svenska" },

  startHeading: "Mitä tapahtui?",
  startIntro:
    "Kerro viestistä, puhelusta tai muutoksesta, joka huolestuttaa. Voin kysyä yhden tai kaksi kysymystä ja annan sitten yhden selkeän seuraavan askeleen.",
  startPlaceholder: "Esimerkiksi: Sain viestin, että pakettini on jumissa tullissa…",
  privacyStored: "Säilytämme tämän keskustelun 24 tuntia ja poistamme sen sitten.",
  privacyNoSecrets: "Älä koskaan kirjoita tähän salasanoja, korttinumeroita tai koodeja.",
  send: "Lähetä",
  sendHint: "Enter lähettää, Shift + Enter tekee uuden rivin",
  voiceStart: "Puhu kirjoittamisen sijaan",
  voiceStop: "Lopeta kuuntelu",
  voiceListening: "Kuuntelen… puhu nyt. Paina mikrofonia uudelleen, kun olet valmis.",
  voiceDenied: "Mikrofonin käyttö on estetty. Salli se selaimessa tai kirjoita viesti.",
  voiceNoSpeech: "En kuullut mitään. Yritä uudelleen tai kirjoita viesti.",
  voiceUnavailable: "Puheentunnistus ei nyt toimi tässä selaimessa. Kirjoita viesti.",
  attachImage: "Lisää kuvakaappaus",
  removeImage: (name: string) => `Poista ${name}`,
  screenshotAlt: (n: number) => `Kuvakaappaus ${n}`,
  imageHint: "Peitä koodit ja korttinumerot ennen kuin jaat kuvakaappauksen.",
  imageTooMany: (max: number) => `Voit lisätä enintään ${max} kuvakaappausta.`,
  imageUnreadable: "Tiedostoa ei voitu lukea kuvana. Kokeile PNG- tai JPEG-kuvakaappausta.",
  imageTooBig: "Kuva on liian suuri (yli 20 Mt).",
  dropHere: "Pudota kuvakaappaus tähän",
  emptyError: "Kirjoita muutama sana siitä, mitä tapahtui.",
  tooLong: (max) => `Pidä viesti alle ${max} merkissä.`,
  usingExample: "Esimerkki:",
  clearExample: "Poista esimerkki",

  examplesHeading: "Tai kokeile esimerkkiä",
  examplesLoading: "Ladataan esimerkkejä…",
  examplesError: "Esimerkkejä ei voitu ladata. Voit silti kertoa oman tilanteesi.",
  examplesEmpty: "Tälle ryhmälle ei ole vielä esimerkkejä.",
  showMore: (n) => `Näytä ${n} lisää`,
  exampleLanguage: (lang) => `Kieli: ${lang}`,

  you: "Sinä",
  assistant: "Avustaja",
  turnCounter: (used, max) => `Vaihe ${used}/${max}`,
  startOver: "Aloita alusta",
  answerLabel: "Vastauksesi",
  answerPlaceholder: "Kirjoita vastauksesi…",
  thinking: "Mietitään…",
  thinkingSlow: "Vielä hetki. Tämä voi kestää jopa 20 sekuntia.",

  consentHeading: "Saanko tarkistaa tämän?",
  consentWhat: "Mitä katsoisin",
  consentReassure:
    "Käytetään vain tässä keskustelussa. Voit hyvin kieltäytyä: saat silti neuvon, se voi vain olla epävarmempi.",
  allow: "Salli",
  notNow: "Ei nyt",
  consentAllowed: "Annoit luvan tarkistaa tämän.",
  consentDeclined: "Valitsit ”Ei nyt”. En katsonut tietoja.",

  riskHeading: "Riski",
  urgencyLabel: "Milloin",
  whatToDo: "Mitä tehdä",
  whyHeading: "Mihin neuvo perustuu",
  readAloud: "Lue ääneen",
  copy: "Kopioi",
  copied: "Kopioitu",
  copyFailed: "Kopiointi ei onnistunut",
  readAloudStop: "Lopeta lukeminen",
  readAloudLoading: "Valmistellaan ääntä…",
  readAloudError: "Ääneen lukeminen ei nyt toimi.",
  sourcesNote:
    "Nämä ovat hackathonin järjestäjien keksittyjä ohjetekstejä, eivät DNA:n tai viranomaisten virallisia ohjeita.",
  confidence: (c) =>
    c >= 0.8
      ? "Olen tästä melko varma."
      : c >= 0.6
        ? "Olen jokseenkin varma. Jos jokin ei vastaa tilannettasi, puhu ihmisen kanssa."
        : "En ole varma. Puhu ihmisen kanssa ennen kuin toimit.",

  escalationHeading: "Tähän tarvitaan ihminen",
  escalationBody: (who) =>
    who
      ? `Tämä hoituu parhaiten ihmisen kanssa: ${who}.`
      : "Tämä hoituu parhaiten ihmisen kanssa, joka voi toimia tililläsi.",
  talkToPerson: "Puhu ihmisen kanssa",
  handoffLoading: "Yhdistetään…",
  handoffDone: "Ihminen jatkaa tästä",
  handoffReference: "Viitteesi",
  handoffSummary: "Tämän välitämme eteenpäin",
  handoffError: "Emme saaneet yhteyttä asiakaspalveluun täältä.",

  errorHeading: "Jokin meni pieleen",
  errorNetwork: "Palveluun ei saatu yhteyttä. Tarkista yhteys ja yritä uudelleen.",
  errorBusy: "Palvelu on juuri nyt ruuhkautunut tai poissa käytöstä.",
  errorServer: "Meidän päässämme tapahtui virhe.",
  errorExpired: "Tämä keskustelu on vanhentunut. Aloita alusta.",
  errorUnexpected: "Palvelu lähetti vastauksen, jota emme osanneet lukea.",
  retry: "Yritä uudelleen",
  urgentFallback:
    "Jos asia on kiireellinen, soita suoraan pankkiisi tai operaattorin asiakaspalveluun.",

  statusChecking: "Tarkistetaan palvelua…",
  statusOk: (version) => `Palvelu yhdistetty · SimSet ${version}`,
  statusMock: "Demotila: valmiit vastaukset, ei taustapalvelua",
  statusDown: "Palveluun ei saada yhteyttä",

  risk: {
    none: "Ei havaittua riskiä",
    low: "Pieni riski",
    medium: "Kohtalainen riski",
    high: "Suuri riski",
    critical: "Vakava riski",
  },
  urgency: {
    none: "Ei toimenpiteitä",
    routine: "Kun ehdit",
    today: "Tänään",
    immediate: "Heti",
  },
};

const sv: Dictionary = {
  productName: "Säkerhetsassistent",
  skipToContent: "Hoppa till innehållet",
  prototypeNote: "Prototyp – syntetiska data, inte riktiga råd från DNA.",
  closePanel: "Stäng säkerhetsassistenten",
  expandPanel: "Öppna i helskärm",
  collapsePanel: "Lämna helskärm",
  audienceLegend: "För vem?",
  audience: { consumer: "Privatperson", small_business: "Litet företag" },
  audienceLocked: "Börja om för att ändra detta.",
  languageLegend: "Språk",
  languageNames: { fi: "Suomi", en: "English", sv: "Svenska" },

  startHeading: "Vad hände?",
  startIntro:
    "Berätta om meddelandet, samtalet eller ändringen som oroar dig. Jag kan ställa en eller två frågor och ger dig sedan ett tydligt nästa steg.",
  startPlaceholder: "Till exempel: Jag fick ett sms om att mitt paket har fastnat i tullen…",
  privacyStored: "Vi sparar samtalet i 24 timmar och raderar det sedan.",
  privacyNoSecrets: "Skriv aldrig lösenord, kortnummer eller koder här.",
  send: "Skicka",
  sendHint: "Enter skickar, Shift + Enter ger en ny rad",
  voiceStart: "Tala i stället för att skriva",
  voiceStop: "Sluta lyssna",
  voiceListening: "Lyssnar… tala nu. Tryck på mikrofonen igen när du är klar.",
  voiceDenied: "Mikrofonen är blockerad. Tillåt den i webbläsaren eller skriv i stället.",
  voiceNoSpeech: "Jag hörde ingenting. Försök igen eller skriv i stället.",
  voiceUnavailable: "Röstinmatning fungerar inte i den här webbläsaren just nu. Skriv i stället.",
  attachImage: "Lägg till en skärmbild",
  removeImage: (name: string) => `Ta bort ${name}`,
  screenshotAlt: (n: number) => `Skärmbild ${n}`,
  imageHint: "Dölj koder och kortnummer innan du delar en skärmbild.",
  imageTooMany: (max: number) => `Du kan lägga till högst ${max} skärmbilder.`,
  imageUnreadable: "Filen kunde inte läsas som en bild. Prova en PNG- eller JPEG-skärmbild.",
  imageTooBig: "Bilden är för stor (över 20 MB).",
  dropHere: "Släpp skärmbilden här",
  emptyError: "Skriv några ord om vad som hände.",
  tooLong: (max) => `Håll det under ${max} tecken.`,
  usingExample: "Exempel:",
  clearExample: "Ta bort exempel",

  examplesHeading: "Eller prova ett exempel",
  examplesLoading: "Laddar exempel…",
  examplesError: "Exemplen kunde inte laddas. Du kan ändå beskriva din egen situation.",
  examplesEmpty: "Inga exempel för den här gruppen ännu.",
  showMore: (n) => `Visa ${n} till`,
  exampleLanguage: (lang) => `Språk: ${lang}`,

  you: "Du",
  assistant: "Assistent",
  turnCounter: (used, max) => `Steg ${used} av ${max}`,
  startOver: "Börja om",
  answerLabel: "Ditt svar",
  answerPlaceholder: "Skriv ditt svar…",
  thinking: "Tänker…",
  thinkingSlow: "Arbetar fortfarande. Det kan ta upp till 20 sekunder.",

  consentHeading: "Får jag kontrollera detta?",
  consentWhat: "Det här skulle jag titta på",
  consentReassure:
    "Används bara i det här samtalet. Det går bra att säga nej: du får ändå råd, de kan bara vara mindre säkra.",
  allow: "Tillåt",
  notNow: "Inte nu",
  consentAllowed: "Du gav mig lov att kontrollera detta.",
  consentDeclined: "Du valde inte nu. Jag tittade inte på det.",

  riskHeading: "Risk",
  urgencyLabel: "När",
  whatToDo: "Gör så här",
  whyHeading: "Varifrån rådet kommer",
  readAloud: "Läs upp",
  copy: "Kopiera",
  copied: "Kopierat",
  copyFailed: "Kunde inte kopiera",
  readAloudStop: "Sluta läsa",
  readAloudLoading: "Förbereder ljud…",
  readAloudError: "Uppläsning fungerar inte just nu.",
  sourcesNote:
    "Detta är hackathonarrangörernas syntetiska vägledningstexter, inte officiella råd från DNA eller myndigheter.",
  confidence: (c) =>
    c >= 0.8
      ? "Jag är ganska säker på detta."
      : c >= 0.6
        ? "Jag är delvis säker. Om något inte stämmer med din situation, prata med en person."
        : "Jag är inte säker. Prata med en person innan du gör något.",

  escalationHeading: "Det här behöver en person",
  escalationBody: (who) =>
    who
      ? `Det här sköts bäst av en person: ${who}.`
      : "Det här sköts bäst tillsammans med en person som kan hantera ditt konto.",
  talkToPerson: "Prata med en person",
  handoffLoading: "Kopplar…",
  handoffDone: "En person tar över",
  handoffReference: "Ditt referensnummer",
  handoffSummary: "Det här skickar vi vidare",
  handoffError: "Vi nådde inte kundtjänst härifrån.",

  errorHeading: "Något gick fel",
  errorNetwork: "Vi nådde inte tjänsten. Kontrollera anslutningen och försök igen.",
  errorBusy: "Tjänsten är upptagen eller otillgänglig just nu.",
  errorServer: "Något gick fel hos oss.",
  errorExpired: "Samtalet har gått ut. Börja om.",
  errorUnexpected: "Tjänsten skickade ett svar som vi inte kunde läsa.",
  retry: "Försök igen",
  urgentFallback: "Om det är brådskande, ring din bank eller operatörens kundtjänst direkt.",

  statusChecking: "Kontrollerar tjänsten…",
  statusOk: (version) => `Tjänsten ansluten · SimSet ${version}`,
  statusMock: "Demoläge: färdiga svar, ingen backend",
  statusDown: "Tjänsten nås inte",

  risk: {
    none: "Ingen risk hittades",
    low: "Låg risk",
    medium: "Måttlig risk",
    high: "Hög risk",
    critical: "Allvarlig risk",
  },
  urgency: {
    none: "Inget att göra",
    routine: "När du har tid",
    today: "I dag",
    immediate: "Nu direkt",
  },
};

const dictionaries: Record<Language, Dictionary> = { en, fi, sv };

export function getDictionary(lang: Language): Dictionary {
  return dictionaries[lang];
}
