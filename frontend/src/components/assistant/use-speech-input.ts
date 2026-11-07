"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Language } from "@/lib/api";

/*
 * Voice input. When the backend has ElevenLabs voice switched on, the browser
 * records the audio and our backend turns it into text (ElevenLabs speech-to-text),
 * so the recording never goes to the browser maker and it works in every browser
 * that can record. Otherwise it falls back to the browser's Web Speech API
 * (Chrome, Edge, Safari). Either way the words land in the box to check first.
 */

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechEvent = { resultIndex: number; results: ArrayLike<SpeechResult> };
type SpeechErrorEvent = { error: string };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionCtor = new () => Recognition;

const LOCALES: Record<Language, string> = { fi: "fi-FI", sv: "sv-SE", en: "en-GB" };

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function canRecord(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

let serverVoice: Promise<boolean> | null = null;

/** Asked once per page load: is ElevenLabs speech-to-text available on the backend? */
function serverVoiceAvailable(): Promise<boolean> {
  serverVoice ??= fetch("/api/health", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : null))
    .then((health) => Boolean(health?.voice_configured))
    .catch(() => false);
  return serverVoice;
}

const MAX_RECORDING_MS = 60_000;

const noSubscribe = () => () => {};

export type SpeechError = "denied" | "no-speech" | "unavailable";

/**
 * `onText` receives the whole field value while the user speaks: what was
 * typed before, plus the transcript so far (interim words included).
 */
export function useSpeechInput(language: Language, value: string, onText: (text: string) => void) {
  // Known only in the browser; the server renders without the button.
  const supported = useSyncExternalStore(
    noSubscribe,
    () => recognitionCtor() !== null || canRecord(),
    () => false,
  );
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<SpeechError | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  });

  useEffect(
    () => () => {
      recognition.current?.abort();
      recorder.current?.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  async function start() {
    if (listening || transcribing) return;
    const base = value.trimEnd();
    const prefix = base ? `${base} ` : "";
    setError(null);
    if (canRecord() && (await serverVoiceAvailable())) return record(prefix);
    listen(prefix);
  }

  /** Record, then let the backend transcribe it with ElevenLabs. */
  async function record(prefix: string) {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setError(
        err instanceof DOMException && err.name === "NotAllowedError" ? "denied" : "unavailable",
      );
      return;
    }
    const rec = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    const timer = setTimeout(() => rec.state === "recording" && rec.stop(), MAX_RECORDING_MS);
    rec.ondataavailable = (event) => event.data.size && chunks.push(event.data);
    rec.onstop = async () => {
      clearTimeout(timer);
      stream.getTracks().forEach((track) => track.stop());
      recorder.current = null;
      setListening(false);
      setTranscribing(true);
      try {
        const form = new FormData();
        form.append("audio", new Blob(chunks, { type: rec.mimeType }), "recording.webm");
        form.append("language", language);
        const res = await fetch("/api/voice/transcribe", { method: "POST", body: form });
        if (!res.ok) throw new Error(String(res.status));
        const text = String((await res.json()).text ?? "").trim();
        if (text) onTextRef.current(prefix + text);
        else setError("no-speech");
      } catch {
        setError("unavailable");
      } finally {
        setTranscribing(false);
      }
    };
    recorder.current = rec;
    rec.start();
    setListening(true);
  }

  /** The browser's own speech recognition (used when the backend has no voice). */
  function listen(prefix: string) {
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setError("unavailable");
      return;
    }
    let finalText = "";

    const rec = new Ctor();
    rec.lang = LOCALES[language];
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interim += result[0].transcript;
      }
      onTextRef.current(prefix + (finalText + interim).trimStart());
    };
    rec.onerror = (event) => {
      if (event.error === "aborted") return;
      setError(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "denied"
          : event.error === "no-speech"
            ? "no-speech"
            : "unavailable",
      );
    };
    rec.onend = () => {
      setListening(false);
      recognition.current = null;
    };
    recognition.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("unavailable");
    }
  }

  function stop() {
    recognition.current?.stop();
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  return {
    supported,
    listening,
    transcribing,
    error,
    start,
    stop,
    toggle: listening ? stop : () => void start(),
  };
}
