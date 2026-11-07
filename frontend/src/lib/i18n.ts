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
  voiceTranscribing: "Turning your voice into text…",
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
  stepsDone: (done: number, total: number): string =>
    done === total ? `All ${total} done` : `${done} of ${total} done`,
  whyHeading: "Where this advice comes from",
  readAloud: "Read aloud",
  campaignNote: (n: number) =>
    `You’re not the only one: ${n} other customers asked about a very similar message in the last 24 hours.`,
  campaignPrivacy: "We only count similar messages. We don’t keep anyone’s text.",
  copy: "Copy",
  talk: "Talk instead",
  talkShort: "Talk",
  callListening: "Listening… speak now",
  callThinking: "Thinking…",
  callSpeaking: "Speaking…",
  callEnded: "Call ended. Your answer is above.",
  callEnd: "End",
  callGreeting: "Hi, I’m the security assistant. Tell me in your own words what happened.",
  callSayYesNo: "Please say yes to allow it, or no for not now.",
  callNoSpeech: "I didn’t hear anything. Tell me what happened, or press End to type instead.",
  callUnsupported: "Talking needs Chrome, Edge or Safari. You can still type.",

  callError: "Something went wrong. Please type instead, or try again.",
  privacyHeading: "Your data in this conversation",
  privacyUsed: "Used",
  privacyWords: "What you wrote",
  privacyScreenshots: (n: number) =>
    n === 1 ? "1 screenshot you shared" : `${n} screenshots you shared`,
  privacyAllowed: "You allowed",
  privacyDeclined: "You said no to",
  privacyNotUsed: "Not looked at",
  privacyNoAccountData: "Your account and device data",
  privacyOtherData: "Anything else on your account or device",
  privacyNever: "Never asked for: passwords, codes or card numbers.",
  privacyDeletedAt: (when: string) => `Deleted automatically on ${when}.`,
  privacyHandoffNote:
    "If you were connected to a person, they see the summary you saw, for at most 24 hours.",
  privacyDeleteNow: "Delete now",
  privacyDeleting: "Deleting…",
  privacyDeleted: "This conversation has been deleted from our service.",
  privacyDeleteError: "Couldn’t delete right now. It will still be deleted automatically.",
  shareTrusted: "Send to someone I trust",
  shareTeam: "Alert my team",
  shareHeadingTrusted: "Message to someone you trust",
  shareHeadingTeam: "Alert for your team",
  shareDismiss: "Dismiss",
  shareIntroTrusted:
    "Hi! I got something suspicious and checked it with my operator’s security assistant. This is what it advised:",
  shareAskTrusted: "Could you help me with this?",
  shareIntroTeam: "Heads-up, team: we may be the target of a scam. Our security assistant advises:",
  shareAskTeam: "If you got the same message or call, don’t act on it. Tell me right away.",
  shareSubjectTrusted: "Can you help me with this?",
  shareSubjectTeam: "Scam alert",
  shareNote:
    "Check the message before you send it. It doesn’t include anything you typed in the chat.",
  shareVia: "Share…",
  shareEmail: "Email",
  shareSms: "Text message",
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
  talkAnyway: "Talk to a person anyway",
  talkAnywayPrompt: (unsure: boolean): string =>
    unsure
      ? "Not sure about this answer? A person from customer service can look at it with you."
      : "Still uneasy? You can ask a person to look at it, even if nothing needs doing.",
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
  voiceTranscribing: "Muutan puheesi tekstiksi…",
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
  stepsDone: (done, total) => (done === total ? `Kaikki ${total} tehty` : `${done}/${total} tehty`),
  whyHeading: "Mihin neuvo perustuu",
  readAloud: "Lue ääneen",
  campaignNote: (n: number) =>
    `Et ole ainoa: ${n} muuta asiakasta kysyi hyvin samankaltaisesta viestistä viimeisen vuorokauden aikana.`,
  campaignPrivacy: "Laskemme vain samankaltaiset viestit. Emme säilytä kenenkään tekstiä.",
  copy: "Kopioi",
  talk: "Puhu mieluummin",
  talkShort: "Puhu",
  callListening: "Kuuntelen… puhu nyt",
  callThinking: "Mietin…",
  callSpeaking: "Puhun…",
  callEnded: "Puhelu päättyi. Vastaus on yllä.",
  callEnd: "Lopeta",
  callGreeting: "Hei, olen turva-avustaja. Kerro omin sanoin, mitä tapahtui.",
  callSayYesNo: "Sano kyllä, jos sallit sen, tai ei, jos et nyt.",
  callNoSpeech: "En kuullut mitään. Kerro, mitä tapahtui, tai paina Lopeta ja kirjoita.",
  callUnsupported: "Puhuminen vaatii Chrome-, Edge- tai Safari-selaimen. Voit silti kirjoittaa.",

  callError: "Jokin meni vikaan. Kirjoita viesti tai yritä uudelleen.",
  privacyHeading: "Tietosi tässä keskustelussa",
  privacyUsed: "Käytetty",
  privacyWords: "Mitä kirjoitit",
  privacyScreenshots: (n: number) =>
    n === 1 ? "1 jakamasi kuvakaappaus" : `${n} jakamaasi kuvakaappausta`,
  privacyAllowed: "Sallit",
  privacyDeclined: "Kielsit",
  privacyNotUsed: "Ei katsottu",
  privacyNoAccountData: "Tilisi ja laitteesi tiedot",
  privacyOtherData: "Muut tilisi tai laitteesi tiedot",
  privacyNever: "Emme pyytäneet salasanoja, koodeja tai korttinumeroita.",
  privacyDeletedAt: (when: string) => `Poistetaan automaattisesti ${when}.`,
  privacyHandoffNote:
    "Jos yhdistimme sinut ihmiselle, hän näkee saman yhteenvedon kuin sinä, enintään 24 tuntia.",
  privacyDeleteNow: "Poista nyt",
  privacyDeleting: "Poistetaan…",
  privacyDeleted: "Keskustelu on poistettu palvelustamme.",
  privacyDeleteError: "Poistaminen ei onnistunut nyt. Keskustelu poistetaan silti automaattisesti.",
  shareTrusted: "Lähetä luotetulle ihmiselle",
  shareTeam: "Varoita tiimiäni",
  shareHeadingTrusted: "Viesti luotetulle ihmiselle",
  shareHeadingTeam: "Varoitus tiimillesi",
  shareDismiss: "Sulje",
  shareIntroTrusted:
    "Hei! Sain jotain epäilyttävää ja tarkistin sen operaattorini turva-avustajalta. Se neuvoi näin:",
  shareAskTrusted: "Voisitko auttaa minua tässä?",
  shareIntroTeam: "Huomio, tiimi: meihin saattaa kohdistua huijausyritys. Turva-avustaja neuvoo:",
  shareAskTeam: "Jos sait saman viestin tai puhelun, älä toimi sen mukaan. Kerro minulle heti.",
  shareSubjectTrusted: "Voisitko auttaa minua?",
  shareSubjectTeam: "Huijausvaroitus",
  shareNote:
    "Tarkista viesti ennen lähettämistä. Siinä ei ole mitään, mitä kirjoitit keskusteluun.",
  shareVia: "Jaa…",
  shareEmail: "Sähköposti",
  shareSms: "Tekstiviesti",
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
  talkAnyway: "Puhu silti ihmisen kanssa",
  talkAnywayPrompt: (unsure) =>
    unsure
      ? "Etkö ole varma vastauksesta? Asiakaspalvelun ihminen voi katsoa sen kanssasi."
      : "Mietityttääkö yhä? Voit pyytää ihmistä katsomaan asiaa, vaikka mitään ei tarvitsisi tehdä.",
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
  voiceTranscribing: "Gör om ditt tal till text…",
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
  stepsDone: (done, total) =>
    done === total ? `Alla ${total} klara` : `${done} av ${total} klara`,
  whyHeading: "Varifrån rådet kommer",
  readAloud: "Läs upp",
  campaignNote: (n: number) =>
    `Du är inte ensam: ${n} andra kunder frågade om ett mycket liknande meddelande det senaste dygnet.`,
  campaignPrivacy: "Vi räknar bara liknande meddelanden. Vi sparar ingens text.",
  copy: "Kopiera",
  talk: "Prata i stället",
  talkShort: "Prata",
  callListening: "Lyssnar… tala nu",
  callThinking: "Tänker…",
  callSpeaking: "Talar…",
  callEnded: "Samtalet är slut. Svaret finns ovan.",
  callEnd: "Avsluta",
  callGreeting: "Hej, jag är säkerhetsassistenten. Berätta med egna ord vad som hänt.",
  callSayYesNo: "Säg ja för att tillåta det, eller nej för inte nu.",
  callNoSpeech: "Jag hörde ingenting. Berätta vad som hänt, eller tryck Avsluta för att skriva.",
  callUnsupported: "Att prata kräver Chrome, Edge eller Safari. Du kan fortfarande skriva.",

  callError: "Något gick fel. Skriv i stället eller försök igen.",
  privacyHeading: "Dina uppgifter i det här samtalet",
  privacyUsed: "Använt",
  privacyWords: "Det du skrev",
  privacyScreenshots: (n: number) =>
    n === 1 ? "1 skärmbild du delade" : `${n} skärmbilder du delade`,
  privacyAllowed: "Du tillät",
  privacyDeclined: "Du sa nej till",
  privacyNotUsed: "Inte tittat på",
  privacyNoAccountData: "Uppgifter om ditt konto och din enhet",
  privacyOtherData: "Övriga uppgifter om ditt konto eller din enhet",
  privacyNever: "Vi bad aldrig om lösenord, koder eller kortnummer.",
  privacyDeletedAt: (when: string) => `Raderas automatiskt ${when}.`,
  privacyHandoffNote:
    "Om du kopplades till en person ser hen samma sammanfattning som du, i högst 24 timmar.",
  privacyDeleteNow: "Radera nu",
  privacyDeleting: "Raderar…",
  privacyDeleted: "Samtalet har raderats från vår tjänst.",
  privacyDeleteError: "Det gick inte att radera nu. Samtalet raderas ändå automatiskt.",
  shareTrusted: "Skicka till någon jag litar på",
  shareTeam: "Varna mitt team",
  shareHeadingTrusted: "Meddelande till någon du litar på",
  shareHeadingTeam: "Varning till ditt team",
  shareDismiss: "Stäng",
  shareIntroTrusted:
    "Hej! Jag fick något misstänkt och kollade det med min operatörs säkerhetsassistent. Så här rådde den:",
  shareAskTrusted: "Kan du hjälpa mig med det här?",
  shareIntroTeam:
    "Observera, teamet: vi kan vara måltavla för ett bedrägeriförsök. Säkerhetsassistenten råder:",
  shareAskTeam: "Om du fick samma meddelande eller samtal, agera inte på det. Säg till mig direkt.",
  shareSubjectTrusted: "Kan du hjälpa mig?",
  shareSubjectTeam: "Bedrägerivarning",
  shareNote:
    "Kontrollera meddelandet innan du skickar det. Det innehåller inget av det du skrev i chatten.",
  shareVia: "Dela…",
  shareEmail: "E-post",
  shareSms: "Sms",
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
  talkAnyway: "Prata med en person ändå",
  talkAnywayPrompt: (unsure) =>
    unsure
      ? "Osäker på svaret? En person från kundtjänst kan titta på det med dig."
      : "Känns det ändå fel? Du kan be en person titta på det, även om inget behöver göras.",
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
