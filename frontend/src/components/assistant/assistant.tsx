"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  answerConsent,
  getScenarios,
  reply,
  startSession,
  type Answer,
  type Audience,
  type ConsentTurn,
  type ImageInput,
  type Language,
  type QuestionTurn,
  type Scenario,
  type Session,
} from "@/lib/api";
import type { ConversationDetail } from "@/lib/account-api";
import { getDictionary, type Dictionary } from "@/lib/i18n";
import type { ImageAttachment } from "@/lib/media";
import { parseYesNo } from "@/lib/voice";
import { AnswerCard } from "./answer-card";
import { AppHeader } from "./app-header";
import { Composer } from "./composer";
import { ConsentCard } from "./consent-card";
import { ErrorNotice } from "./error-notice";
import { PanelHeader } from "./panel-header";
import { I18nContext } from "./i18n-context";
import { CallBar, useVoiceCall, type LatestTurn } from "./call-mode";
import { MessageActions, answerText } from "./message-actions";
import { CampaignNote } from "./campaign-note";
import { PrivacyCard } from "./privacy-card";
import { ShareAdvice } from "./share-advice";
import { AssistantTurn, QuestionMessage, UserMessage } from "./messages";
import type { ScenariosState } from "./scenario-list";
import { ServiceStatus } from "./service-status";
import { StartView, type TopicSuggestions } from "./start-view";
import { ThinkingStatus } from "./thinking-status";

type Entry =
  | { id: string; kind: "user"; text: string; images: string[] }
  | { id: string; kind: "question"; turn: QuestionTurn }
  | { id: string; kind: "consent"; turn: ConsentTurn; choice: boolean | null }
  | { id: string; kind: "final"; answer: Answer };

type SessionMeta = { id: string; turnsUsed: number; maxTurns: number };
type Failure = { error: unknown; retry: (() => void) | null };

/** Wall-clock time, read only from event handlers and async callbacks. */
const currentTime = () => Date.now();

let entryCounter = 0;
const nextId = () => `entry-${++entryCounter}`;

function userEntry(text: string, images: ImageAttachment[]): Entry {
  return { id: nextId(), kind: "user", text, images: images.map((i) => i.previewUrl) };
}

const toInput = (images: ImageAttachment[]): ImageInput[] =>
  images.map(({ media_type, data }) => ({ media_type, data }));

/** Rebuilds a conversation reopened from the account's history. */
function entriesFromHistory(resume: ConversationDetail): Entry[] {
  return resume.messages.flatMap((m): Entry[] => {
    if (m.role === "user") return [{ id: nextId(), kind: "user", text: m.text ?? "", images: [] }];
    const turn = m.turn;
    if (!turn) return [];
    if (turn.type === "question") return [{ id: nextId(), kind: "question", turn }];
    if (turn.type === "consent_request")
      return [{ id: nextId(), kind: "consent", turn, choice: m.choice }];
    return [{ id: nextId(), kind: "final", answer: turn.answer }];
  });
}

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

