"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CircleCheck, LoaderCircle, Route } from "lucide-react";
import { getJourneys, type CaseDetail } from "@/lib/agent-api";
import { cn } from "@/lib/utils";
import { CaseChatView } from "@/components/agent/cases-view";
import { JOURNEYS } from "@/components/agent/results-view";

const RISK_CHIP: Record<string, string> = {
  none: "bg-risk-safe text-risk-safe-fg",
  low: "bg-risk-safe text-risk-safe-fg",
  medium: "bg-risk-medium text-risk-medium-fg",
  high: "bg-risk-high text-risk-high-fg",
  critical: "bg-risk-critical text-risk-critical-fg",
};

/**
 * The five journeys as the conversations we ran with the organisers' simulated user, one
 * tab each. A read-only showcase of saved runs: nothing is sent to the assistant here.
 */
export function JourneysPage() {
  const [journeys, setJourneys] = useState<CaseDetail[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    getJourneys()
      .then(setJourneys)
      .catch(() => setFailed(true));
  }, []);

  function onKeyDown(event: KeyboardEvent, count: number) {
    const next =
      event.key === "ArrowRight"
        ? (active + 1) % count
        : event.key === "ArrowLeft"
          ? (active - 1 + count) % count
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? count - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }

  const current = journeys?.[active];
  return (
    <div className="theme-dna flex min-h-full flex-1 flex-col bg-[#faf7f8]">
      <header className="border-border border-b bg-white">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="font-heading text-brand text-2xl leading-none font-bold tracking-tight">
              DNA
            </span>
            <span className="bg-border h-6 w-px" aria-hidden />
            <span className="font-heading flex items-center gap-1.5 font-semibold">
              <Route aria-hidden className="text-brand size-4.5" />
              The five journeys
            </span>
          </div>
          <Link
            href="/"
            className="text-brand hover:bg-brand-soft inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        <div className="flex max-w-3xl flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            One conversation for each journey
          </h1>
          <p className="text-muted-foreground">
            Each tab is a saved conversation with the organisers’ simulated customer. The assistant
            asks a question only when the advice depends on the answer, asks permission before
            looking at account data (and carries on if the customer says no), and hands over to a
            person when needed. All five passed the organisers’ evaluator.
          </p>
        </div>

        {!journeys ? (
          <p className="text-muted-foreground flex items-center gap-2 py-10 text-sm">
            <LoaderCircle aria-hidden className="text-brand size-4 animate-spin" />
            {failed ? "Couldn’t load the journeys right now." : "Loading…"}
          </p>
        ) : (
          <>
            <div
              role="tablist"
              aria-label="Journeys"
              className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
            >
              {journeys.map((j, index) => (
                <button
                  key={j.case_id}
                  ref={(el) => {
                    tabs.current[index] = el;
                  }}
                  role="tab"
                  id={`tab-${j.case_id}`}
                  aria-selected={index === active}
                  aria-controls="journey-panel"
                  tabIndex={index === active ? 0 : -1}
                  onClick={() => setActive(index)}
                  onKeyDown={(e) => onKeyDown(e, journeys.length)}
                  className={cn(
                    "flex shrink-0 flex-col items-start gap-1 rounded-xl border px-4 py-2.5 text-left transition-colors duration-150",
                    index === active
                      ? "border-brand text-brand bg-white shadow-[0_1px_2px_rgb(60_20_40/0.08)]"
                      : "text-foreground border-[#eee3e8] bg-white/60 hover:bg-white",
                  )}
                >
                  <span className="text-sm font-semibold whitespace-nowrap">
                    {JOURNEYS[j.journey] ?? j.journey}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold capitalize",
                        RISK_CHIP[j.ours.risk_level ?? "none"],
                      )}
                    >
                      {j.ours.risk_level ?? "–"}
                    </span>
                    {j.passed && (
                      <CircleCheck aria-label="Passed" className="text-risk-safe-fg size-3.5" />
                    )}
                  </span>
                </button>
              ))}
            </div>

            <section
              id="journey-panel"
              role="tabpanel"
              aria-labelledby={current ? `tab-${current.case_id}` : undefined}
              className="rounded-2xl border border-[#eee3e8] bg-white shadow-[0_1px_2px_rgb(60_20_40/0.04),0_4px_16px_rgb(60_20_40/0.04)]"
            >
              {current && <CaseChatView key={current.case_id} detail={current} />}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
