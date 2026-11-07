"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleCheck,
  CircleX,
  Clock,
  Headset,
  LoaderCircle,
  LockKeyhole,
  Search,
  ShieldCheck,
  Target,
  User,
} from "lucide-react";
import {
  getCase,
  listCases,
  type CaseDetail,
  type CaseRun,
  type CaseSummary,
  type ChatTurn,
} from "@/lib/agent-api";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Select } from "./select";
import { FAILURES, JOURNEYS } from "./results-view";

const LANGUAGE_NAMES: Record<string, string> = { fi: "Finnish", en: "English", sv: "Swedish" };
const RISK_CHIP: Record<string, string> = {
  none: "bg-risk-safe text-risk-safe-fg",
  low: "bg-risk-safe text-risk-safe-fg",
  medium: "bg-risk-medium text-risk-medium-fg",
  high: "bg-risk-high text-risk-high-fg",
  critical: "bg-risk-critical text-risk-critical-fg",
};
const URGENCY: Record<string, string> = {
  none: "nothing to do",
  routine: "when there is time",
  today: "today",
  immediate: "right now",
};
const RUN_LABEL: Record<CaseRun, string> = {
  multi: "Conversations (30)",
  single: "Single answers (588)",
};

type Verdict = "all" | "passed" | "failed";

