import type { Language } from "@/lib/api";

/**
 * The homepage topics are written in English; the chat shows them in the language the user
 * picked. Titles and example messages are looked up by their English text.
 */
const TITLES: Record<string, Record<"fi" | "sv", string>> = {
  "Strange texts and emails": { fi: "Oudot tekstiviestit ja sähköpostit", sv: "Konstiga sms och mejl" },
  "Suspicious calls": { fi: "Epäilyttävät puhelut", sv: "Misstänkta samtal" },
  "I already clicked": { fi: "Olen jo klikannut", sv: "Jag har redan klickat" },
  "Account taken over": { fi: "Tili on kaapattu", sv: "Kontot har kapats" },
  "SIM or eSIM changes": { fi: "SIM- tai eSIM-muutokset", sv: "SIM- eller eSIM-ändringar" },
  "Something else": { fi: "Jotain muuta", sv: "Något annat" },
  "CEO and invoice fraud": { fi: "Toimitusjohtaja- ja laskupetokset", sv: "VD- och fakturabedrägerier" },
  "Phishing at work": { fi: "Tietojenkalastelu töissä", sv: "Nätfiske på jobbet" },
  "Company account access": { fi: "Yrityksen tunnusten käyttö", sv: "Åtkomst till företagskonton" },
  "Calls to your team": { fi: "Puhelut tiimillesi", sv: "Samtal till ditt team" },
  "Work phones and SIMs": { fi: "Työpuhelimet ja SIM-kortit", sv: "Jobbtelefoner och SIM-kort" },
};

