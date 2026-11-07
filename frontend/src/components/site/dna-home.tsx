"use client";

import { useEffect, useRef, useState } from "react";
import { getScenarios, type Audience, type Scenario } from "@/lib/api";
import { getAccount } from "@/lib/account-api";
import type { InitialRequest } from "@/components/assistant/assistant";
import type { ImageAttachment } from "@/lib/media";
import type { ScenariosState } from "@/components/assistant/scenario-list";
import type { TopicSuggestions } from "@/components/assistant/start-view";
import { ChatLauncher, ChatPanel } from "./chat-panel";
import { Anatomy } from "./anatomy";
import { Hero } from "./hero";
import { ScrollProgress } from "./motion";
import { Proof } from "./proof";
import { RedTeam } from "./red-team";
import { BeforeAfter, HelpTopics, TrustBand } from "./sections";
import { PanicToPlan } from "./panic-to-plan";
import { RealOrScam, ScrollStatement } from "./scroll-stories";
import { SiteFooter, SiteHeader, TopStrip } from "./site-chrome";

/**
 * DNA-style homepage (prototype) with the security assistant built in.
 * The assistant lives in a slide-out panel so the page stays a normal
 * operator homepage; the hero, help topics and scam examples all open it.
 */
export function DnaHome() {
  const [audience, setAudience] = useState<Audience>("consumer");
  const [scenarios, setScenarios] = useState<ScenariosState>({ status: "loading" });
  const [panelOpen, setPanelOpen] = useState(false);
  // Each new request remounts the assistant (via key) so it starts fresh.
  const [request, setRequest] = useState<{
    key: number;
    initial: InitialRequest | null;
    voice?: boolean;
    topic?: TopicSuggestions;
    prefill?: Scenario;
  }>({
    key: 0,
    initial: null,
  });
  const launcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    getScenarios()
      .then((list) => setScenarios({ status: "ready", scenarios: list }))
      .catch(() => setScenarios({ status: "error" }));
  }, []);

  // A business account starts in Business mode, once per sign-in, so switching to
  // Private for a personal matter sticks while you browse.
  const audienceSetFor = useRef<string | null>(null);
  useEffect(() => {
    getAccount()
      .then((account) => {
        const key = account?.email ?? null;
        if (key === audienceSetFor.current) return;
        audienceSetFor.current = key;
        setAudience(account?.kind === "business" ? "small_business" : "consumer");
      })
      .catch(() => undefined);
    // Runs on mount and whenever Next shows the preserved page again (after login/logout).
  }, []);

  function openPanel() {
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    launcherRef.current?.focus();
  }

  function ask(text: string, images: ImageAttachment[]) {
    setRequest((prev) => ({
      key: prev.key + 1,
      initial: { text, audience, language: "en", scenario: null, images },
    }));
    setPanelOpen(true);
  }

  /** "Talk instead": a fresh conversation that opens straight into hands-free mode. */
  function talk() {
    setRequest((prev) => ({ key: prev.key + 1, initial: null, voice: true }));
    setPanelOpen(true);
  }

  /** A help topic: a fresh conversation that offers example messages for it. */
  function openTopic(topic: TopicSuggestions) {
    setRequest((prev) => ({ key: prev.key + 1, initial: null, topic }));
    setPanelOpen(true);
  }

  /** An example case: a fresh conversation with its message in the box, ready to edit and send. */
  function askScenario(scenario: Scenario) {
    setAudience(scenario.audience);
    setRequest((prev) => ({ key: prev.key + 1, initial: null, prefill: scenario }));
    setPanelOpen(true);
  }

  return (
    <div className="theme-dna flex min-h-full flex-1 flex-col">
      <a
        href="#main"
        className="focus:bg-card sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <ScrollProgress />
      <TopStrip audience={audience} onAudienceChange={setAudience} />
      <SiteHeader onOpenAssistant={openPanel} />

      <main id="main" className="flex-1">
        <Hero
          audience={audience}
          scenarios={scenarios}
          onAsk={ask}
          onTalk={talk}
          onOpen={openPanel}
          onPickScenario={askScenario}
        />
        <ScrollStatement />
        <BeforeAfter />
        <Anatomy />
        <RealOrScam />
        <HelpTopics audience={audience} onOpen={openTopic} />
        <PanicToPlan />
        <Proof />
        <RedTeam />
        <TrustBand onOpen={openPanel} />
      </main>

      <SiteFooter />

      <ChatLauncher ref={launcherRef} hidden={panelOpen} onClick={openPanel} />
      <ChatPanel
        open={panelOpen}
        onClose={closePanel}
        assistantKey={request.key}
        initial={request.initial}
        startInVoice={request.voice ?? false}
        topic={request.topic ?? null}
        prefill={request.prefill ?? null}
        audience={audience}
      />
    </div>
  );
}
