/**
 * Live call co-pilot: red flags in what a caller says, spotted in the browser
 * as the words arrive (no AI, no network), in Finnish, Swedish and English.
 * Critical flags mean "hang up now"; warnings are the pressure tactics around
 * them. When the call ends, the transcript goes to the normal assistant.
 */

export type FlagLevel = "critical" | "warning";

export type FlagRule = {
  id: string;
  level: FlagLevel;
  label: string;
  advice: string;
  pattern: RegExp;
};

// Whole words where it matters; \b does not treat ä, ö, å as letters, so the
// patterns use (?<!\p{L}) / (?!\p{L}) with the u flag.
const w = (source: string) => new RegExp(`(?<!\\p{L})(?:${source})`, "iu");

export const RULES: FlagRule[] = [
  {
    id: "code",
    level: "critical",
    label: "Asks for a code or PIN",
    advice: "No bank, operator or police ever asks you to read out a code. Hang up.",
    pattern: w(
      "(?:read|tell|give|send|share|say)\\b[^.?!]{0,40}(?:code|pin|passcode)" +
        "|(?:verification|one[- ]time|security|sms) code" +
        "|(?:lue|kerro|anna|lähetä)[^.?!]{0,40}(?:koodi|tunnusluku|pin)" +
        "|(?:vahvistus|kertakäyttö)koodi" +
        "|(?:läsa? upp|berätta|ge|skicka)[^.?!]{0,40}(?:kod|pin)|engångskod",
    ),
  },
  {
    id: "remote",
    level: "critical",
    label: "Wants remote access",
    advice: "Never let a caller into your phone or computer. Hang up and don’t install anything.",
    pattern: w(
      "anydesk|teamviewer|quick ?support|remote (?:access|control)|share your screen|etäyhte|näytön jak|fjärr",
    ),
  },
  {
    id: "money",
    level: "critical",
    label: "Wants you to move money",
    advice: "There is no “safe account”. Don’t move or send money. Hang up and call your bank.",
    pattern: w(
      "safe account|move (?:your )?(?:money|savings)|transfer (?:the|your) (?:money|savings)|gift ?cards?|bitcoin|crypto" +
        "|turvatili|siirr(?:ä|ät) (?:rahat|säästö)|lahjakort" +
        "|säkert konto|för över (?:pengarna|dina)|presentkort",
    ),
  },
  {
    id: "credentials",
    level: "critical",
    label: "Asks for passwords or bank login",
    advice: "Never give your password or online-bank login over the phone. Hang up.",
    pattern: w(
      "password|login details|bank(?:ing)? (?:credentials|login)|salasan|verkkopankkitunnu|pankkitunnu|lösenord|bankkoder|bankid",
    ),
  },
  {
    id: "install",
    level: "critical",
    label: "Asks you to install an app",
    advice: "Don’t install anything a caller asks for. Hang up.",
    pattern: w(
      "install|download (?:an|the|this) app|asenna|lataa (?:sovellus|ohjelma)|installera|ladda ner",
    ),
  },
  {
    id: "authority",
    level: "warning",
    label: "Claims to be the bank, police or support",
    advice: "Anyone can fake a name or number. Hang up and call the official number yourself.",
    pattern: w(
      "police|bank'?s? (?:security|fraud)|fraud (?:team|department)|security team|tech(?:nical)? support|microsoft" +
        "|poliisi|pankin (?:turva|petos)|tukipalvelu|polisen|bankens (?:säkerhet|bedrägeri)",
    ),
  },
  {
    id: "secrecy",
    level: "warning",
    label: "Tells you to keep it secret",
    advice: "Real organisations never ask you to keep a call secret. That is a scam signal.",
    pattern: w(
      "(?:don'?t|do not|must not|mustn'?t) tell (?:anyone|anybody|your)|keep (?:this|it) (?:secret|between us)" +
        "|älä kerro (?:kenellekään|kellekään)|berätta inte för någon",
    ),
  },
  {
    id: "urgency",
    level: "warning",
    label: "Rushes you",
    advice: "Pressure to act now is a classic trick. You can always hang up and call back.",
    pattern: w(
      "right now|immediately|urgent|hurry|within (?:the|an|one) hour|heti|kiire|välittömästi|genast|omedelbart|bråttom",
    ),
  },
];

export type Flag = { rule: FlagRule; phrase: string; line: number };

/** The flags in a transcript (one entry per rule, at its first occurrence). */
export function analyse(lines: string[]): Flag[] {
  const flags: Flag[] = [];
  for (const rule of RULES) {
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(rule.pattern);
      if (m) {
        flags.push({ rule, phrase: m[0], line: i });
        break;
      }
    }
  }
  return flags;
}

export function levelOf(flags: Flag[]): FlagLevel | "calm" {
  if (flags.some((f) => f.rule.level === "critical")) return "critical";
  if (flags.length > 0) return "warning";
  return "calm";
}

/** A scripted scam call for demos: what a caller says, line by line. Synthetic. */
export const SAMPLE_CALL: string[] = [
  "Hello, this is Mikko from your bank's security team.",
  "We've noticed a suspicious payment of 1,200 euros leaving your account.",
  "To stop it I need to confirm it's really you.",
  "You will get a verification code by text message in a moment.",
  "Please read the code out to me right now, it's urgent.",
  "And don't tell anyone about this call, it's part of a police investigation.",
  "After that I'll help you move your savings to a safe account.",
];
