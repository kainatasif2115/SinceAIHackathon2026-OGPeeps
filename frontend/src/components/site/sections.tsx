"use client";

import {
  ArrowRight,
  Briefcase,
  CircleCheck,
  CircleHelp,
  CreditCard,
  Hash,
  Headset,
  KeyRound,
  Link,
  MessageSquareWarning,
  PhoneCall,
  ShieldCheck,
  Smartphone,
  TriangleExclamationPoint,
  UserLock,
  type LucideIcon,
} from "lucide-react";
import type { Audience, Scenario } from "@/lib/api";
import type { ScenariosState } from "@/components/assistant/scenario-list";
import { Reveal } from "./motion";

type Topic = { icon: LucideIcon; title: string; text: string };

const TOPICS: Record<Audience, Topic[]> = {
  consumer: [
    {
      icon: MessageSquareWarning,
      title: "Strange texts and emails",
      text: "Parcel fees, bank alerts, prize wins",
    },
    { icon: PhoneCall, title: "Suspicious calls", text: "“Tech support”, police or bank staff" },
    { icon: Link, title: "I already clicked", text: "Opened a link or typed in my details" },
    { icon: UserLock, title: "Account taken over", text: "Login alerts, changed password" },
    { icon: Smartphone, title: "SIM or eSIM changes", text: "Lost signal, number moved" },
    { icon: Headset, title: "Something else", text: "Describe it and we’ll take it from there" },
  ],
  small_business: [
    {
      icon: Briefcase,
      title: "CEO and invoice fraud",
      text: "Urgent payments, changed bank details",
    },
    {
      icon: MessageSquareWarning,
      title: "Phishing at work",
      text: "Fake shared files, Microsoft 365 alerts",
    },
    { icon: UserLock, title: "Company account access", text: "Admin logins, lost devices" },
    { icon: PhoneCall, title: "Calls to your team", text: "Callers who ask for codes or access" },
    { icon: Smartphone, title: "Work phones and SIMs", text: "Lost signal, unexpected eSIM" },
    { icon: Headset, title: "Something else", text: "Describe it and we’ll take it from there" },
  ],
};

