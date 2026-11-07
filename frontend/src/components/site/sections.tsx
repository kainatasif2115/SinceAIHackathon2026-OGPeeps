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
import type { Audience } from "@/lib/api";
import type { TopicSuggestions } from "@/components/assistant/start-view";
import { Reveal } from "./motion";

type Topic = { icon: LucideIcon; title: string; text: string; examples: string[] };

const TOPICS: Record<Audience, Topic[]> = {
  consumer: [
    {
      icon: MessageSquareWarning,
      title: "Strange texts and emails",
      text: "Parcel fees, bank alerts, prize wins",
      examples: [
        "I got a text saying my parcel is stuck in customs and I need to pay €1.99.",
        "An email from my bank says my account is locked unless I confirm my details today.",
        "A message says I’ve won a phone and only need to pay the shipping.",
      ],
    },
    {
      icon: PhoneCall,
      title: "Suspicious calls",
      text: "“Tech support”, police or bank staff",
      examples: [
        "Someone from “bank security” called and asked me to read out the code they texted me.",
        "A caller said he’s from Microsoft and my computer has a virus.",
        "Someone claiming to be the police said my money isn’t safe and I must move it.",
      ],
    },
    {
      icon: Link,
      title: "I already clicked",
      text: "Opened a link or typed in my details",
      examples: [
        "I clicked a link in a text about a parcel and typed in my card number.",
        "I logged in to what I thought was my bank, but the address looked odd.",
        "I opened a link from an unknown number but didn’t type anything.",
      ],
    },
    {
      icon: UserLock,
      title: "Account taken over",
      text: "Login alerts, changed password",
      examples: [
        "I got an alert about a sign-in from another country that wasn’t me.",
        "My email password was changed and I can’t log in anymore.",
        "My friends are getting messages from my account that I didn’t send.",
      ],
    },
    {
      icon: Smartphone,
      title: "SIM or eSIM changes",
      text: "Lost signal, number moved",
      examples: [
        "My phone suddenly says No service and my partner’s phone works fine.",
        "I got a text that my eSIM is being moved to a new device. I didn’t ask for that.",
      ],
    },
    {
      icon: Headset,
      title: "Something else",
      text: "Describe it and we’ll take it from there",
      examples: [
        "Someone I met online is asking me to send money for a plane ticket.",
        "A website offers a new phone at half price. Is it real?",
      ],
    },
  ],
  small_business: [
    {
      icon: Briefcase,
      title: "CEO and invoice fraud",
      text: "Urgent payments, changed bank details",
      examples: [
        "Our supplier emailed new bank details for the next invoice.",
        "The CEO emailed me asking for an urgent, confidential payment today.",
      ],
    },
    {
      icon: MessageSquareWarning,
      title: "Phishing at work",
      text: "Fake shared files, Microsoft 365 alerts",
      examples: [
        "A colleague shared a file that asks me to log in to Microsoft 365 again.",
        "We got an email saying our mailbox is full and will be closed today.",
      ],
    },
    {
      icon: UserLock,
      title: "Company account access",
      text: "Admin logins, lost devices",
      examples: [
        "Our admin account got a sign-in from a country where we have no staff.",
        "An employee lost a work laptop that was still logged in.",
      ],
    },
    {
      icon: PhoneCall,
      title: "Calls to your team",
      text: "Callers who ask for codes or access",
      examples: [
        "Someone called our receptionist claiming to be IT and asked for a login code.",
        "A caller from “DNA” asked our office to confirm the company’s SIM details.",
      ],
    },
    {
      icon: Smartphone,
      title: "Work phones and SIMs",
      text: "Lost signal, unexpected eSIM",
      examples: [
        "The CEO’s work phone lost signal and we got an eSIM change notice.",
        "Several work phones show No service at the same time.",
      ],
    },
    {
      icon: Headset,
      title: "Something else",
      text: "Describe it and we’ll take it from there",
      examples: [
        "A new customer wants to overpay and have us refund the difference.",
        "We got a fake-looking domain renewal invoice.",
      ],
    },
  ],
};

export function HelpTopics({
  audience,
  onOpen,
}: {
  audience: Audience;
  onOpen: (topic: TopicSuggestions) => void;
}) {
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
                onClick={() => onOpen({ title: topic.title, examples: topic.examples })}
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
