/**
 * Speech in and out for hands-free mode. Listening uses the browser's speech
 * recognition (Claude takes no audio); speaking uses ElevenLabs through our
 * backend, falling back to the browser's own voice. Every turn still goes
 * through the normal chat API, so the safety checker sees all of it.
 */
import { speak, type Language } from "./api";

const LOCALES: Record<Language, string> = { fi: "fi-FI", sv: "sv-SE", en: "en-GB" };

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function canListen(): boolean {
  return recognitionCtor() !== null;
}

export class ListenError extends Error {
  constructor(readonly reason: "denied" | "unavailable") {
    super(reason);
    this.name = "ListenError";
  }
}

/**
 * Listens for one utterance and resolves with it ("" if nothing was heard).
 * `onInterim` gets the words as they come. Aborting resolves with "".
 */
export function listenOnce(
  language: Language,
  onInterim: (text: string) => void,
  signal: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const Ctor = recognitionCtor();
    if (!Ctor) return reject(new ListenError("unavailable"));
    const rec = new Ctor();
    rec.lang = LOCALES[language];
    rec.continuous = false;
    rec.interimResults = true;
    let finalText = "";
    let failed: ListenError | null = null;
    rec.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interim += result[0].transcript;
      }
      onInterim((finalText + interim).trim());
    };
    rec.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        failed = new ListenError("denied");
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        failed = new ListenError("unavailable");
      }
    };
    rec.onend = () => (failed ? reject(failed) : resolve(finalText.trim()));
    signal.addEventListener("abort", () => rec.abort(), { once: true });
    try {
      rec.start();
    } catch {
      reject(new ListenError("unavailable"));
    }
  });
}

/** Speaks `text` and resolves when it has finished (or was aborted). */
export async function speakAndWait(
  text: string,
  language: Language,
  signal: AbortSignal,
): Promise<void> {
  const spoken = text.slice(0, 2500);
  try {
    const url = URL.createObjectURL(await speak(spoken, language));
    try {
      await playUntilEnd(new Audio(url), signal);
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    if (signal.aborted) return;
    if (err instanceof DOMException && err.name === "AbortError") return;
    await speakInBrowser(spoken, language, signal);
  }
}

const START_TIMEOUT_MS = 5000;

/**
 * Plays to the end. A call must never hang on audio: if playback has not
 * started within a few seconds (autoplay blocked, a stalled tab) it rejects so
 * the caller can fall back, and it gives up a little after the clip's length.
 */
function playUntilEnd(audio: HTMLAudioElement, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return resolve();
    let overrun: ReturnType<typeof setTimeout> | undefined;
    const stalled = setTimeout(() => {
      audio.pause();
      reject(new Error("audio did not start"));
    }, START_TIMEOUT_MS);
    const finish = (fn: () => void) => {
      clearTimeout(stalled);
      clearTimeout(overrun);
      fn();
    };
    audio.addEventListener(
      "playing",
      () => {
        clearTimeout(stalled);
        const seconds = Number.isFinite(audio.duration) ? audio.duration : 60;
        overrun = setTimeout(() => finish(resolve), (seconds + 3) * 1000);
      },
      { once: true },
    );
    audio.addEventListener("ended", () => finish(resolve), { once: true });
    audio.addEventListener("error", () => finish(() => reject(new Error("audio"))), {
      once: true,
    });
    signal.addEventListener(
      "abort",
      () => {
        audio.pause();
        finish(resolve);
      },
      { once: true },
    );
    audio.play().catch((err) => finish(() => reject(err)));
  });
}

function speakInBrowser(text: string, language: Language, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted || !("speechSynthesis" in window)) return resolve();
    // Some browsers have no voices installed and never fire "end": stop waiting
    // after roughly the time it would take to say the text.
    const words = text.split(/\s+/).length;
    const limit = setTimeout(done, Math.max(3000, words * 450 + 2000));
    function done() {
      clearTimeout(limit);
      resolve();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LOCALES[language];
    utterance.onend = done;
    utterance.onerror = done;
    signal.addEventListener(
      "abort",
      () => {
        window.speechSynthesis.cancel();
        done();
      },
      { once: true },
    );
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

// Whole words only. \b treats ä, ö and å as non-letters, so use Unicode letter lookarounds.
const words = (list: string) => new RegExp(`(?<!\\p{L})(${list})(?!\\p{L})`, "iu");

const YES: Record<Language, RegExp> = {
  en: words("yes|yeah|yep|sure|ok|okay|allow|go ahead|please do|fine"),
  fi: words("kyllä|joo|juu|jep|saa|sallin|okei|ok|selvä|käy"),
  sv: words("ja|japp|jo|visst|okej|ok|tillåt|gärna|kör"),
};
const NO: Record<Language, RegExp> = {
  en: words("no|nope|not now|don't|dont|do not|rather not"),
  fi: words("ei|en|älä|ei nyt|en halua"),
  sv: words("nej|inte nu|hellre inte|låt bli"),
};

/** A spoken answer to a permission request: true, false, or null if unclear. */
export function parseYesNo(text: string, language: Language): boolean | null {
  const yes = YES[language].test(text) || YES.en.test(text);
  const no = NO[language].test(text) || NO.en.test(text);
  if (yes === no) return null;
  return yes;
}

/**
 * Listens until aborted (the call co-pilot): each finished phrase goes to
 * `onPhrase`, words still being spoken to `onInterim`. Browsers stop after a
 * pause, so recognition restarts until the signal aborts.
 */
export function listenContinuously(
  language: Language,
  onPhrase: (text: string) => void,
  onInterim: (text: string) => void,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const Ctor = recognitionCtor();
    if (!Ctor) return reject(new ListenError("unavailable"));
    let current: Recognition | null = null;

    function start() {
      if (signal.aborted) return resolve();
      const rec = new Ctor!();
      current = rec;
      rec.lang = LOCALES[language];
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) onPhrase(result[0].transcript.trim());
          else interim += result[0].transcript;
        }
        onInterim(interim.trim());
      };
      rec.onerror = (event) => {
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          if (!signal.aborted) reject(new ListenError("denied"));
        }
      };
      rec.onend = () => (signal.aborted ? resolve() : start());
      try {
        rec.start();
      } catch {
        reject(new ListenError("unavailable"));
      }
    }

    signal.addEventListener("abort", () => current?.abort(), { once: true });
    start();
  });
}
