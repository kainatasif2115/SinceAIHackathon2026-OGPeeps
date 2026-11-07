"use client";

import { useEffect, useRef, useState } from "react";
import { CircleCheck, Headset, LoaderCircle, PhoneCall, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestHandoff, type Handoff } from "@/lib/api";
import { describeError } from "./error-notice";
import { useT } from "./i18n-context";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; handoff: Handoff }
  | { status: "error"; error: unknown };

type Props = {
  sessionId: string;
  escalationLabel: string | null;
  /**
   * The answer did not call for a person, but the customer may still ask for one: a
   * quieter offer under the advice, made a proper button when the assistant is unsure.
   */
  optional?: { unsure: boolean };
};

/** "Talk to a person": calls the handoff endpoint and shows what is passed on. */
export function HandoffPanel({ sessionId, escalationLabel, optional }: Props) {
  const t = useT();
  const [state, setState] = useState<State>({ status: "idle" });
  const doneHeading = useRef<HTMLHeadingElement>(null);

  // The button disappears once the handoff is made, so move focus to the result.
  useEffect(() => {
    if (state.status === "done") doneHeading.current?.focus();
  }, [state.status]);

  async function start() {
    if (state.status === "loading") return;
    setState({ status: "loading" });
    try {
      setState({ status: "done", handoff: await requestHandoff(sessionId) });
    } catch (error) {
      setState({ status: "error", error });
    }
  }

  if (state.status === "done") {
    const { reference, summary } = state.handoff;
    return (
      <section
        aria-labelledby="handoff-heading"
        className="bg-accent flex flex-col gap-3 rounded-md p-4"
      >
        <h3
          id="handoff-heading"
          ref={doneHeading}
          tabIndex={-1}
          className="flex items-center gap-2 text-base outline-none"
        >
          <CircleCheck aria-hidden className="text-accent-foreground size-5 shrink-0" />
          {t.handoffDone}
        </h3>
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="text-muted-foreground text-sm">{t.handoffReference}</dt>
            <dd className="font-heading text-xl font-medium tracking-wide tabular-nums">
              {reference}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">{t.handoffSummary}</dt>
            <dd className="border-border bg-card mt-1 max-w-prose rounded-md border px-3 py-2 text-sm whitespace-pre-wrap">
              {summary}
            </dd>
          </div>
        </dl>
      </section>
    );
  }

  if (optional) {
    const busy = state.status === "loading";
    return (
      <section
        aria-label={t.talkAnyway}
        className="border-border flex flex-col gap-2 rounded-md border border-dashed p-4"
      >
        <p className="text-muted-foreground max-w-prose text-sm">
          {t.talkAnywayPrompt(optional.unsure)}
        </p>
        {state.status === "error" && (
          <p role="alert" className="text-destructive text-sm font-medium">
            {t.handoffError} {describeError(state.error, t)}
          </p>
        )}
        <Button
          variant={optional.unsure ? "default" : "outline"}
          onClick={start}
          aria-disabled={busy || undefined}
          className="self-start"
        >
          {busy ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          ) : (
            <Headset aria-hidden className="size-4" />
          )}
          {busy ? t.handoffLoading : t.talkAnyway}
        </Button>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="escalation-heading"
      className="bg-accent flex flex-col gap-3 rounded-md p-4"
    >
      <h3 id="escalation-heading" className="flex items-center gap-2 text-base">
        <Headset aria-hidden className="text-accent-foreground size-5 shrink-0" />
        {t.escalationHeading}
      </h3>
      <p className="max-w-prose">{t.escalationBody(escalationLabel)}</p>
      {state.status === "error" && (
        <div role="alert" className="flex flex-col gap-1 text-sm">
          <p className="text-destructive font-medium">
            {t.handoffError} {describeError(state.error, t)}
          </p>
          <p className="text-muted-foreground flex gap-2">
            <PhoneCall aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t.urgentFallback}
          </p>
        </div>
      )}
      <Button
        size="lg"
        onClick={start}
        aria-disabled={state.status === "loading" || undefined}
        className="self-start"
      >
        {state.status === "loading" ? (
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
        ) : state.status === "error" ? (
          <RotateCcw aria-hidden className="size-4" />
        ) : (
          <Headset aria-hidden className="size-4" />
        )}
        {state.status === "loading" ? t.handoffLoading : t.talkToPerson}
      </Button>
    </section>
  );
}
