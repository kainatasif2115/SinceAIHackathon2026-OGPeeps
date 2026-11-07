"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, PhoneOff } from "lucide-react";
import type { Language } from "@/lib/api";
import { ListenError, canListen, listenOnce, speakAndWait } from "@/lib/voice";
import { cn } from "@/lib/utils";
import { useT } from "./i18n-context";

export type CallPhase = "off" | "speaking" | "listening" | "thinking" | "ended";

/** The newest assistant turn, as the call needs it. */
export type LatestTurn = { id: string; kind: "question" | "consent" | "final"; text: string };

type Options = {
  language: Language;
  latest: LatestTurn | null;
  /** True when the chat is waiting for its next request to finish. */
  failed: boolean;
  /**
   * Handles what the user said. Returns false when it could not be used (e.g.
   * an unclear yes/no to a permission request), so the call asks again.
   */
  onSay: (text: string) => boolean;
};

const MAX_SILENT_TRIES = 2;

/**
 * Hands-free mode: speak the assistant's turn, listen for the reply, send it
 * through the normal chat, and repeat until the final answer has been read.
 */
export function useVoiceCall({ language, latest, failed, onSay }: Options) {
  const t = useT();
  const [phase, setPhase] = useState<CallPhase>("off");
  const [heard, setHeard] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  // The assistant turn that was already spoken, so each is read once.
  const spokenId = useRef<string | null>(null);
  const opts = useRef({ language, onSay, t });
  useEffect(() => {
    opts.current = { language, onSay, t };
  });

  useEffect(() => () => controller.current?.abort(), []);

  function abortCurrent(): AbortSignal {
    controller.current?.abort();
    controller.current = new AbortController();
    return controller.current.signal;
  }

  async function say(text: string, signal: AbortSignal) {
    setPhase("speaking");
    await speakAndWait(text, opts.current.language, signal);
  }

  async function listen(signal: AbortSignal) {
    const { language: lang, t: dict } = opts.current;
    for (let attempt = 0; attempt <= MAX_SILENT_TRIES; attempt++) {
      if (signal.aborted) return;
      setPhase("listening");
      setHeard("");
      let text: string;
      try {
        text = await listenOnce(lang, setHeard, signal);
      } catch (err) {
        if (signal.aborted) return;
        setNotice(
          err instanceof ListenError && err.reason === "denied" ? dict.voiceDenied : dict.callError,
        );
        setPhase("ended");
        return;
      }
      if (signal.aborted) return;
      if (text) {
        if (opts.current.onSay(text)) {
          setPhase("thinking");
          return;
        }
        await say(dict.callSayYesNo, signal);
        continue;
      }
      if (attempt < MAX_SILENT_TRIES) await say(dict.callNoSpeech, signal);
    }
    if (!signal.aborted) setPhase("ended");
  }

  /** Starts the call: greets (or repeats the open question) and listens. */
  async function start(current: LatestTurn | null) {
    if (!canListen()) {
      setNotice(opts.current.t.callUnsupported);
      setPhase("ended");
      return;
    }
    const signal = abortCurrent();
    setNotice(null);
    if (current && current.kind !== "final") {
      spokenId.current = current.id;
      await say(current.text, signal);
    } else {
      await say(opts.current.t.callGreeting, signal);
    }
    await listen(signal);
  }

  function stop() {
    controller.current?.abort();
    setPhase("off");
    setHeard("");
    setNotice(null);
  }

  // A new assistant turn arrived while the call waits: read it, then listen or finish.
  useEffect(() => {
    if (phase !== "thinking" || !latest || latest.id === spokenId.current) return;
    spokenId.current = latest.id;
    const signal = controller.current?.signal ?? abortCurrent();
    void (async () => {
      await say(latest.text, signal);
      if (signal.aborted) return;
      if (latest.kind === "final") setPhase("ended");
      else await listen(signal);
    })();
    // say/listen read the latest options through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, latest]);

  // The request failed while the call waited: say so and end the call.
  useEffect(() => {
    if (phase !== "thinking" || !failed) return;
    const signal = controller.current?.signal ?? abortCurrent();
    void (async () => {
      await say(opts.current.t.callError, signal);
      if (!signal.aborted) setPhase("ended");
    })();
  }, [phase, failed]);

  return { phase, heard, notice, start, stop };
}

const PHASE_STYLES: Record<Exclude<CallPhase, "off">, string> = {
  listening: "bg-brand text-brand-foreground",
  speaking: "bg-ink text-ink-foreground",
  thinking: "bg-muted text-foreground",
  ended: "bg-muted text-muted-foreground",
};

/** Bottom bar shown during a call: what is happening, what was heard, and End. */
export function CallBar({
  phase,
  heard,
  notice,
  onEnd,
}: {
  phase: Exclude<CallPhase, "off">;
  heard: string;
  notice: string | null;
  onEnd: () => void;
}) {
  const t = useT();
  const label = {
    listening: t.callListening,
    speaking: t.callSpeaking,
    thinking: t.callThinking,
    ended: notice ?? t.callEnded,
  }[phase];

  return (
    <div
      role="region"
      aria-label={t.talk}
      className="border-border bg-card sticky bottom-0 flex items-center gap-4 rounded-2xl border p-4 shadow-[0_-8px_24px_rgb(0_0_0/0.08)]"
    >
      <span className="relative flex size-14 shrink-0 items-center justify-center">
        {(phase === "listening" || phase === "speaking") && (
          <span
            aria-hidden
            className={cn(
              "absolute inset-0 animate-ping rounded-full opacity-30",
              phase === "listening" ? "bg-brand" : "bg-ink",
            )}
          />
        )}
        <span
          className={cn(
            "relative flex size-14 items-center justify-center rounded-full transition-colors duration-200",
            PHASE_STYLES[phase],
          )}
        >
          {phase === "speaking" ? <SpeakingBars /> : <Mic aria-hidden className="size-6" />}
        </span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p aria-live="polite" className="font-heading font-semibold">
          {label}
        </p>
        {phase === "listening" && heard && (
          <p className="text-muted-foreground line-clamp-2 text-sm">“{heard}”</p>
        )}
      </div>
      <button
        type="button"
        onClick={onEnd}
        className="bg-destructive inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white transition-opacity duration-150 hover:opacity-90"
      >
        <PhoneOff aria-hidden className="size-4" />
        {t.callEnd}
      </button>
    </div>
  );
}

function SpeakingBars() {
  return (
    <span aria-hidden className="flex h-6 items-center gap-1">
      {[0, 150, 300, 150].map((delay, i) => (
        <span
          key={i}
          className="w-1 animate-pulse rounded-full bg-current"
          style={{ height: `${[12, 22, 16, 20][i]}px`, animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}
