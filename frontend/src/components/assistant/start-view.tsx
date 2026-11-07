"use client";

import { ArrowRight, LockKeyhole, X } from "lucide-react";
import type { Audience, Language, Scenario } from "@/lib/api";
import type { ImageAttachment } from "@/lib/media";
import { Composer } from "./composer";
import { useT } from "./i18n-context";
import { ScenarioList, type ScenariosState } from "./scenario-list";

/** A help topic picked on the homepage, with example messages to start from. */
export type TopicSuggestions = { title: string; examples: string[] };

type Props = {
  topic?: TopicSuggestions | null;
  /** "Talk instead" button for hands-free mode, if available. */
  talkButton?: React.ReactNode;
  draft: string;
  onDraftChange: (value: string) => void;
  selectedScenario: Scenario | null;
  onClearScenario: () => void;
  onSubmit: (text: string, images: ImageAttachment[]) => void;
  scenarios: ScenariosState;
  audience: Audience;
  language: Language;
  onPickScenario: (scenario: Scenario) => void;
};

export function StartView({
  topic,
  talkButton,
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
          {talkButton && <div className="pt-1">{talkButton}</div>}
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

        {topic && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">
              {topic.title}: start with one of these, or write your own
            </p>
            <ul className="flex flex-col gap-2">
              {topic.examples.map((example) => (
                <li key={example}>
                  <button
                    type="button"
                    onClick={() => onSubmit(example, [])}
                    className="group border-border hover:border-brand hover:bg-brand-soft/40 flex w-full items-center gap-3 rounded-2xl rounded-br-md border px-4 py-3 text-left text-sm transition-colors duration-150"
                  >
                    <span className="flex-1">{example}</span>
                    <ArrowRight
                      aria-hidden
                      className="text-muted-foreground group-hover:text-brand size-4 shrink-0 transition-[color,transform] duration-150 group-hover:translate-x-0.5"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Composer
          value={draft}
          onChange={onDraftChange}
          onSubmit={onSubmit}
          busy={false}
          language={language}
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
