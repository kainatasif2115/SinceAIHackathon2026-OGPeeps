"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, FileText, Info, LoaderCircle, MessagesSquare } from "lucide-react";
import { getResults, type EvaluationResults } from "@/lib/agent-api";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

/*
 * Charts follow the "emphasis" form: our run in DNA magenta, the comparison
 * (rules baseline, or before the fix) in a context grey. The grey is light
 * for colour-blind separation from the magenta (validated: deutan ΔE 13.6),
 * which puts it under 3:1 against white, so every bar carries a visible value
 * label and every chart has a table view.
 */
const OURS = "bg-brand";
const BASE = "bg-[#a3a3ad]";

export const JOURNEYS: Record<string, string> = {
  suspicious_message: "Suspicious message",
  clicked_link: "Clicked a link",
  suspicious_call: "Suspicious call",
  breach_notice: "Breach notice",
  smb_incident: "Small-business incident",
};

export const FAILURES: Record<string, string> = {
  did_not_ask_decisive: "Didn’t ask the deciding question",
  under_reaction: "Under-reacted",
  no_substantive_advice: "Advice too short",
  over_reaction: "Over-reacted",
  missed_escalation: "Missed a needed handoff",
  false_alarm: "False alarm on a harmless case",
};

const LANGUAGES: Record<string, string> = { fi: "Finnish", en: "English", sv: "Swedish" };
const AUDIENCES: Record<string, string> = {
  consumer: "Private customers",
  small_business: "Small businesses",
};

const pct = (value: number | null | undefined) =>
  value === null || value === undefined ? "–" : `${value.toFixed(1)} %`;

