"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "./i18n-context";

/** Where ticked steps are remembered for a conversation, so reopening it keeps them. */
const storageKey = (sessionId: string) => `steps-done:${sessionId}`;

function load(sessionId: string): number[] {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(sessionId)) ?? "[]");
    return Array.isArray(saved) ? saved.filter((n) => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

/**
 * The advice's steps as a checklist the customer ticks off as they go. Each step is a
 * real checkbox (keyboard and screen-reader friendly); the circle shows its number until
 * it is done. Ticks are kept in this browser only.
 */
export function StepChecklist({
  steps,
  sessionId,
  headingId,
}: {
  steps: string[];
  sessionId: string;
  headingId: string;
}) {
  const t = useT();
  const [done, setDone] = useState<number[]>(() => load(sessionId));
  const count = done.filter((i) => i < steps.length).length;

  function toggle(index: number) {
    setDone((prev) => {
      const next = prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index];
      try {
        localStorage.setItem(storageKey(sessionId), JSON.stringify(next));
      } catch {
        // Private mode or blocked storage: the ticks just aren't remembered.
      }
      return next;
    });
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 id={headingId} className="text-base">
          {t.whatToDo}
        </h3>
        <p
          aria-live="polite"
          className={cn(
            "text-sm",
            count === steps.length ? "text-risk-safe-fg font-medium" : "text-muted-foreground",
          )}
        >
          {t.stepsDone(count, steps.length)}
        </p>
      </div>
      <ol role="list" className="flex flex-col gap-1">
        {steps.map((step, index) => {
          const checked = done.includes(index);
          return (
            <li key={index}>
              <label className="hover:bg-muted/60 has-focus-visible:ring-ring -mx-2 flex cursor-pointer gap-3 rounded-md px-2 py-1.5 transition-colors duration-150 has-focus-visible:ring-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(index)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-medium tabular-nums transition-colors duration-150",
                    checked
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent text-accent-foreground",
                  )}
                >
                  {checked ? <Check className="size-4" strokeWidth={3} /> : index + 1}
                </span>
                <span
                  className={cn(
                    "max-w-prose pt-0.5 transition-colors duration-150",
                    checked && "text-muted-foreground line-through decoration-1",
                  )}
                >
                  <span className="sr-only">{index + 1}. </span>
                  {step}
                </span>
              </label>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
