"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  answerConsent,
  getScenarios,
  reply,
  startSession,
  type Answer,
  type Audience,
  type ConsentTurn,
  type Language,
  type QuestionTurn,
  type Scenario,
  type Session,
} from "@/lib/api";
import { getDictionary, type Dictionary } from "@/lib/i18n";
import { AnswerCard } from "./answer-card";
import { AppHeader } from "./app-header";
import { Composer } from "./composer";
import { ConsentCard } from "./consent-card";
import { ErrorNotice } from "./error-notice";
import { PanelHeader } from "./panel-header";
import { I18nContext } from "./i18n-context";
import { AssistantTurn, QuestionMessage, UserMessage } from "./messages";
import type { ScenariosState } from "./scenario-list";
import { ServiceStatus } from "./service-status";
import { StartView } from "./start-view";
import { ThinkingStatus } from "./thinking-status";

type Entry =
  | { id: string; kind: "user"; text: string }
  | { id: string; kind: "question"; turn: QuestionTurn }
  | { id: string; kind: "consent"; turn: ConsentTurn; choice: boolean | null }
  | { id: string; kind: "final"; answer: Answer };

type SessionMeta = { id: string; turnsUsed: number; maxTurns: number };
type Failure = { error: unknown; retry: (() => void) | null };

let entryCounter = 0;
const nextId = () => `entry-${++entryCounter}`;

function entryFromSession(session: Session): Entry {
  const { turn } = session;
  switch (turn.type) {
    case "question":
      return { id: nextId(), kind: "question", turn };
    case "consent_request":
      return { id: nextId(), kind: "consent", turn, choice: null };
    case "final":
      return { id: nextId(), kind: "final", answer: turn.answer };
  }
}

/** What a screen reader hears when a new assistant turn arrives. */
function announcement(entry: Entry, t: Dictionary): string {
  switch (entry.kind) {
    case "question":
      return `${t.assistant}: ${entry.turn.text}`;
    case "consent":
      return `${t.consentHeading} ${entry.turn.text}`;
    case "final":
      return `${t.risk[entry.answer.risk_level]}. ${entry.answer.action_label}`;
    default:
      return "";
  }
}

/** A conversation the host page asks to open with (e.g. from the homepage hero). */
export type InitialRequest = {
  text: string;
  audience: Audience;
  language: Language;
  scenario: Scenario | null;
};

type Props = {
  /** "page" is the standalone app; "panel" sits in the homepage's slide-out drawer. */
  variant?: "page" | "panel";
  /** Starts the conversation on mount. Remount (change `key`) to start a new one. */
  initial?: InitialRequest | null;
  defaultAudience?: Audience;
  onClose?: () => void;
};