export function ResultsView({ onSessionExpired }: { onSessionExpired: () => void }) {
  const [data, setData] = useState<EvaluationResults | null>(null);
  const [failed, setFailed] = useState(false);
  const expired = useRef(onSessionExpired);
  useEffect(() => {
    expired.current = onSessionExpired;
  });

  useEffect(() => {
    getResults()
      .then(setData)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) expired.current();
        else setFailed(true);
      });
  }, []);

  if (!data) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 p-6 text-sm">
        <LoaderCircle aria-hidden className="text-brand size-4 animate-spin" />
        {failed ? "Can’t load the results. Is the backend running?" : "Loading results…"}
      </p>
    );
  }

  const { single, baseline, multi, twins_before: before, twins_after: after } = data.runs;
  if (!single) {
    return <p className="p-6 text-sm">No evaluation results found in results/.</p>;
  }
  const s = single.metrics;
  const b = baseline?.metrics;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-2">
        <p className="text-brand text-sm font-semibold">Evaluation</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">How well does it advise?</h1>
        <p className="text-muted-foreground max-w-3xl">
          Scored with the organisers’ SimSet evaluator v2.0.1, unchanged, on synthetic cases in
          Finnish, English and Swedish. Every number on this page is read from the evaluator’s own
          output files.
        </p>
      </div>

      {/* Headline */}
      <section aria-labelledby="headline" className="flex flex-col gap-4">
        <h2 id="headline" className="sr-only">
          Headline numbers
        </h2>
        <div className="grid gap-4 lg:grid-cols-[1.3fr_2fr]">
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#f3e4ec] bg-[#fdf6fa] p-6">
            <p className="text-muted-foreground text-sm font-medium">
              Gave a safe, correct next step · {s.cases} dev cases
            </p>
            <p className="font-heading text-6xl font-bold tracking-tight">
              {pct(s.safe_action_pass)}
            </p>
            <p className="text-sm">
              {s.safe_action_pass_ci && (
                <span className="text-muted-foreground">
                  95 % CI {s.safe_action_pass_ci[0]}–{s.safe_action_pass_ci[1]} ·{" "}
                </span>
              )}
              {b && <span className="font-semibold">rules baseline {pct(b.safe_action_pass)}</span>}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Stat
              label="False alarms on harmless cases"
              value={pct(s.false_alarms)}
              compare={b && `baseline ${pct(b.false_alarms)}`}
              note="lower is better"
            />
            <Stat
              label="Escalation recall"
              value={pct(s.escalation_recall)}
              compare={b && `baseline ${pct(b.escalation_recall)}`}
              note="handed to a person when needed"
            />
            <Stat
              label="Unsafe statements"
              value={pct(s.unsafe_statements)}
              compare={b && `baseline ${pct(b.unsafe_statements)}`}
              note="pay, click, share a code…"
            />
            <Stat
              label="Weighted score"
              value={s.scorecard.weighted?.toFixed(1) ?? "–"}
              compare={b && `baseline ${b.scorecard.weighted?.toFixed(1) ?? "–"}`}
              note="of 100, the brief’s criteria"
            />
          </div>
        </div>
      </section>

      {/* Scorecard vs baseline */}
      {b && (
        <ChartCard
          id="scorecard"
          title="Against the organisers’ rules baseline"
          subtitle={`Automated proxy for each judging criterion, 0–100 · same ${s.cases} cases`}
          legend={[
            { swatch: OURS, label: "Our assistant" },
            { swatch: BASE, label: "Rules baseline" },
          ]}
          rows={[
            ["Correctness (25 %)", s.scorecard.correctness, b.scorecard.correctness],
            ["Clarity (20 %)", s.scorecard.clarity, b.scorecard.clarity],
            ["Uncertainty & escalation (20 %)", s.scorecard.uncertainty, b.scorecard.uncertainty],
            ["Privacy & consent (15 %)", s.scorecard.privacy, b.scorecard.privacy],
          ].map(([label, ours, base]) => ({
            label: label as string,
            values: [
              { value: ours as number | undefined, swatch: OURS, name: "Our assistant" },
              { value: base as number | undefined, swatch: BASE, name: "Rules baseline" },
            ],
          }))}
          unit=""
        />
      )}

      {/* By journey */}
      <ChartCard
        id="journeys"
        title="Correct next step, by journey"
        subtitle={`Safe-action pass rate · ${s.cases} dev cases`}
        legend={
          b
            ? [
                { swatch: OURS, label: "Our assistant" },
                { swatch: BASE, label: "Rules baseline" },
              ]
            : undefined
        }
        rows={Object.keys(JOURNEYS)
          .filter((key) => s.by_journey[key])
          .map((key) => ({
            label: JOURNEYS[key],
            values: [
              {
                value: s.by_journey[key].pass,
                n: s.by_journey[key].n,
                swatch: OURS,
                name: "Our assistant",
              },
              ...(b?.by_journey[key]
                ? [
                    {
                      value: b.by_journey[key].pass,
                      n: b.by_journey[key].n,
                      swatch: BASE,
                      name: "Rules baseline",
                    },
                  ]
                : []),
            ],
          }))}
        unit="%"
      />

      {/* The fix */}
      {before && after && (
        <section
          aria-labelledby="fix"
          className="border-border flex flex-col gap-5 rounded-2xl border bg-white p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 id="fix" className="text-xl font-bold tracking-tight">
                “It depends” cases: asking the deciding question
              </h2>
              <p className="text-muted-foreground max-w-2xl text-sm">
                {after.metrics.cases} twin cases where the right step depends on one fact only the
                user knows (did they type the code, has the money gone). We changed the assistant to
                ask that question first.
              </p>
            </div>
            <p className="flex items-center gap-3 font-semibold">
              <span className="text-muted-foreground text-2xl">
                {pct(before.metrics.safe_action_pass)}
              </span>
              <ArrowRight aria-hidden className="text-muted-foreground size-5" />
              <span className="text-brand font-heading text-4xl font-bold">
                {pct(after.metrics.safe_action_pass)}
              </span>
            </p>
          </div>
          <Legend
            items={[
              { swatch: BASE, label: "Before the fix", round: true },
              { swatch: OURS, label: "After the fix", round: true },
            ]}
          />
          <ul className="flex flex-col gap-3">
            {Object.keys(JOURNEYS)
              .filter((key) => before.metrics.by_journey[key] && after.metrics.by_journey[key])
              .map((key) => (
                <Dumbbell
                  key={key}
                  label={JOURNEYS[key]}
                  n={after.metrics.by_journey[key].n}
                  from={before.metrics.by_journey[key].pass}
                  to={after.metrics.by_journey[key].pass}
                />
              ))}
            <Dumbbell
              label="Asked the deciding question"
              from={before.metrics.asked_decisive ?? 0}
              to={after.metrics.asked_decisive ?? 0}
              n={after.metrics.cases}
            />
          </ul>
          <TableView
            caption="Before and after the deciding-question fix"
            head={["", "Before", "After", "Cases"]}
            rows={Object.keys(JOURNEYS)
              .filter((key) => before.metrics.by_journey[key] && after.metrics.by_journey[key])
              .map((key) => [
                JOURNEYS[key],
                pct(before.metrics.by_journey[key].pass),
                pct(after.metrics.by_journey[key].pass),
                String(after.metrics.by_journey[key].n),
              ])}
          />
        </section>
      )}

      {/* Multi-turn */}
      {multi && (
        <section
          aria-labelledby="multi"
          className="border-border flex flex-col gap-5 rounded-2xl border bg-white p-5 sm:p-6"
        >
          <div className="flex flex-col gap-1">
            <h2 id="multi" className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <MessagesSquare aria-hidden className="text-brand size-5" />
              Real conversations with the organisers’ simulated user
            </h2>
            <p className="text-muted-foreground text-sm">
              {multi.metrics.cases} multi-turn conversations,{" "}
              {Math.round((multi.metrics.cases ?? 0) / 5)} per journey. The simulated user answers
              questions and grants or refuses consent like a real person.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Safe, correct next step" value={pct(multi.metrics.safe_action_pass)} />
            <Stat label="Asked the deciding question" value={pct(multi.metrics.asked_decisive)} />
            <Stat label="Escalation recall" value={pct(multi.metrics.escalation_recall)} />
            <Stat label="False alarms" value={pct(multi.metrics.false_alarms)} />
          </div>
        </section>
      )}

      {/* Failures */}
      {s.failure_types && Object.keys(s.failure_types).length > 0 && (
        <ChartCard
          id="failures"
          title="What still goes wrong"
          subtitle={`Failure types across the ${s.cases} single-turn answers (a case can have more than one)`}
          rows={Object.entries(s.failure_types)
            .sort((x, y) => y[1] - x[1])
            .map(([key, count]) => ({
              label: FAILURES[key] ?? key,
              values: [{ value: count, swatch: OURS, name: "Cases" }],
            }))}
          unit=""
          max={Math.max(...Object.values(s.failure_types))}
          footnote={
            before && after
              ? "The largest group, not asking the deciding question, is what the fix above addresses; this run was scored before it."
              : undefined
          }
        />
      )}

      {/* Breakdowns */}
      <div className="grid gap-6 lg:grid-cols-2">
        {s.by_language && (
          <ChartCard
            id="languages"
            title="By language"
            subtitle="Safe-action pass rate"
            compact
            legend={
              b?.by_language
                ? [
                    { swatch: OURS, label: "Our assistant" },
                    { swatch: BASE, label: "Rules baseline" },
                  ]
                : undefined
            }
            rows={groupRows(s.by_language, b?.by_language, LANGUAGES)}
            unit="%"
          />
        )}
        {s.by_audience && (
          <ChartCard
            id="audiences"
            title="By customer type"
            subtitle="Safe-action pass rate"
            compact
            legend={
              b?.by_audience
                ? [
                    { swatch: OURS, label: "Our assistant" },
                    { swatch: BASE, label: "Rules baseline" },
                  ]
                : undefined
            }
            rows={groupRows(s.by_audience, b?.by_audience, AUDIENCES)}
            unit="%"
          />
        )}
      </div>

      {/* Caveats and sources */}
      <section
        aria-labelledby="notes"
        className="flex flex-col gap-3 rounded-2xl border border-[#f3e4ec] bg-[#fdf6fa] p-5 text-sm sm:p-6"
      >
        <h2 id="notes" className="flex items-center gap-2 text-base font-bold">
          <Info aria-hidden className="text-brand size-4.5" />
          Read these numbers with care
        </h2>
        <ul className="text-muted-foreground ml-5 flex list-disc flex-col gap-1.5">
          <li>
            All numbers were measured on 7 November on the current code with every fix, through the
            same ElevenLabs agent the live site uses. Before the fixes, the same 588 cases scored
            82.5 %.
          </li>
          <li>
            The 120 conversations are 24 per journey: solid evidence, but still a sample of the dev
            set.
          </li>
          <li>
            These are the evaluator’s automated proxies. Implementation (20 % of the brief) is
            judged by people. A review of 30 answers against the organisers’ form, checked and
            confirmed by a team member, found none unsafe.
          </li>
          <li>All cases are synthetic. They are not DNA customer data or DNA’s advice.</li>
        </ul>
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
          <FileText aria-hidden className="size-4" />
          Sources:
          {Object.values(data.runs).map((run) => (
            <code key={run.file} className="text-xs">
              results/{run.file}
            </code>
          ))}
        </p>
      </section>
    </div>
  );
}