const EXAMPLES: Record<string, Record<"fi" | "sv", string>> = {
  "I got a text saying my parcel is stuck in customs and I need to pay €1.99.": {
    fi: "Sain tekstiviestin, että pakettini on jumissa tullissa ja minun pitää maksaa 1,99 €.",
    sv: "Jag fick ett sms om att mitt paket har fastnat i tullen och att jag måste betala 1,99 €.",
  },
  "An email from my bank says my account is locked unless I confirm my details today.": {
    fi: "Pankilta tuli sähköposti, että tilini lukitaan, jos en vahvista tietojani tänään.",
    sv: "Ett mejl från min bank säger att mitt konto låses om jag inte bekräftar mina uppgifter i dag.",
  },
  "A message says I’ve won a phone and only need to pay the shipping.": {
    fi: "Viestissä sanotaan, että olen voittanut puhelimen ja minun pitää vain maksaa postikulut.",
    sv: "Ett meddelande säger att jag har vunnit en telefon och bara behöver betala frakten.",
  },
  "Someone from “bank security” called and asked me to read out the code they texted me.": {
    fi: "Joku “pankin tietoturvasta” soitti ja pyysi lukemaan ääneen heidän lähettämänsä koodin.",
    sv: "Någon från ”bankens säkerhetsavdelning” ringde och bad mig läsa upp koden de skickade.",
  },
  "A caller said he’s from Microsoft and my computer has a virus.": {
    fi: "Soittaja sanoi olevansa Microsoftilta ja että tietokoneessani on virus.",
    sv: "En person sa att han ringde från Microsoft och att min dator har virus.",
  },
  "Someone claiming to be the police said my money isn’t safe and I must move it.": {
    fi: "Poliisiksi esittäytyvä henkilö sanoi, ettei rahani ole turvassa ja että minun pitää siirtää ne.",
    sv: "Någon som sa sig vara polis sa att mina pengar inte är säkra och att jag måste flytta dem.",
  },
  "I clicked a link in a text about a parcel and typed in my card number.": {
    fi: "Klikkasin pakettiviestin linkkiä ja kirjoitin korttini numeron.",
    sv: "Jag klickade på en länk i ett paketsms och skrev in mitt kortnummer.",
  },
  "I logged in to what I thought was my bank, but the address looked odd.": {
    fi: "Kirjauduin luullakseni pankkiini, mutta osoite näytti oudolta.",
    sv: "Jag loggade in på vad jag trodde var min bank, men adressen såg konstig ut.",
  },
  "I opened a link from an unknown number but didn’t type anything.": {
    fi: "Avasin linkin tuntemattomasta numerosta, mutta en kirjoittanut mitään.",
    sv: "Jag öppnade en länk från ett okänt nummer men skrev inte in något.",
  },
  "I got an alert about a sign-in from another country that wasn’t me.": {
    fi: "Sain ilmoituksen kirjautumisesta toisesta maasta, enkä kirjautunut itse.",
    sv: "Jag fick en varning om en inloggning från ett annat land som inte var jag.",
  },
  "My email password was changed and I can’t log in anymore.": {
    fi: "Sähköpostini salasana vaihdettiin, enkä pääse enää sisään.",
    sv: "Mitt mejllösenord har ändrats och jag kan inte logga in längre.",
  },
  "My friends are getting messages from my account that I didn’t send.": {
    fi: "Ystäväni saavat viestejä tililtäni, joita en ole lähettänyt.",
    sv: "Mina vänner får meddelanden från mitt konto som jag inte har skickat.",
  },
  "My phone suddenly says No service and my partner’s phone works fine.": {
    fi: "Puhelimeni näyttää yhtäkkiä “Ei verkkoa”, vaikka kumppanini puhelin toimii.",
    sv: "Min telefon visar plötsligt ”Ingen tjänst” fast min partners telefon fungerar.",
  },
  "I got a text that my eSIM is being moved to a new device. I didn’t ask for that.": {
    fi: "Sain tekstiviestin, että eSIMini siirretään uuteen laitteeseen. En ole pyytänyt sitä.",
    sv: "Jag fick ett sms om att mitt eSIM flyttas till en ny enhet. Jag har inte bett om det.",
  },
  "Someone I met online is asking me to send money for a plane ticket.": {
    fi: "Netissä tapaamani henkilö pyytää minua lähettämään rahaa lentolippuun.",
    sv: "Någon jag träffat på nätet ber mig skicka pengar till en flygbiljett.",
  },
  "A website offers a new phone at half price. Is it real?": {
    fi: "Verkkosivu myy uutta puhelinta puoleen hintaan. Onko se oikea?",
    sv: "En webbplats säljer en ny telefon till halva priset. Är den på riktigt?",
  },
  "Our supplier emailed new bank details for the next invoice.": {
    fi: "Toimittajamme lähetti sähköpostilla uudet pankkitiedot seuraavaa laskua varten.",
    sv: "Vår leverantör mejlade nya bankuppgifter inför nästa faktura.",
  },
  "The CEO emailed me asking for an urgent, confidential payment today.": {
    fi: "Toimitusjohtaja pyysi sähköpostilla kiireellistä, luottamuksellista maksua tänään.",
    sv: "VD:n mejlade och bad om en brådskande, konfidentiell betalning i dag.",
  },
  "A colleague shared a file that asks me to log in to Microsoft 365 again.": {
    fi: "Työkaveri jakoi tiedoston, joka pyytää kirjautumaan uudelleen Microsoft 365:een.",
    sv: "En kollega delade en fil som ber mig logga in på Microsoft 365 igen.",
  },
  "We got an email saying our mailbox is full and will be closed today.": {
    fi: "Saimme sähköpostin, jonka mukaan postilaatikkomme on täynnä ja suljetaan tänään.",
    sv: "Vi fick ett mejl om att vår brevlåda är full och stängs i dag.",
  },
  "Our admin account got a sign-in from a country where we have no staff.": {
    fi: "Ylläpitäjän tunnuksella kirjauduttiin maasta, jossa meillä ei ole työntekijöitä.",
    sv: "Vårt administratörskonto fick en inloggning från ett land där vi inte har någon personal.",
  },
  "An employee lost a work laptop that was still logged in.": {
    fi: "Työntekijä hukkasi työkoneen, johon oli vielä kirjauduttu.",
    sv: "En anställd tappade bort en jobbdator som fortfarande var inloggad.",
  },
  "Someone called our receptionist claiming to be IT and asked for a login code.": {
    fi: "Joku soitti vastaanottoomme IT-tuen nimissä ja pyysi kirjautumiskoodin.",
    sv: "Någon ringde vår reception och sa sig vara från IT och bad om en inloggningskod.",
  },
  "A caller from “DNA” asked our office to confirm the company’s SIM details.": {
    fi: "“DNA:lta” soittanut pyysi toimistoa vahvistamaan yrityksen SIM-tiedot.",
    sv: "En uppringare från ”DNA” bad vårt kontor bekräfta företagets SIM-uppgifter.",
  },
  "The CEO’s work phone lost signal and we got an eSIM change notice.": {
    fi: "Toimitusjohtajan työpuhelin menetti verkon ja saimme ilmoituksen eSIM-muutoksesta.",
    sv: "VD:ns jobbtelefon tappade nätet och vi fick ett meddelande om ett eSIM-byte.",
  },
  "Several work phones show No service at the same time.": {
    fi: "Useammassa työpuhelimessa lukee yhtä aikaa “Ei verkkoa”.",
    sv: "Flera jobbtelefoner visar ”Ingen tjänst” samtidigt.",
  },
  "A new customer wants to overpay and have us refund the difference.": {
    fi: "Uusi asiakas haluaa maksaa liikaa ja pyytää meitä palauttamaan erotuksen.",
    sv: "En ny kund vill betala för mycket och be oss betala tillbaka mellanskillnaden.",
  },
  "We got a fake-looking domain renewal invoice.": {
    fi: "Saimme epäilyttävän näköisen verkkotunnuksen uusimislaskun.",
    sv: "Vi fick en misstänkt faktura för förnyelse av en domän.",
  },
};

/** The topic as the user should see it in this language; English is the source text. */
export function localizeTopic<T extends { title: string; examples: string[] }>(
  topic: T,
  language: Language,
): T {
  if (language === "en") return topic;
  return {
    ...topic,
    title: TITLES[topic.title]?.[language] ?? topic.title,
    examples: topic.examples.map((example) => EXAMPLES[example]?.[language] ?? example),
  };
}
