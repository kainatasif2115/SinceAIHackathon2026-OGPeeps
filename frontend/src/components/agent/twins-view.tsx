"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleCheck,
  CircleHelp,
  CircleX,
  GitFork,
  Headset,
  LoaderCircle,
  ShieldCheck,
  User,
} from "lucide-react";
import { listTwins, type TwinBranch, type TwinPair } from "@/lib/agent-api";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { JOURNEYS } from "./results-view";
import { Select } from "./select";

const RISK_CHIP: Record<string, string> = {
  none: "bg-risk-safe text-risk-safe-fg",
  low: "bg-risk-safe text-risk-safe-fg",
  medium: "bg-risk-medium text-risk-medium-fg",
  high: "bg-risk-high text-risk-high-fg",
  critical: "bg-risk-critical text-risk-critical-fg",
};

const TOPICS: Record<string, string> = {
  code_shared: "did they share the code?",
  credentials_entered: "did they type their login details?",
  card_details_entered: "did they type their card details?",
  money_transferred: "has the money already gone?",
  payment_status: "has the payment already gone?",
  app_installed: "did they install the app?",
  remote_access_given: "did they give remote access?",
  self_initiated: "did they do it themselves?",
  signal_lost: "has their phone lost signal?",
  user_safety: "are they safe right now?",
  account_affected: "is the account affected?",
};

/**
 * "Same message, different truth": twin cases share the exact opening message,
 * but one fact only the customer knows changes the right answer. Shows that the
 * assistant asks that one question instead of guessing, and how each branch scored.
 */
