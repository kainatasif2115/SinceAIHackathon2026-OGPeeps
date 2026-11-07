"use client";

import { useEffect, useRef, useState } from "react";
import { getScenarios, type Audience, type Scenario } from "@/lib/api";
import type { InitialRequest } from "@/components/assistant/assistant";
import type { ScenariosState } from "@/components/assistant/scenario-list";
import { ChatLauncher, ChatPanel } from "./chat-panel";
import { Hero } from "./hero";
import { HelpTopics, HowItWorks, ScamsNow, TrustBand } from "./sections";
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
  const [request, setRequest] = useState<{ key: number; initial: InitialRequest | null }>({
    key: 0,
    initial: null,
  });
  const launcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    getScenarios()
      .then((list) => setScenarios({ status: "ready", scenarios: list }))
      .catch(() => setScenarios({ status: "error" }));
  }, []);

  function openPanel() {
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    launcherRef.current?.focus();
  }

  function ask(text: string) {
    setRequest((prev) => ({
      key: prev.key + 1,
      initial: { text, audience, language: "en", scenario: null },
    }));
    setPanelOpen(true);
  }

  function askScenario(scenario: Scenario) {
    setAudience(scenario.audience);
    setRequest((prev) => ({
      key: prev.key + 1,
      initial: {
        text: scenario.opening_message,
        audience: scenario.audience,
        language: scenario.language,
        scenario,
      },
    }));
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
      <TopStrip audience={audience} onAudienceChange={setAudience} />
      <SiteHeader onOpenAssistant={openPanel} />

      <main id="main" className="flex-1">
        <Hero audience={audience} scenarios={scenarios} onAsk={ask} onPickScenario={askScenario} />
        <HelpTopics audience={audience} onOpen={openPanel} />
        <HowItWorks />
        <ScamsNow audience={audience} scenarios={scenarios} onPick={askScenario} />
        <TrustBand onOpen={openPanel} />
      </main>

      <SiteFooter />

      <ChatLauncher ref={launcherRef} hidden={panelOpen} onClick={openPanel} />
      <ChatPanel
        open={panelOpen}
        onClose={closePanel}
        assistantKey={request.key}
        initial={request.initial}
        audience={audience}
      />
    </div>
  );
}
