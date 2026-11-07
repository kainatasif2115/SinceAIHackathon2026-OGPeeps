"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Ear,
  LockKeyhole,
  Mic,
  PhoneCall,
  ShieldCheck,
  TriangleExclamationPoint,
} from "lucide-react";
import type { Audience, Scenario } from "@/lib/api";
import type { ScenariosState } from "@/components/assistant/scenario-list";
import { MAX_MESSAGE_LENGTH } from "@/components/assistant/composer";
import { AttachButton, useImageDrop } from "@/components/assistant/input-tools";
import { ImageError, MAX_IMAGES, prepareImage, type ImageAttachment } from "@/lib/media";
import { cn } from "@/lib/utils";

type Props = {
  audience: Audience;
  scenarios: ScenariosState;
  onAsk: (text: string, images: ImageAttachment[]) => void;
  /** Opens the assistant in hands-free talking mode. */
  onTalk: () => void;
  onPickScenario: (scenario: Scenario) => void;
};

const HEADLINE: Record<Audience, { title: string; intro: string; placeholder: string }> = {
  consumer: {
    title: "Before you click, pay or reply: ask DNA.",
    intro:
      "Tell us about the text, call or email that’s bothering you. In about a minute you’ll know how risky it is and exactly what to do, in Finnish, Swedish or English.",
    placeholder: "For example: I got a text saying my parcel is stuck in customs…",
  },
  small_business: {
    title: "Stop invoice fraud before anyone pays.",
    intro:
      "Check an odd invoice, new bank details or an urgent request from “the CEO” before money leaves. When it’s serious, our business security team takes over.",
    placeholder: "For example: our supplier emailed new bank details for the next invoice…",
  },
};

