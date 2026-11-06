"use client";

import { Check, CircleCheck, CircleMinus, LockKeyhole, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ConsentTurn } from "@/lib/api";
import { useT } from "./i18n-context";

type Props = {
  turn: ConsentTurn;
  /** null until the user answers. */
  choice: boolean | null;
  busy: boolean;
  onAnswer: (granted: boolean) => void;
  headingId: string;
};

/**
 * Permission card. Lists exactly what would be looked at and why. "Allow" and
 * "Not now" are deliberately identical in size, colour and position weight.
 */
export function ConsentCard({ turn, choice, busy, onAnswer, headingId }: Props) {
  const t = useT();
  return (
    <section
      aria-labelledby={headingId}
      className="border-primary/40 bg-accent text-foreground flex flex-col gap-4 rounded-lg border p-4 sm:p-5"
    >
      <h2 id={headingId} className="flex items-center gap-2 text-lg">
        <LockKeyhole aria-hidden className="text-accent-foreground size-5 shrink-0" />
        {t.consentHeading}
      </h2>
      <p className="max-w-prose">{turn.text}</p>

      {turn.fields.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-sm font-medium">{t.consentWhat}</h3>
          <ul className="marker:text-accent-foreground flex list-disc flex-col gap-1 pl-5">
            {turn.fields.map((field) => (
              <li key={field.path}>{field.label}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-muted-foreground max-w-prose text-sm">{t.consentReassure}</p>

      {choice === null ? (
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            size="lg"
            aria-disabled={busy || undefined}
            onClick={() => !busy && onAnswer(true)}
          >
            <Check aria-hidden className="size-4" />
            {t.allow}
          </Button>
          <Button
            variant="outline"
            size="lg"
            aria-disabled={busy || undefined}
            onClick={() => !busy && onAnswer(false)}
          >
            <X aria-hidden className="size-4" />
            {t.notNow}
          </Button>
        </div>
      ) : (
        <p className="bg-card flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium">
          {choice ? (
            <CircleCheck aria-hidden className="text-primary size-4 shrink-0" />
          ) : (
            <CircleMinus aria-hidden className="text-muted-foreground size-4 shrink-0" />
          )}
          {choice ? t.consentAllowed : t.consentDeclined}
        </p>
      )}
    </section>
  );
}