export function HelpTopics({ audience, onOpen }: { audience: Audience; onOpen: () => void }) {
  return (
    <section aria-labelledby="topics-heading" id="help-topics" className="scroll-mt-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6">
        <SectionHeading
          id="topics-heading"
          eyebrow="One place for every worry"
          title="Whatever made you stop and think, start here"
        />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS[audience].map((topic) => (
            <li key={topic.title}>
              <button
                type="button"
                onClick={onOpen}
                className="group border-border hover:border-brand flex h-full w-full items-center gap-4 rounded-2xl border bg-white p-5 text-left transition-colors duration-150"
              >
                <span className="bg-brand-soft text-brand flex size-12 shrink-0 items-center justify-center rounded-full">
                  <topic.icon aria-hidden className="size-5.5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-heading font-semibold">{topic.title}</span>
                  <span className="text-muted-foreground text-sm">{topic.text}</span>
                </span>
                <ArrowRight
                  aria-hidden
                  className="text-muted-foreground group-hover:text-brand size-4 shrink-0 transition-[color,transform] duration-150 group-hover:translate-x-0.5"
                />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function ScamsNow({
  audience,
  scenarios,
  onPick,
}: {
  audience: Audience;
  scenarios: ScenariosState;
  onPick: (scenario: Scenario) => void;
}) {
  const list =
    scenarios.status === "ready"
      ? scenarios.scenarios
          .filter((s) => s.audience === audience)
          .sort((a, b) => Number(b.language === "en") - Number(a.language === "en"))
          .slice(0, 6)
      : [];

  return (
    <section aria-labelledby="scams-heading" id="scams" className="scroll-mt-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6">
        <SectionHeading
          id="scams-heading"
          eyebrow="Going around right now"
          title="Recognise any of these?"
          intro="Pick one and watch how we’d help you through it."
        />
        {scenarios.status === "loading" && (
          <p className="text-muted-foreground text-sm">Loading examples…</p>
        )}
        {scenarios.status === "error" && (
          <p className="text-muted-foreground text-sm">
            Examples could not be loaded. You can still describe your own situation.
          </p>
        )}
        {list.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((scenario) => (
              <li key={scenario.id}>
                <button
                  type="button"
                  onClick={() => onPick(scenario)}
                  className="group border-border hover:border-brand flex h-full w-full flex-col gap-3 rounded-2xl border bg-white p-5 text-left transition-colors duration-150"
                >
                  <span className="flex items-center gap-2">
                    <span className="bg-brand-soft text-accent-foreground rounded-full px-2.5 py-0.5 text-xs font-semibold">
                      {scenario.journey_label}
                    </span>
                    <span className="text-muted-foreground border-border rounded-sm border px-1 text-[0.6875rem] leading-4 font-semibold">
                      {scenario.language.toUpperCase()}
                    </span>
                  </span>
                  <span lang={scenario.language} className="font-heading flex-1 font-semibold">
                    {scenario.title}
                  </span>
                  <span className="text-brand inline-flex items-center gap-1.5 text-sm font-semibold">
                    Try this example
                    <ArrowRight
                      aria-hidden
                      className="size-4 transition-transform duration-150 group-hover:translate-x-0.5"
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

const NEVER = [
  { icon: KeyRound, label: "Your passwords" },
  { icon: Hash, label: "PINs or verification codes" },
  { icon: CreditCard, label: "Card or bank details" },
];

export function TrustBand({ onOpen }: { onOpen: () => void }) {
  return (
    <section
      aria-labelledby="never-heading"
      id="never"
      className="bg-ink text-ink-foreground scroll-mt-20"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center">
        <div className="flex flex-col gap-4">
          <p className="text-brand-soft text-sm font-semibold">Stay safe</p>
          <h2 id="never-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
            We will never ask you for
          </h2>
          <p className="text-ink-foreground/80 max-w-prose">
            Not in a message, not on a call, not in this assistant. Anyone who asks is not us. If it
            is serious, the assistant hands you to a person and tells them what you already said, so
            you don’t have to repeat yourself.
          </p>
          <button
            type="button"
            onClick={onOpen}
            className="bg-brand text-brand-foreground hover:bg-brand/90 mt-2 inline-flex h-11 items-center gap-2 self-start rounded-full px-5 text-sm font-semibold transition-colors duration-150"
          >
            Check something now
            <ArrowRight aria-hidden className="size-4" />
          </button>
        </div>
        <ul className="grid gap-3">
          {NEVER.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <span className="bg-brand text-brand-foreground flex size-11 items-center justify-center rounded-full">
                <item.icon aria-hidden className="size-5" />
              </span>
              <span className="font-heading text-lg font-semibold">{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
  intro,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
}) {
  return (
    <Reveal className="flex max-w-2xl flex-col gap-3">
      <p className="text-brand text-sm font-semibold">{eyebrow}</p>
      <h2 id={id} className="text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {intro && <p className="text-muted-foreground text-lg">{intro}</p>}
    </Reveal>
  );
}

/** The pitch in two cards: a typical vague warning next to what the assistant says. */
export function BeforeAfter() {
  return (
    <section aria-labelledby="before-after-heading" className="bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6">
        <SectionHeading
          id="before-after-heading"
          eyebrow="Not just another warning"
          title="Other apps tell you something is wrong. We tell you what to do."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <figure className="border-border flex flex-col gap-4 rounded-2xl border bg-[#f4f4f6] p-6">
            <figcaption className="text-muted-foreground text-sm font-semibold">
              A typical warning today
            </figcaption>
            <div className="flex items-start gap-3 rounded-xl border border-black/5 bg-white p-4">
              <TriangleExclamationPoint
                aria-hidden
                className="mt-0.5 size-5 shrink-0 text-[#b26a00]"
              />
              <div className="flex flex-col gap-1">
                <p className="font-semibold">This message may be suspicious.</p>
                <p className="text-muted-foreground text-sm">Be careful with links.</p>
              </div>
            </div>
            <ul className="text-muted-foreground flex flex-col gap-2 text-sm">
              {[
                "Is it actually a scam, or not?",
                "What should I do now?",
                "I already clicked. Is it too late?",
              ].map((doubt) => (
                <li key={doubt} className="flex items-center gap-2">
                  <CircleHelp aria-hidden className="size-4 shrink-0" />
                  {doubt}
                </li>
              ))}
            </ul>
          </figure>

          <figure className="border-brand flex flex-col gap-4 rounded-2xl border-2 bg-white p-6 shadow-[0_12px_32px_rgb(218_0_112/0.12)]">
            <figcaption className="text-brand flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck aria-hidden className="size-4" />
              With DNA Security Assistant
            </figcaption>
            <div className="overflow-hidden rounded-xl border border-black/5">
              <p className="bg-risk-medium text-risk-medium-fg flex items-center gap-2 px-4 py-2 text-sm font-semibold">
                <TriangleExclamationPoint aria-hidden className="size-4" />
                Medium risk · When you have time
              </p>
              <div className="flex flex-col gap-2 p-4">
                <p className="font-heading text-lg font-semibold">Don’t pay. Delete the message.</p>
                <p className="text-sm">
                  <span className="font-semibold">Why:</span> customs never asks for a fee through a
                  text link. The small amount makes paying feel easier than checking.
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Already clicked?</span> If you typed card details,
                  block the card in your bank’s app now. Clicking alone is low risk.
                </p>
              </div>
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              {[
                "One clear next step, and why",
                "What to do if you already acted",
                "A person takes over when it’s serious",
              ].map((gain) => (
                <li key={gain} className="flex items-center gap-2">
                  <CircleCheck aria-hidden className="text-risk-safe-fg size-4 shrink-0" />
                  {gain}
                </li>
              ))}
            </ul>
          </figure>
        </div>
      </div>
    </section>
  );
}