/** An assistant turn as plain text, for copying and reading aloud. */
function entryText(entry: Entry, t: Dictionary): string {
  switch (entry.kind) {
    case "question":
      return entry.turn.text;
    case "consent":
      return [
        entry.turn.text,
        `${t.consentWhat}:`,
        ...entry.turn.fields.map((field) => `- ${field.label}`),
      ].join("\n");
    case "final":
      return answerText(entry.answer, t);
    default:
      return "";
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
  images?: ImageAttachment[];
};

type Props = {
  /** "page" is the standalone app; "panel" sits in the homepage's slide-out drawer. */
  variant?: "page" | "panel";
  /** Starts the conversation on mount. Remount (change `key`) to start a new one. */
  initial?: InitialRequest | null;
  defaultAudience?: Audience;
  /** Opens straight into hands-free talking (the homepage's "Talk instead"). */
  startInVoice?: boolean;
  /** Example messages for a help topic picked on the homepage. */
  topic?: TopicSuggestions | null;
  /** An example case whose opening message starts in the box, ready to edit and send. */
  prefill?: Scenario | null;
  onClose?: () => void;
  /** Reopens a conversation from the account's history instead of starting a new one. */
  resume?: ConversationDetail | null;
  /** Called after each reply from the service, e.g. to refresh a history list. */
  onActivity?: (sessionId: string) => void;
  /** Panel without its own header, for hosts that show their own (the dashboard). */
  bare?: boolean;
  /** Drawer is covering the viewport. Ignored on the full-screen page. */
  expanded?: boolean;
  onToggleExpanded?: () => void;
};

export function Assistant({
  variant = "page",
  initial = null,
  defaultAudience = "consumer",
  startInVoice = false,
  topic = null,
  prefill = null,
  onClose,
  resume = null,
  onActivity,
  bare = false,
  expanded = false,
  onToggleExpanded,
}: Props) {
  const [language, setLanguage] = useState<Language>(
    resume?.language ?? initial?.language ?? prefill?.language ?? "en",
  );
  const [audience, setAudience] = useState<Audience>(
    resume?.audience ?? initial?.audience ?? prefill?.audience ?? defaultAudience,
  );
  const t = getDictionary(language);

  const [scenarios, setScenarios] = useState<ScenariosState>({ status: "loading" });
  const [draft, setDraft] = useState(prefill?.opening_message ?? "");
  const [scenario, setScenario] = useState<Scenario | null>(initial?.scenario ?? prefill);
  const [replyDraft, setReplyDraft] = useState("");

  const [entries, setEntries] = useState<Entry[]>(() =>
    resume
      ? entriesFromHistory(resume)
      : initial
        ? [userEntry(initial.text, initial.images ?? [])]
        : [],
  );
  const [session, setSession] = useState<SessionMeta | null>(
    resume
      ? { id: resume.session_id, turnsUsed: resume.turns_used, maxTurns: resume.max_turns }
      : null,
  );
  const [loading, setLoading] = useState(initial !== null);
  // Guards the initial request against StrictMode running mount effects twice.
  const initialSent = useRef(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  // When the last reply arrived: the service deletes a chat 24 h after its last activity.
  const [lastTurnAt, setLastTurnAt] = useState<number | null>(() =>
    resume ? Date.parse(resume.updated_at) : null,
  );
  const [deleted, setDeleted] = useState(false);
  // Campaign radar note from the first reply, if enough others asked about the same thing.
  const [campaign, setCampaign] = useState<{ others: number } | null>(null);
  const [announce, setAnnounce] = useState("");
  // Bumped on "Start over" so late responses from an abandoned session are ignored.
  const generation = useRef(0);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // The homepage strip chooses the audience. Follow it until a conversation starts
  // (adjusted during render rather than in an effect, as React recommends).
  const [followedAudience, setFollowedAudience] = useState(defaultAudience);
  if (variant === "panel" && entries.length === 0 && followedAudience !== defaultAudience) {
    setFollowedAudience(defaultAudience);
    setAudience(defaultAudience);
  }

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
      if (result.campaign) setCampaign({ others: result.campaign.others });
      setLastTurnAt(currentTime());
      onActivity?.(result.session_id);
      setAnnounce(announcement(entry, t));
    } catch (error) {
      if (gen !== generation.current) return;
      setFailure({ error, retry: () => void run(call) });
    } finally {
      if (gen === generation.current) setLoading(false);
    }
  }

  function handleStart(text: string, images: ImageAttachment[]) {
    setEntries([userEntry(text, images)]);
    const input = {
      audience,
      language,
      message: text,
      images: toInput(images),
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
      images: toInput(initial.images ?? []),
      scenario_id: initial.scenario?.id,
    };
    void run(() => startSession(input));
    // Runs once per mount; the host remounts with a new key for a new request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleReply(text: string, images: ImageAttachment[]) {
    if (!session || loading) return;
    const id = session.id;
    setEntries((prev) => [...prev, userEntry(text, images)]);
    setReplyDraft("");
    void run(() => reply(id, text, toInput(images)));
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
    call.stop();
    setDeleted(false);
    setLastTurnAt(null);
    setCampaign(null);
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

  const latestTurn: LatestTurn | null = lastAssistant
    ? { id: lastAssistant.id, kind: lastAssistant.kind, text: entryText(lastAssistant, t) }
    : null;

  /** What was said during a call goes where typing would have gone. */
  function handleSpoken(text: string): boolean {
    if (!inConversation) {
      handleStart(text, []);
      return true;
    }
    if (lastAssistant?.kind === "question") {
      handleReply(text, []);
      return true;
    }
    if (lastAssistant?.kind === "consent" && lastAssistant.choice === null) {
      const granted = parseYesNo(text, language);
      if (granted === null) return false;
      handleConsent(lastAssistant.id, granted);
      return true;
    }
    return false;
  }

  const call = useVoiceCall({
    language,
    latest: latestTurn,
    failed: failure !== null,
    onSay: handleSpoken,
  });
  const inCall = call.phase !== "off";

  useEffect(() => {
    if (!startInVoice) return;
    // A timer, not a ref guard: in development React mounts twice and the first
    // cleanup aborts the call, so the call must start on the mount that stays.
    const timer = setTimeout(() => void call.start(null), 0);
    return () => clearTimeout(timer);
    // Once per mount; the host remounts with a new key for a new call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finalEntry = entries.find((e) => e.kind === "final");
  const consentEntries = entries.filter((e) => e.kind === "consent");
  const allowedLabels = consentEntries.flatMap((e) =>
    e.choice === true ? e.turn.fields.map((f) => f.label) : [],
  );
  const declinedLabels = consentEntries.flatMap((e) =>
    e.choice === false ? e.turn.fields.map((f) => f.label) : [],
  );
  const screenshotCount = entries.reduce(
    (n, e) => n + (e.kind === "user" ? e.images.length : 0),
    0,
  );

  const talkButton = !inCall && !deleted && (
    <Button variant="outline" size="sm" onClick={() => void call.start(latestTurn)}>
      <Mic aria-hidden className="size-3.5" />
      {inConversation ? t.talkShort : t.talk}
    </Button>
  );

  const content = (
    <>
      {!inConversation ? (
        <StartView
          topic={topic}
          talkButton={talkButton}
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
              {talkButton}
              <Button variant="ghost" size="sm" onClick={startOver}>
                <RotateCcw aria-hidden className="size-3.5" />
                {t.startOver}
              </Button>
            </div>
          </div>

          <ol aria-label={t.startHeading} className="flex flex-col gap-6">
            {entries.map((entry, index) => (
              <li key={entry.id}>
                {entry.kind === "user" ? (
                  <>
                    <UserMessage text={entry.text} images={entry.images} />
                    {index === 0 && campaign && <CampaignNote others={campaign.others} />}
                  </>
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
                    <MessageActions text={entryText(entry, t)} language={language} />
                  </AssistantTurn>
                )}
              </li>
            ))}
          </ol>

          {finalEntry?.kind === "final" && session && (
            <div className="flex flex-col gap-4">
              <ShareAdvice answer={finalEntry.answer} audience={audience} />
              <PrivacyCard
                sessionId={session.id}
                language={language}
                allowed={allowedLabels}
                declined={declinedLabels}
                screenshots={screenshotCount}
                expiresAt={lastTurnAt ? new Date(lastTurnAt + 24 * 60 * 60 * 1000) : null}
                handedOff={finalEntry.answer.escalation_required}
                onDeleted={() => setDeleted(true)}
              />
            </div>
          )}

          {loading && <ThinkingStatus />}
          {failure && (
            <ErrorNotice error={failure.error} onRetry={failure.retry} onStartOver={startOver} />
          )}

          {awaitingAnswer && !inCall && (
            <Composer
              value={replyDraft}
              onChange={setReplyDraft}
              onSubmit={handleReply}
              busy={loading}
              language={language}
              label={t.answerLabel}
              placeholder={t.answerPlaceholder}
              rows={2}
            />
          )}
        </div>
      )}
      {inCall && call.phase !== "off" && (
        <div className="mt-6">
          <CallBar phase={call.phase} heard={call.heard} notice={call.notice} onEnd={call.stop} />
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
          {!bare && (
            <PanelHeader
              language={language}
              onLanguageChange={setLanguage}
              expanded={expanded}
              onToggleExpanded={onToggleExpanded}
              onClose={onClose}
            />
          )}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div
              id="assistant-main"
              className={expanded ? "mx-auto w-full max-w-3xl px-5 pt-6 pb-10" : "px-5 pt-6 pb-10"}
            >
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
