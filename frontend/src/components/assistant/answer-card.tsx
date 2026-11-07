"use client";

import { BookOpen, Clock, Info, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Answer } from "@/lib/api";
import { cn } from "@/lib/utils";
import { HandoffPanel } from "./handoff-panel";
import { useT } from "./i18n-context";
import { RISK_STYLES } from "./risk";

type Props = {
  answer: Answer;
  sessionId: string;
  headingId: string;
  onStartOver: () => void;
};

/**
 * The one dominant element of the page: risk + urgency strip, the action as
 * the headline, plain-language reason, numbered steps, optional handoff, and
 * where the advice comes from.
 */
export function AnswerCard({ answer, sessionId, headingId, onStartOver }: Props) {
  const t = useT();
  const risk = RISK_STYLES[answer.risk_level];
  const RiskIcon = risk.icon;
  const unsure = answer.confidence < 0.6;

  return (
    <article
      aria-labelledby={headingId}
      className={cn("bg-card overflow-hidden rounded-lg border-2 shadow-sm", risk.line)}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2.5 sm:px-5",
          risk.surface,
        )}
      >
        <p className="flex items-center gap-2 font-medium">
          <RiskIcon aria-hidden className="size-5 shrink-0" />
          <span className="sr-only">{t.riskHeading}: </span>
          {t.risk[answer.risk_level]}
        </p>
        <p className="flex items-center gap-1.5 text-sm">
          <Clock aria-hidden className="size-4 shrink-0" />
          <span>
            {t.urgencyLabel}: <span className="font-medium">{t.urgency[answer.urgency]}</span>
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-3">
          <h2 id={headingId} tabIndex={-1} className="text-xl outline-none">
            {answer.action_label}
          </h2>
          <p className="max-w-prose">{answer.advice_text}</p>
          <p
            className={cn(
              "flex items-start gap-1.5 text-sm",
              unsure ? "text-risk-medium-fg font-medium" : "text-muted-foreground",
            )}
          >
            <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t.confidence(answer.confidence)}
          </p>
        </div>

        {answer.escalation_required && (
          <HandoffPanel sessionId={sessionId} escalationLabel={answer.escalation_label} />
        )}

        {answer.steps.length > 0 && (
          <section aria-labelledby={`${headingId}-steps`} className="flex flex-col gap-3">
            <h3 id={`${headingId}-steps`} className="text-base">
              {t.whatToDo}
            </h3>
            <ol role="list" className="flex flex-col gap-3">
              {answer.steps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span
                    aria-hidden
                    className="bg-accent text-accent-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-medium tabular-nums"
                  >
                    {index + 1}
                  </span>
                  <span className="max-w-prose pt-0.5">
                    <span className="sr-only">{index + 1}. </span>
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* The AI didn't call for a person, but the customer can still ask for one. */}
        {!answer.escalation_required && (
          <HandoffPanel sessionId={sessionId} escalationLabel={null} optional={{ unsure }} />
        )}

        <section
          aria-labelledby={`${headingId}-sources`}
          className="border-border flex flex-col gap-2 border-t pt-5"
        >
          <h3 id={`${headingId}-sources`} className="text-sm">
            {t.whyHeading}
          </h3>
          {answer.citations.length > 0 && (
            <ul className="flex flex-col gap-1.5 text-sm">
              {answer.citations.map((citation) => (
                <li key={citation.id} className="flex gap-2">
                  <BookOpen aria-hidden className="text-primary mt-0.5 size-4 shrink-0" />
                  {citation.title}
                </li>
              ))}
            </ul>
          )}
          <p className="text-muted-foreground max-w-prose text-xs">{t.sourcesNote}</p>
        </section>
      </div>

      <div className="border-border bg-muted/60 border-t px-4 py-3 sm:px-6">
        <Button variant="ghost" onClick={onStartOver} className="-ml-2">
          <RotateCcw aria-hidden className="size-4" />
          {t.startOver}
        </Button>
      </div>
    </article>
  );
}
