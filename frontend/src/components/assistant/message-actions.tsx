"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, LoaderCircle, Square, Volume2 } from "lucide-react";
import { speak, type Answer, type Language } from "@/lib/api";
import type { Dictionary } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useT } from "./i18n-context";

const MAX_SPEECH_CHARS = 2500; // the backend's limit for /api/voice/speak
const BROWSER_LOCALES: Record<Language, string> = { fi: "fi-FI", sv: "sv-SE", en: "en-GB" };

/** A final answer as plain text: risk and timing, the action, the reason, then the steps. */
export function answerText(answer: Answer, t: Dictionary): string {
  const steps = answer.steps.map((step, i) => `${i + 1}. ${step}`).join("\n");
  return [
    `${t.riskHeading}: ${t.risk[answer.risk_level]} · ${t.urgencyLabel}: ${t.urgency[answer.urgency]}`,
    answer.action_label,
    answer.advice_text,
    steps && `${t.whatToDo}:\n${steps}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function copyWithSelection(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

type ReadStatus = "idle" | "loading" | "playing" | "error";

/**
 * Reads text aloud with ElevenLabs. If that fails (no key, network, mock
 * mode), it falls back to the browser's own speech synthesis so it still
 * works during a demo. Audio is fetched once per message and reused.
 */
function useReadAloud(text: string, language: Language) {
  const [status, setStatus] = useState<ReadStatus>("idle");
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

  function speakInBrowser(spoken: string) {
    if (!("speechSynthesis" in window)) {
      setStatus("error");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.lang = BROWSER_LOCALES[language];
    utterance.onend = () => setStatus("idle");
    utterance.onerror = () => setStatus("error");
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setStatus("playing");
  }

  async function play() {
    const spoken = text.slice(0, MAX_SPEECH_CHARS);
    setStatus("loading");
    try {
      if (!audioUrl.current) {
        audioUrl.current = URL.createObjectURL(await speak(spoken, language));
      }
      const el = new Audio(audioUrl.current);
      el.addEventListener("ended", () => setStatus("idle"));
      el.addEventListener("error", () => speakInBrowser(spoken));
      audio.current = el;
      await el.play();
      setStatus("playing");
    } catch {
      speakInBrowser(spoken);
    }
  }

  const active = status === "loading" || status === "playing";
  return { status, toggle: active ? stop : () => void play() };
}

const ICON_BUTTON =
  "text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-8 items-center justify-center rounded-md transition-colors duration-150";

/** Small icon row under an assistant message: copy the text, read it aloud. */
export function MessageActions({
  text,
  language,
  className,
}: {
  text: string;
  language: Language;
  className?: string;
}) {
  const t = useT();
  const read = useReadAloud(text.replace(/\n+/g, " "), language);
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");

  useEffect(() => {
    if (copied === "idle") return;
    const timer = setTimeout(() => setCopied("idle"), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("done");
    } catch {
      // The Clipboard API needs a secure, focused page (it fails on http://<LAN IP>
      // during a demo); the older copy command works there.
      setCopied(copyWithSelection(text) ? "done" : "failed");
    }
  }

  const copyLabel = copied === "done" ? t.copied : copied === "failed" ? t.copyFailed : t.copy;
  const readLabel =
    read.status === "loading"
      ? t.readAloudLoading
      : read.status === "playing"
        ? t.readAloudStop
        : t.readAloud;

  return (
    <div className={cn("-ml-1.5 flex items-center gap-0.5", className)}>
      <button type="button" onClick={() => void copy()} title={copyLabel} className={ICON_BUTTON}>
        {copied === "done" ? (
          <Check aria-hidden className="text-primary size-4" />
        ) : (
          <Copy aria-hidden className="size-4" />
        )}
        <span className="sr-only">{copyLabel}</span>
      </button>
      <button
        type="button"
        onClick={read.toggle}
        aria-pressed={read.status === "playing"}
        title={readLabel}
        className={cn(ICON_BUTTON, read.status === "playing" && "text-primary")}
      >
        {read.status === "loading" ? (
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
        ) : read.status === "playing" ? (
          <Square aria-hidden className="size-3.5 fill-current" />
        ) : (
          <Volume2 aria-hidden className="size-4" />
        )}
        <span className="sr-only">{readLabel}</span>
      </button>
      <span role="status" className="text-muted-foreground ml-1 text-xs">
        {read.status === "error" ? t.readAloudError : copied !== "idle" ? copyLabel : ""}
      </span>
    </div>
  );
}
