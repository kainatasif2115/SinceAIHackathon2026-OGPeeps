"use client";

import {
  ArrowRight,
  Briefcase,
  CreditCard,
  Hash,
  Headset,
  KeyRound,
  Link,
  MessageSquareWarning,
  PhoneCall,
  Smartphone,
  UserLock,
  type LucideIcon,
} from "lucide-react";
import type { Audience, Scenario } from "@/lib/api";
import type { ScenariosState } from "@/components/assistant/scenario-list";

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
          eyebrow="What we help with"
          title="Something feels off? Start here."
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

const STEPS = [
  {
    title: "Tell us what happened",
    text: "In your own words, in Finnish, Swedish or English. No forms, no jargon.",
  },
  {
    title: "Answer a question or two",
    text: "Only what changes the advice. We ask before we check anything on your account.",
  },
  {
    title: "Get one clear next step",
    text: "How risky it is, how urgent, and exactly what to do. A person takes over when it’s serious.",
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" id="how" className="bg-muted scroll-mt-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6">
        <SectionHeading id="how-heading" eyebrow="How it works" title="Calm help in three steps" />
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-4 rounded-2xl bg-white p-6">
              <span className="bg-ink text-ink-foreground font-heading flex size-10 items-center justify-center rounded-full text-base font-semibold">
                {index + 1}
              </span>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
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
          eyebrow="Scams right now"
          title="See how the assistant handles real situations"
          intro="Synthetic cases from the hackathon’s evaluation set. Pick one to watch the conversation."
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
    <div className="flex max-w-2xl flex-col gap-3">
      <p className="text-brand text-sm font-semibold">{eyebrow}</p>
      <h2 id={id} className="text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {intro && <p className="text-muted-foreground text-lg">{intro}</p>}
    </div>
  );
}
