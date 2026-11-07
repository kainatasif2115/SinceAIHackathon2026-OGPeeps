"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole, ShieldCheck, TriangleExclamationPoint } from "lucide-react";
import type { Audience, Scenario } from "@/lib/api";
import type { ScenariosState } from "@/components/assistant/scenario-list";
import { MAX_MESSAGE_LENGTH } from "@/components/assistant/composer";

type Props = {
  audience: Audience;
  scenarios: ScenariosState;
  onAsk: (text: string) => void;
  onPickScenario: (scenario: Scenario) => void;
};

const HEADLINE: Record<Audience, { title: string; intro: string; placeholder: string }> = {
  consumer: {
    title: "Not sure about a message? Ask before you act.",
    intro:
      "Tell us about the text, call, email or login alert that worries you. The security assistant asks one or two questions, then gives you one clear next step.",
    placeholder: "For example: I got a text saying my parcel is stuck in customs…",
  },
  small_business: {
    title: "Odd invoice or urgent request from “the CEO”? Check it first.",
    intro:
      "Describe what reached you or your team. You get one clear next step for the business, and a person when it is serious.",
    placeholder: "For example: our supplier emailed new bank details for the next invoice…",
  },
};

export function Hero({ audience, scenarios, onAsk, onPickScenario }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const copy = HEADLINE[audience];

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value) {
      setError("Write a few words about what happened.");
      return;
    }
    if (value.length > MAX_MESSAGE_LENGTH) {
      setError(`Please keep it under ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }
    setError(null);
    onAsk(value);
    setText("");
  }

  const examples =
    scenarios.status === "ready"
      ? scenarios.scenarios
          .filter((s) => s.audience === audience && s.language === "en")
          .slice(0, 3)
      : [];

  return (
    <section aria-labelledby="hero-heading" className="bg-brand text-brand-foreground">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:py-20">
        <div className="flex flex-col gap-6">
          <p className="inline-flex items-center gap-2 self-start rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <ShieldCheck aria-hidden className="size-3.5" />
            New · Security assistant prototype
          </p>
          <div className="flex flex-col gap-4">
            <h1
              id="hero-heading"
              className="font-heading text-[2.25rem] leading-[1.08] font-bold tracking-tight sm:text-5xl"
            >
              {copy.title}
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-white">{copy.intro}</p>
          </div>

          <form
            onSubmit={submit}
            noValidate
            className="text-foreground flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-[0_12px_40px_rgb(0_0_0/0.18)] sm:p-5"
          >
            <label htmlFor="hero-message" className="font-heading text-base font-semibold">
              What happened?
            </label>
            <textarea
              id="hero-message"
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              rows={2}
              placeholder={copy.placeholder}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "hero-error hero-privacy" : "hero-privacy"}
              className="border-input placeholder:text-muted-foreground focus-visible:border-brand min-h-20 w-full resize-none rounded-xl border px-3.5 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--brand),transparent_75%)]"
            />
            {error && (
              <p id="hero-error" role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p
                id="hero-privacy"
                className="text-muted-foreground flex items-center gap-1.5 text-xs"
              >
                <LockKeyhole aria-hidden className="size-3.5 shrink-0" />
                Never type passwords, card numbers or codes.
              </p>
              <button
                type="submit"
                className="bg-brand text-brand-foreground hover:bg-brand/90 ml-auto inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors duration-150"
              >
                Check it
                <ArrowRight aria-hidden className="size-4" />
              </button>
            </div>
          </form>

          {examples.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-white">Or try a real-world example:</p>
              <ul className="flex flex-wrap gap-2">
                {examples.map((scenario) => (
                  <li key={scenario.id}>
                    <button
                      type="button"
                      onClick={() => onPickScenario(scenario)}
                      className="rounded-full border border-white/40 px-3.5 py-1.5 text-left text-sm font-medium transition-colors duration-150 hover:bg-white/15"
                    >
                      {scenario.journey_label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <PhoneMock />
      </div>
    </section>
  );
}

/** Illustration: a suspicious text and the assistant's answer. Decorative only. */
function PhoneMock() {
  return (
    <div aria-hidden className="relative mx-auto hidden w-full max-w-[340px] select-none lg:block">
      <div className="bg-ink rounded-[2.75rem] p-3 shadow-[0_30px_60px_rgb(0_0_0/0.3)]">
        <div className="flex flex-col gap-3 rounded-[2.1rem] bg-[#f4f4f6] px-4 pt-8 pb-6 text-[#121212]">
          <div className="mx-auto mb-1 h-1.5 w-20 rounded-full bg-black/15" />
          <p className="text-center text-[11px] font-semibold text-black/50">Messages · 09:41</p>

          <div className="max-w-[85%] self-start rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-[13px] leading-snug shadow-sm">
            Your parcel is on hold. Pay the €1.99 customs fee within 24 h:
            <span className="text-[#0060df] underline"> parcel-hold.example/pay</span>
          </div>

          <div className="bg-brand max-w-[80%] self-end rounded-2xl rounded-br-md px-3.5 py-2.5 text-[13px] leading-snug text-white">
            Is this real? I already clicked the link.
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-black/5 bg-white p-3.5 shadow-sm">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-black/55">
              <ShieldCheck className="text-brand size-3.5" />
              Security assistant
            </p>
            <p className="bg-risk-high text-risk-high-fg inline-flex items-center gap-1.5 self-start rounded-md px-2 py-0.5 text-[11px] font-semibold">
              <TriangleExclamationPoint className="size-3" />
              High risk · Today
            </p>
            <p className="font-heading text-[15px] leading-snug font-semibold">
              Don’t pay. If you typed card details, call your bank now.
            </p>
            <p className="text-[12px] leading-snug text-black/60">
              Customs never asks for payment by text link. Clicking alone is low risk.
            </p>
          </div>
        </div>
      </div>
      <div className="text-ink absolute -bottom-4 -left-6 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-[0_12px_30px_rgb(0_0_0/0.2)]">
        <span className="bg-risk-safe text-risk-safe-fg flex size-8 items-center justify-center rounded-full">
          <ShieldCheck className="size-4" />
        </span>
        <span className="flex flex-col">
          <span className="text-sm font-semibold">One clear next step</span>
          <span className="text-xs text-black/55">In under a minute</span>
        </span>
      </div>
    </div>
  );
}