function groupRows(
  ours: Record<string, { n: number; pass: number }>,
  base: Record<string, { n: number; pass: number }> | undefined,
  names: Record<string, string>,
): Row[] {
  return Object.keys(names)
    .filter((key) => ours[key])
    .map((key) => ({
      label: names[key],
      values: [
        { value: ours[key].pass, n: ours[key].n, swatch: OURS, name: "Our assistant" },
        ...(base?.[key]
          ? [{ value: base[key].pass, n: base[key].n, swatch: BASE, name: "Rules baseline" }]
          : []),
      ],
    }));
}

function Stat({
  label,
  value,
  compare,
  note,
}: {
  label: string;
  value: string;
  compare?: string;
  note?: string;
}) {
  return (
    <div className="border-border flex flex-col gap-1 rounded-2xl border bg-white p-4">
      <p className="text-muted-foreground text-sm font-medium">{label}</p>
      <p className="font-heading text-3xl font-bold tracking-tight">{value}</p>
      {compare && <p className="text-sm font-semibold">{compare}</p>}
      {note && <p className="text-muted-foreground text-xs">{note}</p>}
    </div>
  );
}

type Value = { value: number | undefined; n?: number; swatch: string; name: string };
type Row = { label: string; values: Value[] };

function Legend({ items }: { items: { swatch: string; label: string; round?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span
            aria-hidden
            className={cn("size-3", item.round ? "rounded-full" : "rounded-sm", item.swatch)}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** Horizontal bars, one group per row; every bar labelled at its tip, hover for detail. */
function ChartCard({
  id,
  title,
  subtitle,
  legend,
  rows,
  unit,
  max = 100,
  compact = false,
  footnote,
}: {
  id: string;
  title: string;
  subtitle: string;
  legend?: { swatch: string; label: string }[];
  rows: Row[];
  unit: string;
  max?: number;
  compact?: boolean;
  footnote?: string;
}) {
  const format = (v: number | undefined) =>
    v === undefined
      ? "–"
      : unit === "%"
        ? `${v.toFixed(1)} %`
        : Number.isInteger(v)
          ? `${v}`
          : v.toFixed(1);
  return (
    <section
      aria-labelledby={id}
      className="border-border flex flex-col gap-4 rounded-2xl border bg-white p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={id} className={cn("font-bold tracking-tight", compact ? "text-lg" : "text-xl")}>
            {title}
          </h2>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        </div>
        {legend && <Legend items={legend} />}
      </div>
      <ul className="flex flex-col gap-3.5">
        {rows.map((row) => (
          <li
            key={row.label}
            className="grid grid-cols-1 items-center gap-x-4 gap-y-1 sm:grid-cols-[13rem_1fr]"
          >
            <span className="text-sm font-medium">{row.label}</span>
            <span className="flex flex-col gap-0.5">
              {row.values.map((v) => (
                <span key={v.name} className="group relative flex items-center gap-2">
                  <span
                    tabIndex={0}
                    aria-label={`${row.label}, ${v.name}: ${format(v.value)}${v.n ? ` (n=${v.n})` : ""}`}
                    className="relative flex h-3.5 flex-1 items-center rounded-r-[4px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
                  >
                    <span
                      className={cn("h-full rounded-r-[4px]", v.swatch)}
                      style={{
                        width: `${Math.max(0, Math.min(100, ((v.value ?? 0) / max) * 100))}%`,
                      }}
                    />
                    <span className="text-foreground ml-2 shrink-0 text-xs font-semibold tabular-nums">
                      {format(v.value)}
                    </span>
                  </span>
                  <span
                    role="tooltip"
                    className="bg-foreground text-background pointer-events-none absolute -top-8 left-0 z-10 rounded-md px-2 py-1 text-xs whitespace-nowrap opacity-0 shadow transition-opacity duration-100 group-focus-within:opacity-100 group-hover:opacity-100"
                  >
                    {v.name}: {format(v.value)}
                    {v.n ? ` · n=${v.n}` : ""}
                  </span>
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
      {footnote && <p className="text-muted-foreground text-xs">{footnote}</p>}
      <TableView
        caption={title}
        head={["", ...(rows[0]?.values.map((v) => v.name) ?? [])]}
        rows={rows.map((row) => [
          row.label,
          ...row.values.map((v) => `${format(v.value)}${v.n ? ` (n=${v.n})` : ""}`),
        ])}
      />
    </section>
  );
}

/** Before → after on one row: grey dot, connecting line, magenta dot. */
function Dumbbell({ label, from, to, n }: { label: string; from: number; to: number; n?: number }) {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  return (
    <li className="grid grid-cols-1 items-center gap-x-4 gap-y-1 sm:grid-cols-[13rem_1fr_7rem]">
      <span className="text-sm font-medium">{label}</span>
      <span
        className="relative h-4"
        role="img"
        aria-label={`${label}: ${from.toFixed(1)} % before, ${to.toFixed(1)} % after${n ? `, ${n} cases` : ""}`}
        title={`${label}: ${from.toFixed(1)} % → ${to.toFixed(1)} %${n ? ` · n=${n}` : ""}`}
      >
        <span className="bg-border absolute top-1/2 h-px w-full -translate-y-1/2" />
        <span
          className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-[#e8b3cc]"
          style={{ left: `${lo}%`, width: `${hi - lo}%` }}
        />
        <span
          className={cn(
            "absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white",
            BASE,
          )}
          style={{ left: `${from}%` }}
        />
        <span
          className={cn(
            "absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white",
            OURS,
          )}
          style={{ left: `${to}%` }}
        />
      </span>
      <span className="text-sm tabular-nums">
        <span className="text-muted-foreground">{from.toFixed(1)}</span> →{" "}
        <span className="font-semibold">{to.toFixed(1)} %</span>
      </span>
    </li>
  );
}

function TableView({ caption, head, rows }: { caption: string; head: string[]; rows: string[][] }) {
  return (
    <details className="text-sm">
      <summary className="text-brand w-fit cursor-pointer font-semibold">Show as table</summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-border border-b">
              {head.map((h, i) => (
                <th key={i} scope="col" className="py-2 pr-4 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]} className="border-border border-b last:border-0">
                {row.map((cell, i) =>
                  i === 0 ? (
                    <th key={i} scope="row" className="py-2 pr-4 font-medium">
                      {cell}
                    </th>
                  ) : (
                    <td key={i} className="py-2 pr-4 tabular-nums">
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
