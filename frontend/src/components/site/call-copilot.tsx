"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CircleAlert,
  Ear,
  Mic,
  OctagonX,
  PhoneOff,
  Play,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import type { Audience, Language } from "@/lib/api";
import { SAMPLE_CALL, analyse, levelOf, type Flag } from "@/lib/call-copilot";
import { ListenError, canListen, listenContinuously } from "@/lib/voice";
import { cn } from "@/lib/utils";
import { Assistant, type InitialRequest } from "@/components/assistant/assistant";
import { Select } from "@/components/agent/select";

type Stage = "idle" | "live" | "advice";
const SAMPLE_PACE_MS = 2600;

/**
 * "Listen with me": during a suspicious call on speaker, flags what the caller
 * says in real time (rules in the browser, no AI), then hands the transcript to
 * the normal assistant for one clear next step.
 */
type Props = {
  /**
   * Inside the signed-in dashboard: no page header of its own (the dashboard has one),
   * and the advice opens in the dashboard's chat, so it is saved to the account.
   */
  embedded?: { audience: Audience; onAdvice: (request: InitialRequest) => void };
};

export function CallCopilot({ embedded }: Props = {}) {
  const [stage, setStage] = useState<Stage>("idle");
  const [source, setSource] = useState<"mic" | "sample">("sample");
  const [language, setLanguage] = useState<Language>("en");
  const [lines, setLines] = useState<string[]>([]);
  const [interim, setInterim] = useState("");
  const [micError, setMicError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  // The scripted sample call: one caller line every few seconds.
  useEffect(() => {
    if (stage !== "live" || source !== "sample") return;
    if (lines.length >= SAMPLE_CALL.length) return;
    const timer = setTimeout(
      () => setLines((prev) => [...prev, SAMPLE_CALL[prev.length]]),
      lines.length === 0 ? 600 : SAMPLE_PACE_MS,
    );
    return () => clearTimeout(timer);
  }, [stage, source, lines.length]);

  const flags = useMemo(() => analyse(interim ? [...lines, interim] : lines), [lines, interim]);
  const level = levelOf(flags);

  function startSample() {
    controller.current?.abort();
    setSource("sample");
    setLanguage("en");
    setLines([]);
    setInterim("");
    setMicError(null);
    setStage("live");
  }

  function startMic() {
    if (!canListen()) {
      setMicError("Listening needs Chrome, Edge or Safari. Try the sample call instead.");
      return;
    }
    controller.current?.abort();
    const ac = new AbortController();
    controller.current = ac;
    setSource("mic");
    setLines([]);
    setInterim("");
    setMicError(null);
    setStage("live");
    listenContinuously(
      language,
      (phrase) => phrase && setLines((prev) => [...prev, phrase]),
      setInterim,
      ac.signal,
    ).catch((err) => {
      setMicError(
        err instanceof ListenError && err.reason === "denied"
          ? "The microphone is blocked. Allow it in your browser, or try the sample call."
          : "Listening stopped. Try again or use the sample call.",
      );
    });
  }

  function endCall() {
    controller.current?.abort();
    if (embedded) {
      const said = interim ? [...lines, interim] : lines;
      embedded.onAdvice({
        text: callMessage(said, analyse(said)),
        audience: embedded.audience,
        language,
        scenario: null,
      });
      return;
    }
    if (interim) setLines((prev) => [...prev, interim]);
    setInterim("");
    setStage("advice");
  }

  function reset() {
    controller.current?.abort();
    setLines([]);
    setInterim("");
    setStage("idle");
  }

  const Main = embedded ? "div" : "main";
  return (
    <div className={cn("flex min-h-full flex-1 flex-col", !embedded && "theme-dna bg-white")}>
      {!embedded && (
        <header className="border-border border-b bg-white">
          <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <span className="font-heading text-brand text-2xl leading-none font-bold tracking-tight">
                DNA
              </span>
              <span className="bg-border h-6 w-px" aria-hidden />
              <span className="font-heading flex items-center gap-1.5 font-semibold">
                <Ear aria-hidden className="text-brand size-4.5" />
                Call co-pilot
              </span>
            </div>
            <Link
              href="/"
              className="text-brand hover:bg-brand-soft inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold"
            >
              <ArrowLeft aria-hidden className="size-4" />
              Home
            </Link>
          </div>
        </header>
      )}

      <Main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        {stage === "idle" && (
          <section className="flex flex-col gap-6">
            <div className="flex max-w-2xl flex-col gap-3">
              <p className="text-brand text-sm font-semibold">Prototype · listens with you</p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                On a suspicious call right now?
              </h1>
              <p className="text-muted-foreground text-lg">
                Put the call on speaker and let the co-pilot listen. It warns you the moment the
                caller asks for a code, money or access, then tells you what to do next.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-3 rounded-2xl border border-[#f3e4ec] bg-[#fdf6fa] p-5">
                <h2 className="flex items-center gap-2 font-bold">
                  <Mic aria-hidden className="text-brand size-5" />
                  Listen to my call
                </h2>
                <p className="text-muted-foreground text-sm">
                  Uses your browser’s speech recognition. Nothing is saved unless you ask for advice
                  at the end.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    aria-label="Language of the call"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Language)}
                  >
                    <option value="fi">Finnish</option>
                    <option value="sv">Swedish</option>
                    <option value="en">English</option>
                  </Select>
                  <button
                    type="button"
                    onClick={startMic}
                    className="bg-brand text-brand-foreground hover:bg-brand/90 inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold"
                  >
                    <Mic aria-hidden className="size-4" />
                    Start listening
                  </button>
                </div>
                {micError && (
                  <p role="alert" className="text-destructive text-sm">
                    {micError}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-3 rounded-2xl border border-[#f3e4ec] bg-white p-5">
                <h2 className="flex items-center gap-2 font-bold">
                  <Play aria-hidden className="text-brand size-5" />
                  Try a sample scam call
                </h2>
                <p className="text-muted-foreground text-sm">
                  A scripted “bank security” call, line by line, to see the warnings without a real
                  call.
                </p>
                <button
                  type="button"
                  onClick={startSample}
                  className="border-brand text-brand hover:bg-brand-soft inline-flex h-10 items-center gap-2 self-start rounded-full border-2 px-4 text-sm font-semibold"
                >
                  <Play aria-hidden className="size-4" />
                  Play the sample call
                </button>
              </div>
            </div>
          </section>
        )}

        {stage === "live" && (
          <>
            <Banner level={level} flags={flags} />
            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <section
                aria-label="What the caller says"
                className="border-border flex flex-col gap-3 rounded-2xl border p-5"
              >
                <h2 className="text-muted-foreground flex items-center gap-2 text-sm font-semibold">
                  <span className="relative flex size-2.5">
                    <span className="bg-brand absolute inline-flex size-full animate-ping rounded-full opacity-60" />
                    <span className="bg-brand relative inline-flex size-2.5 rounded-full" />
                  </span>
                  {source === "sample" ? "Sample call (scripted)" : "Listening…"}
                </h2>
                <ol className="flex flex-col gap-2">
                  {lines.map((line, i) => (
                    <li
                      key={i}
                      className="animate-in fade-in rounded-xl bg-[#f4f4f6] px-3.5 py-2 duration-300"
                    >
                      <Highlighted text={line} flags={flags.filter((f) => f.line === i)} />
                    </li>
                  ))}
                  {interim && (
                    <li className="text-muted-foreground rounded-xl border border-dashed px-3.5 py-2 italic">
                      {interim}
                    </li>
                  )}
                  {lines.length === 0 && !interim && (
                    <li className="text-muted-foreground text-sm">Waiting for the caller…</li>
                  )}
                </ol>
              </section>
              <section aria-label="Red flags" className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold">Red flags so far</h2>
                {flags.length === 0 ? (
                  <p className="text-muted-foreground text-sm">None yet.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {flags.map((f) => (
                      <li
                        key={f.rule.id}
                        className={cn(
                          "flex flex-col gap-0.5 rounded-xl border p-3 text-sm",
                          f.rule.level === "critical"
                            ? "bg-risk-critical border-[#f3c6c6]"
                            : "bg-risk-high border-[#f7dcc0]",
                        )}
                      >
                        <span className="flex items-center gap-1.5 font-semibold">
                          {f.rule.level === "critical" ? (
                            <OctagonX aria-hidden className="text-risk-critical-fg size-4" />
                          ) : (
                            <TriangleAlert aria-hidden className="text-risk-high-fg size-4" />
                          )}
                          {f.rule.label}
                        </span>
                        <span className="text-muted-foreground">“{f.phrase}”</span>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={endCall}
                  className="bg-brand text-brand-foreground hover:bg-brand/90 mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold"
                >
                  <PhoneOff aria-hidden className="size-4" />
                  End call &amp; get advice
                </button>
                {micError && (
                  <p role="alert" className="text-destructive text-sm">
                    {micError}
                  </p>
                )}
              </section>
            </div>
          </>
        )}

        {stage === "advice" && (
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-2xl font-bold tracking-tight">What to do now</h1>
              <button
                type="button"
                onClick={reset}
                className="text-brand hover:bg-brand-soft rounded-full px-3 py-1.5 text-sm font-semibold"
              >
                Start again
              </button>
            </div>
            <div className="border-border h-[75vh] overflow-hidden rounded-2xl border">
              <Assistant
                variant="panel"
                initial={{
                  text: callMessage(lines, flags),
                  audience: "consumer",
                  language,
                  scenario: null,
                }}
                onClose={reset}
              />
            </div>
          </section>
        )}
      </Main>
    </div>
  );
}

/** What the assistant receives: the caller's words and the flags, as the customer's message. */
function callMessage(lines: string[], flags: Flag[]): string {
  const said = lines.join(" ").slice(-1400);
  const flagged = flags.map((f) => f.rule.label.toLowerCase()).join(", ");
  return `I was just on a phone call and I'm worried. The caller said: "${said}"${
    flagged ? ` During the call these warnings came up: ${flagged}.` : ""
  } What should I do now?`;
}

function Banner({ level, flags }: { level: ReturnType<typeof levelOf>; flags: Flag[] }) {
  const top =
    flags.find((f) => f.rule.level === "critical") ?? flags.find((f) => f.rule.level === "warning");
  const styles = {
    calm: "bg-[#f4f4f6] text-foreground border-border",
    warning: "bg-risk-high text-risk-high-fg border-[#f7dcc0]",
    critical: "bg-risk-critical text-risk-critical-fg border-[#f3c6c6]",
  }[level];
  const Icon = level === "critical" ? OctagonX : level === "warning" ? CircleAlert : ShieldCheck;
  return (
    <div
      role={level === "critical" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-4 rounded-2xl border p-5 transition-colors duration-300",
        styles,
      )}
    >
      <Icon
        aria-hidden
        className={cn("size-9 shrink-0", level === "critical" && "animate-pulse")}
      />
      <div className="flex flex-col gap-1">
        <p className="font-heading text-2xl font-bold">
          {level === "critical"
            ? "Hang up now"
            : level === "warning"
              ? "Be careful"
              : "No red flags yet"}
        </p>
        <p>{top ? top.rule.advice : "Keep listening. You can hang up at any time."}</p>
      </div>
    </div>
  );
}

function Highlighted({ text, flags }: { text: string; flags: Flag[] }) {
  if (flags.length === 0) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let rest = text;
  // Mark in reading order, whatever order the rules matched in.
  const ordered = [...flags].sort(
    (a, b) =>
      text.toLowerCase().indexOf(a.phrase.toLowerCase()) -
      text.toLowerCase().indexOf(b.phrase.toLowerCase()),
  );
  for (const f of ordered) {
    const i = rest.toLowerCase().indexOf(f.phrase.toLowerCase());
    if (i < 0) continue;
    parts.push(rest.slice(0, i));
    parts.push(
      <mark
        key={f.rule.id}
        className={cn(
          "rounded-sm px-0.5 font-semibold",
          f.rule.level === "critical"
            ? "bg-risk-critical text-risk-critical-fg"
            : "bg-risk-high text-risk-high-fg",
        )}
      >
        {rest.slice(i, i + f.phrase.length)}
      </mark>,
    );
    rest = rest.slice(i + f.phrase.length);
  }
  parts.push(rest);
  return <>{parts}</>;
}