export function TwinsView({ onSessionExpired }: { onSessionExpired: () => void }) {
  const [pairs, setPairs] = useState<TwinPair[] | null>(null);
  const [run, setRun] = useState<"twins" | "single">("twins");
  const [failed, setFailed] = useState(false);
  const [journey, setJourney] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const expired = useRef(onSessionExpired);
  useEffect(() => {
    expired.current = onSessionExpired;
  });

  useEffect(() => {
    let alive = true;
    listTwins(run)
      .then((res) => {
        if (!alive) return;
        // Fall back to the single-turn run until the twin conversations exist.
        if (res.pairs.length === 0 && run === "twins") {
          setRun("single");
          return;
        }
        setPairs(res.pairs);
        setSelected((cur) => cur ?? res.pairs[0]?.group ?? null);
      })
      .catch((err) => {
        if (!alive) return;
        if (err instanceof ApiError && err.status === 401) expired.current();
        else setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [run]);

  const visible = useMemo(
    () => (pairs ?? []).filter((p) => journey === "all" || p.journey === journey),
    [pairs, journey],
  );
  const branches = (pairs ?? []).flatMap((p) => p.branches);
  const bothPassed = (pairs ?? []).filter((p) => p.branches.every((b) => b.passed)).length;
  const asked = branches.filter((b) => b.question).length;
  const pair = pairs?.find((p) => p.group === selected) ?? null;

  if (!pairs) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 p-6 text-sm">
        <LoaderCircle aria-hidden className="text-brand size-4 animate-spin" />
        {failed ? "Can’t load the twin cases. Is the backend running?" : "Loading twin cases…"}
      </p>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-border border-b bg-[#fdf8fb] px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex max-w-3xl flex-col gap-1">
            <p className="text-brand flex items-center gap-1.5 text-sm font-semibold">
              <GitFork aria-hidden className="size-4" />
              Same message, different truth
            </p>
            <h1 className="text-2xl font-bold tracking-tight">
              It asks the one question that decides the answer
            </h1>
            <p className="text-muted-foreground text-sm">
              {pairs.length} pairs of cases share the exact same message. One fact only the customer
              knows changes the right answer, so guessing is wrong half the time.
              {run === "single" &&
                " Showing single answers: the twin conversations have not been run yet."}
            </p>
          </div>
          <dl className="flex gap-6 text-sm">
            <div>
              <dt className="text-muted-foreground">Asked the deciding question</dt>
              <dd className="font-heading text-2xl font-bold">
                {asked} / {branches.length}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Both branches right</dt>
              <dd className="font-heading text-2xl font-bold">
                {bothPassed} / {pairs.length}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="grid flex-1 lg:grid-cols-[minmax(300px,380px)_1fr]">
        <div className="border-border flex max-h-[40vh] flex-col border-b lg:max-h-[calc(100vh-12rem)] lg:border-r lg:border-b-0">
          <div className="border-border border-b p-3">
            <Select
              aria-label="Journey"
              active={journey !== "all"}
              value={journey}
              onChange={(e) => setJourney(e.target.value)}
              className="w-full"
            >
              <option value="all">All journeys</option>
              {Object.entries(JOURNEYS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <ul aria-label="Twin pairs" className="flex-1 overflow-y-auto">
            {visible.map((p) => (
              <li key={p.group}>
                <button
                  type="button"
                  onClick={() => setSelected(p.group)}
                  aria-current={selected === p.group ? "true" : undefined}
                  className={cn(
                    "border-border flex w-full flex-col gap-1.5 border-b border-l-4 px-4 py-3 text-left transition-colors duration-150",
                    selected === p.group
                      ? "border-l-brand bg-brand-soft/60"
                      : "hover:bg-muted/60 border-l-transparent",
                  )}
                >
                  <span className="flex items-center gap-2 text-xs">
                    {p.branches.map((b) =>
                      b.passed ? (
                        <CircleCheck
                          key={b.case_id}
                          aria-label="Passed"
                          className="text-risk-safe-fg size-4"
                        />
                      ) : (
                        <CircleX
                          key={b.case_id}
                          aria-label="Failed"
                          className="text-risk-critical-fg size-4"
                        />
                      ),
                    )}
                    <span className="text-muted-foreground">
                      {JOURNEYS[p.journey] ?? p.journey}
                    </span>
                    <span className="border-border ml-auto rounded-sm border px-1 font-semibold">
                      {p.language.toUpperCase()}
                    </span>
                  </span>
                  <span lang={p.language} className="line-clamp-2 text-sm">
                    {p.message}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 overflow-y-auto lg:max-h-[calc(100vh-12rem)]">
          {pair ? <PairDetail pair={pair} /> : null}
        </div>
      </div>
    </div>
  );
}

function PairDetail({ pair }: { pair: TwinPair }) {
  const question = pair.branches.find((b) => b.question)?.question;
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6">
      <div className="flex flex-col items-center gap-2">
        <span className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
          <User aria-hidden className="size-3.5" />
          Both customers wrote, word for word
        </span>
        <p
          lang={pair.language}
          className="bg-secondary max-w-2xl rounded-2xl px-5 py-3 text-center whitespace-pre-wrap"
        >
          {pair.message}
        </p>
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <span className="bg-border h-5 w-px" aria-hidden />
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
          <CircleHelp aria-hidden className="text-brand size-3.5" />
          The deciding fact:{" "}
          {pair.deciding_topics.map((t) => TOPICS[t] ?? t.replaceAll("_", " ")).join(" / ")}
        </p>
        {question ? (
          <p
            lang={pair.language}
            className="bg-brand-soft max-w-2xl rounded-2xl px-5 py-3 text-center font-medium"
          >
            <ShieldCheck aria-hidden className="text-brand mr-1.5 inline size-4 align-[-2px]" />
            {question}
          </p>
        ) : (
          <p className="bg-risk-critical text-risk-critical-fg max-w-2xl rounded-2xl px-5 py-2.5 text-center text-sm font-semibold">
            No question asked: the assistant answered without knowing the deciding fact.
          </p>
        )}
        <span className="bg-border h-5 w-px" aria-hidden />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {pair.branches.map((branch) => (
          <Branch key={branch.case_id} branch={branch} language={pair.language} />
        ))}
      </div>

      <p className="text-muted-foreground text-xs">
        Synthetic twin cases from the organisers’ SimSet v2.0.1 (CC BY 4.0, © 2026 Since AI ry),
        scored with their own evaluator. Shown in the customer’s language.
      </p>
    </div>
  );
}

function Branch({ branch, language }: { branch: TwinBranch; language: string }) {
  const { ours, expected } = branch;
  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-white p-4",
        branch.passed ? "border-[#cfe8d6]" : "border-[#f3c6c6]",
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <span className="font-heading text-sm font-semibold tracking-wide">{branch.case_id}</span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
            branch.passed
              ? "bg-risk-safe text-risk-safe-fg"
              : "bg-risk-critical text-risk-critical-fg",
          )}
        >
          {branch.passed ? (
            <CircleCheck aria-hidden className="size-3.5" />
          ) : (
            <CircleX aria-hidden className="size-3.5" />
          )}
          {branch.passed ? "Passed" : "Failed"}
        </span>
      </header>

      <div className="flex flex-col items-end gap-1">
        <span className="text-muted-foreground text-xs font-medium">
          {branch.reply ? "The customer answers" : "What this customer knows"}
        </span>
        <p
          lang={language}
          className="bg-secondary max-w-full rounded-2xl rounded-tr-md px-3.5 py-2 text-sm"
        >
          {branch.reply ?? branch.hidden_fact ?? "–"}
        </p>
      </div>

      <div className="border-border flex flex-col gap-2 rounded-xl border p-3">
        <div className="flex flex-wrap items-center gap-2">
          {ours.risk_level && (
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-xs font-semibold capitalize",
                RISK_CHIP[ours.risk_level],
              )}
            >
              {ours.risk_level} risk
            </span>
          )}
          {ours.handoff && (
            <span className="text-accent-foreground flex items-center gap-1 text-xs font-semibold">
              <Headset aria-hidden className="size-3.5" />
              Hands off to a person
            </span>
          )}
        </div>
        {ours.action && <p className="font-heading text-sm font-semibold">{ours.action}</p>}
        <p lang={language} className="line-clamp-4 text-sm">
          {ours.advice_text}
        </p>
      </div>

      <p className="text-muted-foreground text-xs">
        <span className="font-semibold">Expected:</span> {expected.risk_level} risk ·{" "}
        {expected.action} · {expected.handoff ? "hand off" : "no handoff"}
      </p>
    </article>
  );
}
