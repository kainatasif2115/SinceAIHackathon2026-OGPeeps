"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Square, Volume2 } from "lucide-react";
import { speak, type Answer, type Language } from "@/lib/api";
import { useT } from "./i18n-context";

type Status = "idle" | "loading" | "playing" | "error";

const MAX_CHARS = 2500; // the backend's limit for /api/voice/speak
const BROWSER_LOCALES: Record<Language, string> = { fi: "fi-FI", sv: "sv-SE", en: "en-GB" };

/** What gets read: the action, the reason, then the numbered steps. */
function spokenText(answer: Answer, stepsIntro: string): string {
  const steps = answer.steps.map((step, i) => `${i + 1}. ${step}`).join(" ");
  const text = [answer.action_label + ".", answer.advice_text, steps && `${stepsIntro} ${steps}`]
    .filter(Boolean)
    .join(" ");
  return text.slice(0, MAX_CHARS);
}

/**
 * Reads the answer aloud with ElevenLabs. If that fails (no key, network,
 * mock mode), it falls back to the browser's own speech synthesis so the
 * button still works during a demo.
 */
export function ReadAloudButton({ answer, language }: { answer: Answer; language: Language }) {
  const t = useT();
  const [status, setStatus] = useState<Status>("idle");
  const audio = useRef<HTMLAudioElement | null>(null);
  const audioUrl = useRef<string | null>(null);

  useEffect(
    () => () => {
      audio.current?.pause();
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    },
    [],
  );

  function stop() {
    audio.current?.pause();
    window.speechSynthesis?.cancel();
    setStatus("idle");
  }

  function speakInBrowser(text: string) {
    if (!("speechSynthesis" in window)) {
      setStatus("error");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = BROWSER_LOCALES[language];
    utterance.onend = () => setStatus("idle");
    utterance.onerror = () => setStatus("error");
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setStatus("playing");
  }

  async function play() {
    const text = spokenText(answer, t.readAloudSteps);
    setStatus("loading");
    try {
      if (!audioUrl.current) {
        // Fetched once per answer; replays reuse the same audio.
        audioUrl.current = URL.createObjectURL(await speak(text, language));
      }
      const el = new Audio(audioUrl.current);
      el.addEventListener("ended", () => setStatus("idle"));
      el.addEventListener("error", () => speakInBrowser(text));
      audio.current = el;
      await el.play();
      setStatus("playing");
    } catch {
      speakInBrowser(text);
    }
  }

  const busy = status === "loading";
  const playing = status === "playing";

  return (
    <span className="ml-auto flex items-center gap-2">
      {status === "error" && (
        <span role="status" className="text-xs">
          {t.readAloudError}
        </span>
      )}
      <button
        type="button"
        onClick={playing || busy ? stop : () => void play()}
        aria-pressed={playing}
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/70 px-3 text-sm font-medium shadow-sm ring-1 ring-black/10 transition-colors duration-150 hover:bg-white"
      >
        {busy ? (
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
        ) : playing ? (
          <Square aria-hidden className="size-3.5 fill-current" />
        ) : (
          <Volume2 aria-hidden className="size-4" />
        )}
        {busy ? t.readAloudLoading : playing ? t.readAloudStop : t.readAloud}
      </button>
    </span>
  );
}