export function Assistant({
  variant = "page",
  initial = null,
  defaultAudience = "consumer",
  onClose,
}: Props) {
  const [language, setLanguage] = useState<Language>(initial?.language ?? "en");
  const [audience, setAudience] = useState<Audience>(initial?.audience ?? defaultAudience);
  const t = getDictionary(language);

  const [scenarios, setScenarios] = useState<ScenariosState>({ status: "loading" });
  const [draft, setDraft] = useState("");
  const [scenario, setScenario] = useState<Scenario | null>(initial?.scenario ?? null);
  const [replyDraft, setReplyDraft] = useState("");

  const [entries, setEntries] = useState<Entry[]>(() =>
    initial ? [{ id: nextId(), kind: "user", text: initial.text }] : [],
  );
  const [session, setSession] = useState<SessionMeta | null>(null);
  const [loading, setLoading] = useState(initial !== null);
  // Guards the initial request against StrictMode running mount effects twice.
  const initialSent = useRef(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [announce, setAnnounce] = useState("");
  // Bumped on "Start over" so late responses from an abandoned session are ignored.
  const generation = useRef(0);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    getScenarios()
      .then((list) => setScenarios({ status: "ready", scenarios: list }))
      .catch(() => setScenarios({ status: "error" }));
  }, []);

  // Bring each new assistant turn into view. If the control the user was on
  // has gone (e.g. the consent buttons), move focus to the new turn.
  const lastEntry = entries.at(-1);
  const newestTurnId = lastEntry && lastEntry.kind !== "user" ? lastEntry.id : null;
  useEffect(() => {
    if (!newestTurnId) return;
    const el = document.getElementById(newestTurnId);
    if (!el) return;
    // An instant jump: smooth scrolling over a long card is more motion than needed.
    el.scrollIntoView({ block: "start" });
    const active = document.activeElement;
    if (!active || active === document.body || !active.isConnected) {
      const heading = el.querySelector<HTMLElement>("h2[tabindex='-1']");
      (heading ?? el).focus({ preventScroll: true });
    }
  }, [newestTurnId]);

  async function run(call: () => Promise<Session>) {
    const gen = generation.current;
    setLoading(true);
    setFailure(null);
    try {
      const result = await call();
      if (gen !== generation.current) return;
      const entry = entryFromSession(result);
      setSession({
        id: result.session_id,
        turnsUsed: result.turns_used,
        maxTurns: result.max_turns,
      });
      setEntries((prev) => [...prev, entry]);
      setAnnounce(announcement(entry, t));
    } catch (error) {
      if (gen !== generation.current) return;
      setFailure({ error, retry: () => void run(call) });
    } finally {
      if (gen === generation.current) setLoading(false);
    }
  }

  function handleStart(text: string) {
    setEntries([{ id: nextId(), kind: "user", text }]);
    const input = {
      audience,
      language,
      message: text,
      scenario_id: scenario?.id,
    };
    void run(() => startSession(input));
  }

  useEffect(() => {
    if (!initial || initialSent.current) return;
    initialSent.current = true;
    const input = {
      audience: initial.audience,
      language: initial.language,
      message: initial.text,
      scenario_id: initial.scenario?.id,
    };
    void run(() => startSession(input));
    // Runs once per mount; the host remounts with a new key for a new request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleReply(text: string) {
    if (!session || loading) return;
    const id = session.id;
    setEntries((prev) => [...prev, { id: nextId(), kind: "user", text }]);
    setReplyDraft("");
    void run(() => reply(id, text));
  }

  function handleConsent(entryId: string, granted: boolean) {
    if (!session || loading) return;
    const id = session.id;
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId && e.kind === "consent" ? { ...e, choice: granted } : e)),
    );
    void run(() => answerConsent(id, granted));
  }

  function handlePickScenario(picked: Scenario) {
    setScenario(picked);
    setDraft(picked.opening_message);
    setAudience(picked.audience);
    setLanguage(picked.language);
    document.getElementById("start-heading")?.scrollIntoView({ block: "start" });
  }

  function handleDraftChange(value: string) {
    setDraft(value);
    if (!value.trim()) setScenario(null);
  }

  function startOver() {
    generation.current += 1;
    setEntries([]);
    setSession(null);
    setLoading(false);
    setFailure(null);
    // If the very first message failed, keep it so it can be sent again.
    if (session) {
      setDraft("");
      setScenario(null);
    }
    setReplyDraft("");
    setAnnounce("");
    requestAnimationFrame(() => {
      const heading = document.getElementById("start-heading");
      heading?.focus();
      window.scrollTo({ top: 0 });
    });
  }

  const inConversation = entries.length > 0;
  const lastAssistant = entries.findLast((e) => e.kind !== "user");
  const awaitingAnswer = lastAssistant?.kind === "question" && !failure;

  const content = (
    <>
      {!inConversation ? (
        <StartView
          draft={draft}
          onDraftChange={handleDraftChange}
          selectedScenario={scenario}
          onClearScenario={() => {
            setScenario(null);
            setDraft("");
          }}
          onSubmit={handleStart}
          scenarios={scenarios}
          audience={audience}
          language={language}
          onPickScenario={handlePickScenario}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="border-border flex items-center justify-between gap-3 border-b pb-3">
            <h1 id="start-heading" tabIndex={-1} className="text-base outline-none">
              {t.startHeading}
            </h1>
            <div className="flex items-center gap-3">
              {session && (
                <span className="text-muted-foreground text-xs tabular-nums">
                  {t.turnCounter(session.turnsUsed, session.maxTurns)}
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={startOver}>
                <RotateCcw aria-hidden className="size-3.5" />
                {t.startOver}
              </Button>
            </div>
          </div>

          <ol aria-label={t.startHeading} className="flex flex-col gap-6">
            {entries.map((entry) => (
              <li key={entry.id}>
                {entry.kind === "user" ? (
                  <UserMessage text={entry.text} />
                ) : (
                  <AssistantTurn id={entry.id}>
                    {entry.kind === "question" && <QuestionMessage turn={entry.turn} />}
                    {entry.kind === "consent" && (
                      <ConsentCard
                        turn={entry.turn}
                        choice={entry.choice}
                        busy={loading}
                        headingId={`${entry.id}-heading`}
                        onAnswer={(granted) => handleConsent(entry.id, granted)}
                      />
                    )}
                    {entry.kind === "final" && session && (
                      <AnswerCard
                        answer={entry.answer}
                        sessionId={session.id}
                        headingId={`${entry.id}-heading`}
                        onStartOver={startOver}
                      />
                    )}
                  </AssistantTurn>
                )}
              </li>
            ))}
          </ol>

          {loading && <ThinkingStatus />}
          {failure && (
            <ErrorNotice error={failure.error} onRetry={failure.retry} onStartOver={startOver} />
          )}

          {awaitingAnswer && (
            <Composer
              value={replyDraft}
              onChange={setReplyDraft}
              onSubmit={handleReply}
              busy={loading}
              label={t.answerLabel}
              placeholder={t.answerPlaceholder}
              rows={2}
            />
          )}
        </div>
      )}
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
    </>
  );

  const skipLink = (
    <a
      href="#main"
      className="focus:bg-card sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:rounded-md focus:px-3 focus:py-2"
    >
      {t.skipToContent}
    </a>
  );

  const headerProps = {
    audience,
    language,
    onAudienceChange: (value: Audience) => {
      setAudience(value);
      setScenario(null);
    },
    onLanguageChange: setLanguage,
    audienceLocked: inConversation,
  };

  if (variant === "panel") {
    return (
      <I18nContext value={t}>
        <div className="flex h-full flex-col">
          <PanelHeader {...headerProps} onClose={onClose} />
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div id="assistant-main" className="px-5 pt-6 pb-10">
              {content}
            </div>
          </div>
        </div>
      </I18nContext>
    );
  }

  return (
    <I18nContext value={t}>
      {skipLink}
      <AppHeader {...headerProps} />

      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 pt-8 pb-16 sm:pt-12">
        {content}
      </main>

      <footer className="border-border border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-2xl flex-col gap-1 px-4 py-4 text-xs sm:flex-row sm:justify-between">
          <ServiceStatus />
          <p>DNA × Since AI Hackathon 2026</p>
        </div>
      </footer>
    </I18nContext>
  );
}
