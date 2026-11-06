"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Audience, Language, Scenario } from "@/lib/api";
import { useT } from "./i18n-context";

export type ScenariosState =
  { status: "loading" } | { status: "error" } | { status: "ready"; scenarios: Scenario[] };

type Props = {
  state: ScenariosState;
  audience: Audience;
  language: Language;
  onPick: (scenario: Scenario) => void;
};

const INITIAL_COUNT = 4;

/** Example situations for the selected audience, current language first. */
export function ScenarioList({ state, audience, language, onPick }: Props) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);

  if (state.status === "loading") {
    return <p className="text-muted-foreground text-sm">{t.examplesLoading}</p>;
  }
  if (state.status === "error") {
    return <p className="text-muted-foreground text-sm">{t.examplesError}</p>;
  }

  const matching = state.scenarios
    .filter((s) => s.audience === audience)
    .sort((a, b) => Number(b.language === language) - Number(a.language === language));
  if (matching.length === 0) {
    return <p className="text-muted-foreground text-sm">{t.examplesEmpty}</p>;
  }
  const visible = expanded ? matching : matching.slice(0, INITIAL_COUNT);
  const hidden = matching.length - visible.length;

  return (
    <div className="flex flex-col gap-3">
      <ul className="divide-border border-border bg-card divide-y overflow-hidden rounded-lg border">
        {visible.map((scenario) => (
          <li key={scenario.id}>
            <button
              type="button"
              onClick={() => onPick(scenario)}
              className="group hover:bg-muted flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 focus-visible:-outline-offset-2"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-muted-foreground flex items-center gap-2 text-xs">
                  {scenario.journey_label}
                  <span
                    className="border-border rounded-sm border px-1 text-[0.6875rem] leading-4 font-medium"
                    title={t.exampleLanguage(t.languageNames[scenario.language])}
                  >
                    <span aria-hidden>{scenario.language.toUpperCase()}</span>
                    <span className="sr-only">
                      {t.exampleLanguage(t.languageNames[scenario.language])}
                    </span>
                  </span>
                </span>
                <span lang={scenario.language} className="font-medium">
                  {scenario.title}
                </span>
              </span>
              <ArrowRight
                aria-hidden
                className="text-muted-foreground size-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5"
              />
            </button>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-primary self-start rounded-sm text-sm font-medium underline-offset-4 hover:underline"
        >
          {t.showMore(hidden)}
        </button>
      )}
    </div>
  );
}