/** Browse the organisers' dev cases as chats, with our answer and the official verdict. */
export function CasesView({ onSessionExpired }: { onSessionExpired: () => void }) {
  const [run, setRun] = useState<CaseRun>("multi");
  const [list, setList] = useState<CaseSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [journey, setJourney] = useState("all");
  const [language, setLanguage] = useState("all");
  const [verdict, setVerdict] = useState<Verdict>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const expired = useRef(onSessionExpired);
  useEffect(() => {
    expired.current = onSessionExpired;
  });

  useEffect(() => {
    let alive = true;
    listCases(run)
      .then((res) => {
        if (!alive) return;
        setList(res.cases);
        setSelected(res.cases[0]?.case_id ?? null);
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

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (list ?? []).filter(
      (c) =>
        (journey === "all" || c.journey === journey) &&
        (language === "all" || c.language === language) &&
        (verdict === "all" || (verdict === "passed" ? c.passed : !c.passed)) &&
        (!q || c.case_id.toLowerCase().includes(q) || c.opening.toLowerCase().includes(q)),
    );
  }, [list, journey, language, verdict, query]);

  const passed = (list ?? []).filter((c) => c.passed).length;

  function switchRun(next: CaseRun) {
    if (next === run) return;
    setList(null);
    setSelected(null);
    setRun(next);
  }

  const control =
    "border-input h-9 rounded-full border bg-white px-3 text-sm focus-visible:border-brand outline-none";

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-border border-b bg-[#fdf8fb]">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div
            role="group"
            aria-label="Which run"
            className="flex rounded-full border border-[#f3e4ec] bg-white p-0.5"
          >
            {(["multi", "single"] as CaseRun[]).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={run === value}
                onClick={() => switchRun(value)}
                className={cn(
                  "h-8 rounded-full px-3.5 text-sm font-semibold transition-colors duration-150",
                  run === value
                    ? "bg-brand text-brand-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {RUN_LABEL[value]}
              </button>
            ))}
          </div>
          <label className="relative min-w-48 flex-1 sm:max-w-60">
            <span className="sr-only">Search cases</span>
            <Search
              aria-hidden
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ID or message"
              className={cn(control, "w-full pl-9")}
            />
          </label>
          <Select
            active={journey !== "all"}
            aria-label="Journey"
            value={journey}
            onChange={(e) => setJourney(e.target.value)}
          >
            <option value="all">All journeys</option>
            {Object.entries(JOURNEYS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select
            active={language !== "all"}
            aria-label="Language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="all">All languages</option>
            {Object.entries(LANGUAGE_NAMES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select
            active={verdict !== "all"}
            aria-label="Result"
            value={verdict}
            onChange={(e) => setVerdict(e.target.value as Verdict)}
          >
            <option value="all">Passed and failed</option>
            <option value="passed">Passed only</option>
            <option value="failed">Failed only</option>
          </Select>
          {list && (
            <p className="text-muted-foreground ml-auto text-sm">
              {visible.length} of {list.length} shown ·{" "}
              <span className="text-foreground font-semibold">
                {passed} passed ({((100 * passed) / Math.max(1, list.length)).toFixed(1)} %)
              </span>
            </p>
          )}
        </div>
      </div>

      {!list ? (
        <p className="text-muted-foreground flex items-center gap-2 p-6 text-sm">
          <LoaderCircle aria-hidden className="text-brand size-4 animate-spin" />
          {failed ? "Can’t load the cases. Is the backend running?" : "Loading cases…"}
        </p>
      ) : (
        <div className="grid flex-1 lg:grid-cols-[minmax(320px,400px)_1fr]">
          <ul
            aria-label="Cases"
            className="border-border flex max-h-[40vh] flex-col overflow-y-auto border-b lg:max-h-[calc(100vh-8.5rem)] lg:border-r lg:border-b-0"
          >
            {visible.map((c) => (
              <li key={c.case_id}>
                <button
                  type="button"
                  onClick={() => setSelected(c.case_id)}
                  aria-current={selected === c.case_id ? "true" : undefined}
                  className={cn(
                    "border-border flex w-full flex-col gap-1.5 border-b border-l-4 px-4 py-3 text-left transition-colors duration-150",
                    selected === c.case_id
                      ? "border-l-brand bg-brand-soft/60"
                      : "hover:bg-muted/60 border-l-transparent",
                  )}
                >
                  <span className="flex items-center gap-2 text-xs">
                    {c.passed ? (
                      <CircleCheck aria-label="Passed" className="text-risk-safe-fg size-4" />
                    ) : (
                      <CircleX aria-label="Failed" className="text-risk-critical-fg size-4" />
                    )}
                    <span className="font-heading font-semibold tracking-wide">{c.case_id}</span>
                    <span className="text-muted-foreground">
                      {JOURNEYS[c.journey] ?? c.journey}
                    </span>
                    <span className="border-border ml-auto rounded-sm border px-1 font-semibold">
                      {c.language.toUpperCase()}
                    </span>
                  </span>
                  <span lang={c.language} className="line-clamp-2 text-sm">
                    {c.opening}
                  </span>
                  {!c.passed && c.failures.length > 0 && (
                    <span className="text-risk-critical-fg text-xs font-medium">
                      {c.failures.map((f) => FAILURES[f] ?? f).join(" · ")}
                    </span>
                  )}
                </button>
              </li>
            ))}
            {visible.length === 0 && (
              <li className="text-muted-foreground p-4 text-sm">No cases match the filters.</li>
            )}
          </ul>
          <div className="min-w-0 overflow-y-auto lg:max-h-[calc(100vh-8.5rem)]">
            {selected ? (
              <CaseChat key={`${run}-${selected}`} run={run} caseId={selected} />
            ) : (
              <p className="text-muted-foreground p-6 text-sm">Pick a case to read the chat.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CaseChat({ run, caseId }: { run: CaseRun; caseId: string }) {
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getCase(run, caseId)
      .then(setDetail)
      .catch(() => setFailed(true));
  }, [run, caseId]);

  if (!detail) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 p-6 text-sm">
        <LoaderCircle aria-hidden className="text-brand size-4 animate-spin" />
        {failed ? "Couldn’t load this case." : "Loading chat…"}
      </p>
    );
  }

  const { ours, expected } = detail;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-heading text-xl font-bold tracking-wide">{detail.case_id}</h2>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-semibold",
              detail.passed
                ? "bg-risk-safe text-risk-safe-fg"
                : "bg-risk-critical text-risk-critical-fg",
            )}
          >
            {detail.passed ? (
              <CircleCheck aria-hidden className="size-4" />
            ) : (
              <CircleX aria-hidden className="size-4" />
            )}
            {detail.passed ? "Passed" : "Failed"}
          </span>
        </div>
        <p className="text-muted-foreground text-sm">
          {JOURNEYS[detail.journey] ?? detail.journey} ·{" "}
          {detail.audience === "small_business" ? "Small business" : "Private customer"} ·{" "}
          {LANGUAGE_NAMES[detail.language]} ·{" "}
          {detail.mode === "multi_turn" ? "Conversation with the simulated user" : "Single answer"}
        </p>
        {!detail.passed && detail.failures.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {[...new Set(detail.failures.map((f) => f.type))].map((type) => (
              <li
                key={type}
                className="bg-risk-critical text-risk-critical-fg rounded-md px-2 py-0.5 text-xs font-semibold"
              >
                {FAILURES[type] ?? type}
              </li>
            ))}
          </ul>
        )}
      </header>

      <ol aria-label="Conversation" className="flex flex-col gap-4">
        {detail.transcript.map((turn, index) => (
          <li key={index}>
            <Bubble turn={turn} detail={detail} />
          </li>
        ))}
      </ol>

      <section
        aria-labelledby="expected-heading"
        className="flex flex-col gap-3 rounded-2xl border border-[#f3e4ec] bg-[#fdf6fa] p-5"
      >
        <h3 id="expected-heading" className="flex items-center gap-2 font-bold">
          <Target aria-hidden className="text-brand size-4.5" />
          What the organisers expected
        </h3>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Compare
            term="Action"
            expected={[expected.action, ...expected.also_acceptable].filter(Boolean).join(" or ")}
            ours={ours.action ?? "–"}
          />
          <Compare
            term="Risk · urgency"
            expected={`${expected.risk_level} · ${URGENCY[expected.urgency] ?? expected.urgency}`}
            ours={`${ours.risk_level ?? "–"} · ${URGENCY[ours.urgency ?? ""] ?? ours.urgency ?? "–"}`}
          />
          <Compare
            term="Hand off to a person"
            expected={expected.escalation_required ? "Yes" : "No"}
            ours={ours.escalation_required ? "Yes" : "No"}
          />
          <Compare
            term="Must ask about"
            expected={
              expected.must_ask_topics.length
                ? expected.must_ask_topics.map((t) => t.replaceAll("_", " ")).join(", ")
                : "Nothing"
            }
            ours={
              ours.questions_asked.length
                ? `${ours.questions_asked.length} question(s)`
                : "No questions"
            }
          />
        </dl>
        {expected.rationale && (
          <p className="text-sm">
            <span className="font-semibold">Why: </span>
            {expected.rationale}
          </p>
        )}
        {expected.reference_answer && (
          <details className="text-sm">
            <summary className="text-brand w-fit cursor-pointer font-semibold">
              Their reference answer
            </summary>
            <p className="mt-2 rounded-xl bg-white p-3">{expected.reference_answer}</p>
          </details>
        )}
        {expected.benign && (
          <p className="text-muted-foreground text-xs">
            A harmless look-alike: the right answer is to reassure, with evidence.
          </p>
        )}
      </section>

      <p className="text-muted-foreground text-xs">
        Synthetic case from the organisers’ SimSet v2.0.1 (CC BY 4.0, © 2026 Since AI ry). Shown in
        the customer’s language. Not real customer data or DNA advice.
      </p>
    </div>
  );
}

function Bubble({ turn, detail }: { turn: ChatTurn; detail: CaseDetail }) {
  const lang = detail.language;
  if (turn.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
          <User aria-hidden className="size-3.5" />
          {turn.type === "consent_reply"
            ? "Customer (simulated) · consent"
            : "Customer (simulated)"}
        </span>
        <p
          lang={lang}
          className="bg-secondary max-w-[85%] rounded-2xl rounded-tr-md px-4 py-2.5 whitespace-pre-wrap"
        >
          {turn.text}
        </p>
        {turn.type === "consent_reply" && (turn.granted.length > 0 || turn.refused.length > 0) && (
          <span className="text-muted-foreground text-xs">
            {turn.granted.length > 0 && `Allowed: ${turn.granted.join(", ")}`}
            {turn.granted.length > 0 && turn.refused.length > 0 && " · "}
            {turn.refused.length > 0 && `Refused: ${turn.refused.join(", ")}`}
          </span>
        )}
      </div>
    );
  }

  if (turn.type === "final") {
    const ours = detail.ours;
    return (
      <div className="flex flex-col gap-1">
        <AssistantLabel />
        <article className="border-border overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#f3e4ec] bg-[#fdf6fa] px-4 py-2">
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
            {ours.urgency && (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <Clock aria-hidden className="size-3.5" />
                {URGENCY[ours.urgency] ?? ours.urgency}
              </span>
            )}
            {ours.escalation_required && (
              <span className="text-accent-foreground ml-auto flex items-center gap-1 text-xs font-semibold">
                <Headset aria-hidden className="size-3.5" />
                Hands off to a person
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2 px-4 py-3">
            {ours.action && <p className="font-heading font-semibold">{ours.action}</p>}
            <p lang={lang} className="text-sm whitespace-pre-wrap">
              {turn.text || ours.advice_text}
            </p>
            {ours.steps.length > 0 && (
              <ol lang={lang} className="ml-5 list-decimal text-sm">
                {ours.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            )}
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <AssistantLabel consent={turn.type === "consent_request"} />
      <div
        className={cn(
          "max-w-[85%] rounded-2xl rounded-tl-md px-4 py-2.5",
          turn.type === "consent_request" ? "bg-accent border border-[#f3c6da]" : "bg-brand-soft",
        )}
      >
        <p lang={lang} className="whitespace-pre-wrap">
          {turn.text}
        </p>
        {turn.type === "consent_request" && turn.fields.length > 0 && (
          <p className="text-muted-foreground mt-1.5 text-xs">
            Asks to check: {turn.fields.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}

function AssistantLabel({ consent = false }: { consent?: boolean }) {
  return (
    <span className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
      {consent ? (
        <LockKeyhole aria-hidden className="text-brand size-3.5" />
      ) : (
        <ShieldCheck aria-hidden className="text-brand size-3.5" />
      )}
      {consent ? "Assistant · asks permission" : "Assistant"}
    </span>
  );
}

function Compare({ term, expected, ours }: { term: string; expected: string; ours: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-semibold">{term}</dt>
      <dd>
        <span className="text-muted-foreground">Expected:</span> {expected}
      </dd>
      <dd>
        <span className="text-muted-foreground">Ours:</span> {ours}
      </dd>
    </div>
  );
}
