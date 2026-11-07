"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Language } from "@/lib/api";

/*
 * Voice input through the browser's Web Speech API (Chrome, Edge, Safari).
 * Claude does not take audio, so speech becomes text in the browser and is
 * sent like typed text. Browsers that lack the API get no microphone button.
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
    () => recognitionCtor() !== null,
    () => false,
  );
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<SpeechError | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  });

  useEffect(() => () => recognition.current?.abort(), []);

  function start() {
    const Ctor = recognitionCtor();
    if (!Ctor || listening) return;
    const base = value.trimEnd();
    const prefix = base ? `${base} ` : "";
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
    setError(null);
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("unavailable");
    }
  }

  function stop() {
    recognition.current?.stop();
  }

  return { supported, listening, error, start, stop, toggle: listening ? stop : start };
}