export function Hero({ audience, scenarios, onAsk, onTalk, onPickScenario }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const copy = HEADLINE[audience];
  const drop = useImageDrop((files) => void sendScreenshots(files));

  /** A screenshot goes straight to the assistant panel, with whatever was typed so far. */
  async function sendScreenshots(files: File[]) {
    const images: ImageAttachment[] = [];
    for (const file of files.slice(0, MAX_IMAGES)) {
      try {
        images.push(await prepareImage(file));
      } catch (err) {
        setError(
          err instanceof ImageError && err.reason === "size"
            ? "That image is too large (over 20 MB)."
            : "That file couldn’t be read as an image. Try a PNG or JPEG screenshot.",
        );
      }
    }
    if (images.length === 0) return;
    setError(null);
    onAsk(text.trim(), images);
    setText("");
  }

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
    onAsk(value, []);
    setText("");
  }

  const examples =
    scenarios.status === "ready"
      ? scenarios.scenarios
          .filter((s) => s.audience === audience && s.language === "en")
          .slice(0, 3)
      : [];

  return (
    <section
      aria-labelledby="hero-heading"
      className="bg-brand text-brand-foreground relative isolate overflow-hidden"
    >
      {/* Soft light from behind the phone and a deeper shade bottom-left, for depth. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(60%_70%_at_82%_45%,rgb(255_255_255/0.16),transparent_70%),radial-gradient(50%_60%_at_0%_100%,rgb(90_0_45/0.35),transparent_70%)]"
      />
      {/* The first screen holds the whole hero: below the top strip and header. */}
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pt-10 pb-20 sm:px-6 lg:min-h-[calc(100svh-6.5rem)] lg:grid-cols-[1.4fr_1fr] lg:gap-12 lg:pt-4 lg:pb-10">
        <div className="flex flex-col gap-5 lg:gap-4">
          <p className="inline-flex items-center gap-2 self-start rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <ShieldCheck aria-hidden className="size-3.5" />
            New: DNA Security Assistant
          </p>
          <div className="flex flex-col gap-4">
            <h1
              id="hero-heading"
              className="font-heading text-[2.25rem] leading-[1.05] font-bold tracking-tight sm:text-5xl xl:text-[3.25rem]"
            >
              {copy.title}
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-white/90">{copy.intro}</p>
          </div>

          <form
            onSubmit={submit}
            noValidate
            className={cn(
              "text-foreground relative flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-[0_24px_60px_rgb(70_0_35/0.35)] ring-1 ring-white/40 sm:p-5",
              drop.dragging && "outline-4 outline-offset-4 outline-white outline-dashed",
            )}
            {...drop.handlers}
          >
            {drop.dragging && (
              <p className="text-brand pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/95 font-semibold">
                Drop the screenshot here
              </p>
            )}
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
              placeholder={`${copy.placeholder} You can also paste a screenshot.`}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "hero-error hero-privacy" : "hero-privacy"}
              className="border-input placeholder:text-muted-foreground focus-visible:border-brand min-h-20 w-full resize-none rounded-xl border px-3.5 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--brand),transparent_75%)]"
            />
            {error && (
              <p id="hero-error" role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <div className="-ml-2 flex items-center">
                <AttachButton onFiles={(files) => void sendScreenshots(files)} />
                {/* Speaking opens the assistant panel in hands-free mode. */}
                <button
                  type="button"
                  onClick={onTalk}
                  title="Talk to the assistant"
                  className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-10 items-center justify-center rounded-full transition-colors duration-150"
                >
                  <Mic aria-hidden className="size-5" />
                  <span className="sr-only">Talk to the assistant</span>
                </button>
              </div>
              <p
                id="hero-privacy"
                className="text-muted-foreground mr-auto flex items-center gap-1.5 text-xs"
              >
                <LockKeyhole aria-hidden className="size-3.5 shrink-0" />
                Never type passwords, card numbers or codes.
              </p>
              <button
                type="submit"
                className="bg-brand text-brand-foreground hover:bg-brand/90 inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors duration-150"
              >
                Check it
                <ArrowRight aria-hidden className="size-4" />
              </button>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onTalk}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-semibold ring-1 ring-white/50 backdrop-blur-sm transition-colors duration-150 hover:bg-white/25"
            >
              <PhoneCall aria-hidden className="size-4" />
              Prefer to talk? Go hands-free
            </button>
            <Link
              href="/call"
              className="inline-flex h-10 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-semibold ring-1 ring-white/50 backdrop-blur-sm transition-colors duration-150 hover:bg-white/25"
            >
              <Ear aria-hidden className="size-4" />
              On a call right now? We’ll listen
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>

          {examples.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="mr-1 text-sm font-semibold text-white/85">Or see how we handle:</p>
              <ul className="contents">
                {examples.map((scenario) => (
                  <li key={scenario.id}>
                    <button
                      type="button"
                      onClick={() => onPickScenario(scenario)}
                      className="rounded-full border border-dashed border-white/50 px-3 py-1 text-left text-[13px] font-medium transition-colors duration-150 hover:border-solid hover:bg-white/15"
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
      <svg
        aria-hidden
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-8 w-full text-white sm:h-12"
      >
        <path d="M0 60 C 360 0, 1080 0, 1440 60 Z" fill="currentColor" />
      </svg>
    </section>
  );
}

/**
 * Illustration: a suspicious text types itself in, the customer asks, and the
 * assistant's verdict slides up, once on load. Signal rings radiate behind
 * the phone. Decorative only; with reduced motion it is shown complete.
 */
function PhoneMock() {
  return (
    <div aria-hidden className="relative mx-auto hidden w-full max-w-[340px] select-none lg:block">
      <SignalRings />
      <div className="bg-ink relative rounded-[2.75rem] p-2.5 shadow-[0_30px_60px_rgb(0_0_0/0.3)]">
        <div className="flex flex-col gap-3 rounded-[2.1rem] bg-[#f4f4f6] px-4 pt-8 pb-6 text-[#121212]">
          <div className="mx-auto mb-1 h-1.5 w-20 rounded-full bg-black/15" />
          <p className="text-center text-[11px] font-semibold text-black/50">Messages · 09:41</p>

          <div className="max-w-[85%] self-start rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-[13px] leading-snug shadow-sm">
            <TypeIn text="Your parcel is on hold. Pay the €1.99 customs fee within 24 h: " />
            <span className="animate-in fade-in fill-mode-both text-[#0060df] underline delay-[1500ms] duration-300">
              parcel-hold.example/pay
            </span>
          </div>

          <div className="bg-brand animate-in fade-in zoom-in-95 slide-in-from-bottom-2 fill-mode-both max-w-[80%] self-end rounded-2xl rounded-br-md px-3.5 py-2.5 text-[13px] leading-snug text-white delay-[2100ms] duration-400">
            Is this real? I already clicked the link.
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both flex flex-col gap-2 rounded-2xl border border-black/5 bg-white p-3.5 shadow-sm delay-[2900ms] duration-700">
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
      <div className="text-ink animate-in fade-in slide-in-from-left-4 fill-mode-both absolute -bottom-4 -left-6 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-[0_12px_30px_rgb(0_0_0/0.2)] delay-[3500ms] duration-700">
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

/** Concentric rings radiating from behind the phone, offset so they never pulse together. */
function SignalRings() {
  return (
    <svg
      viewBox="0 0 600 600"
      className="pointer-events-none absolute top-1/2 left-1/2 -z-0 size-[170%] -translate-x-1/2 -translate-y-1/2"
    >
      {[0, 1.25, 2.5, 3.75].map((delay) => (
        <circle
          key={delay}
          cx="300"
          cy="300"
          r="200"
          fill="none"
          stroke="white"
          strokeWidth="2.25"
          className="signal-ring"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </svg>
  );
}

/** Types `text` out once on mount; shown whole with reduced motion. */
function TypeIn({ text, speed = 22 }: { text: string; speed?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = requestAnimationFrame(() => setCount(text.length));
      return () => cancelAnimationFrame(frame);
    }
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return (
    <>
      {text.slice(0, count)}
      {count < text.length && (
        <span className="ml-px inline-block h-[1em] w-px animate-pulse bg-black/60 align-[-2px]" />
      )}
    </>
  );
}
