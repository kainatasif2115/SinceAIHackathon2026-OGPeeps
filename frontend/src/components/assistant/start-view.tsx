"use client";

import { LockKeyhole, X } from "lucide-react";
import type { Audience, Language, Scenario } from "@/lib/api";
import { Composer } from "./composer";
import { useT } from "./i18n-context";
import { ScenarioList, type ScenariosState } from "./scenario-list";

type Props = {
  draft: string;
  onDraftChange: (value: string) => void;
  selectedScenario: Scenario | null;
  onClearScenario: () => void;
  onSubmit: (text: string) => void;
  scenarios: ScenariosState;
  audience: Audience;
  language: Language;
  onPickScenario: (scenario: Scenario) => void;
};

export function StartView({
  draft,
  onDraftChange,
  selectedScenario,
  onClearScenario,
  onSubmit,
  scenarios,
  audience,
  language,
  onPickScenario,
}: Props) {
  const t = useT();
  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="start-heading" className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 id="start-heading" tabIndex={-1} className="text-2xl outline-none">
            {t.startHeading}
          </h1>
          <p className="text-muted-foreground max-w-prose">{t.startIntro}</p>
        </div>

        {selectedScenario && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="text-muted-foreground">{t.usingExample}</span>
            <span lang={selectedScenario.language} className="font-medium">
              {selectedScenario.title}
            </span>
            <button
              type="button"
              onClick={onClearScenario}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-sm"
            >
              <X aria-hidden className="size-4" />
              <span className="sr-only sm:not-sr-only">{t.clearExample}</span>
            </button>
          </p>
        )}

        <Composer
          value={draft}
          onChange={onDraftChange}
          onSubmit={onSubmit}
          busy={false}
          labelledBy="start-heading"
          placeholder={t.startPlaceholder}
          rows={4}
        />

        <div className="bg-muted text-muted-foreground flex gap-2 rounded-md px-3 py-2.5 text-sm">
          <LockKeyhole aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p>
            {t.privacyStored} {t.privacyNoSecrets}
          </p>
        </div>
      </section>

      <section aria-labelledby="examples-heading" className="flex flex-col gap-3">
        <h2 id="examples-heading" className="text-lg">
          {t.examplesHeading}
        </h2>
        <ScenarioList
          state={scenarios}
          audience={audience}
          language={language}
          onPick={onPickScenario}
        />
      </section>
    </div>
  );
}
