"use client";

import {
  Bell,
  CircleCheck,
  Headset,
  LockKeyhole,
  Mail,
  MessageCircle,
  MessageSquareText,
  PhoneCall,
  ShieldCheck,
  TriangleExclamationPoint,
  User,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion, useScrollProgress } from "./motion";

/* ---------------------------------------------------------------------------------------
 * 1. A statement that lights up word by word as the reader scrolls.
 * ------------------------------------------------------------------------------------- */

const STATEMENT =
  "Scammers count on you being in a hurry. We give you a calm minute and one clear next step.";

export function ScrollStatement() {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();
  const reduced = useReducedMotion();
  const words = STATEMENT.split(" ");
  // Start lighting a little after the section pins, finish a little before it lets go.
  const lit = reduced ? words.length : Math.round(((progress - 0.08) / 0.75) * words.length);
  return (
    <section aria-label="Our promise" className="bg-white">
      <div ref={ref} className="relative h-[220vh]">
        <div className="sticky top-0 flex h-screen items-center">
          <p className="font-heading mx-auto max-w-5xl px-4 text-[clamp(2rem,5.2vw,4.25rem)] leading-[1.12] font-bold tracking-tight sm:px-6">
            {words.map((word, i) => (
              <span
                key={i}
                className={cn(
                  "transition-colors duration-300",
                  i < lit ? "text-foreground" : "text-[#ecdde5]",
                )}
              >
                {word}{" "}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------------------
 * 2. "Real or scam?": scrolling down slides a row of messages sideways, and each
 *    one gets its verdict stamped as it passes the middle.
 * ------------------------------------------------------------------------------------- */

type Sample = {
  kind: string;
  icon: LucideIcon;
  from: string;
  text: string;
  scam: boolean;
  why: string;
};

const SAMPLES: Sample[] = [
  {
    kind: "Text message",
    icon: MessageSquareText,
    from: "PARCEL-INFO",
    text: "Your parcel is on hold. Pay the €1.99 customs fee within 24 h: parcel-hold.example/pay",
    scam: true,
    why: "Tiny fee, short deadline, a link that isn’t the courier’s.",
  },
  {
    kind: "Email",
    icon: Mail,
    from: "Your operator",
    text: "Your November invoice of €39.90 is ready in the app. Nothing to do if you pay by e-invoice.",
    scam: false,
    why: "No link, no pressure, and it matches what’s in your app.",
  },
  {
    kind: "Phone call",
    icon: PhoneCall,
    from: "“Bank security”",
    text: "We’ve stopped a suspicious payment. Read me the code we just texted you to cancel it.",
    scam: true,
    why: "No bank ever asks you to read out a code.",
  },
  {
    kind: "Notification",
    icon: Bell,
    from: "Your account",
    text: "New sign-in from Helsinki on an iPhone, just now. Was this you?",
    scam: false,
    why: "You signed in a minute ago. It’s you.",
  },
  {
    kind: "Chat message",
    icon: MessageCircle,
    from: "Unknown number",
    text: "Hi mum, this is my new number. Lost my phone, can you pay a bill for me today?",
    scam: true,
    why: "New number, money, today: the classic family scam.",
  },
  {
    kind: "Text message",
    icon: MessageSquareText,
    from: "Dental clinic",
    text: "Reminder: your appointment is on Tuesday at 10:00. Reply only if you need to cancel.",
    scam: false,
    why: "Nothing asked of you, and you booked it.",
  },
];

export function RealOrScam() {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();
  const reduced = useReducedMotion();
  const n = SAMPLES.length;
  // Each card is "decided" once the row has travelled past it.
  const decided = (i: number) => reduced || progress >= (i + 0.35) / n;

  return (
    <section aria-labelledby="real-or-scam-heading" className="bg-ink text-ink-foreground">
      <div ref={ref} className={cn("relative", reduced ? "" : "h-[420vh]")}>
        <div
          className={cn(
            "flex flex-col justify-center gap-10 overflow-hidden py-16",
            reduced ? "" : "sticky top-0 h-screen",
          )}
        >
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <p className="text-brand-soft text-sm font-semibold">Real or scam?</p>
            <h2
              id="real-or-scam-heading"
              className="mt-2 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl"
            >
              We don’t cry wolf
            </h2>
            <p className="mt-3 max-w-2xl text-lg text-white/75">
              Most messages are harmless. We tell you which ones aren’t, and why, so you can relax
              about the rest.
            </p>
          </div>

          <div
            className={cn("flex gap-5 px-4 sm:px-6", reduced && "overflow-x-auto pb-4")}
            style={
              reduced
                ? undefined
                : {
                    transform: `translateX(calc(${-progress} * (100% - 100vw + 3rem) + 0px))`,
                    width: "max-content",
                  }
            }
          >
            {SAMPLES.map((s, i) => (
              <article
                key={s.text}
                className="relative flex w-[min(78vw,340px)] shrink-0 flex-col gap-3 rounded-3xl bg-white p-5 text-[#121212] shadow-[0_20px_50px_rgb(0_0_0/0.35)]"
              >
                <p className="flex items-center gap-2 pr-24 text-xs font-semibold text-black/55">
                  <s.icon aria-hidden className="text-brand size-4" />
                  {s.kind} from {s.from}
                </p>
                <p className="min-h-[5.5rem] text-[15px] leading-relaxed">{s.text}</p>
                <p
                  className={cn(
                    "text-sm text-black/65 transition-opacity duration-500",
                    decided(i) ? "opacity-100" : "opacity-0",
                  )}
                >
                  {s.why}
                </p>
                <Stamp scam={s.scam} shown={decided(i)} />
              </article>
            ))}
          </div>

          <div aria-hidden className="mx-auto h-1 w-full max-w-6xl px-4 sm:px-6">
            {!reduced && (
              <div className="h-full overflow-hidden rounded-full bg-white/15">
                <div
                  className="bg-brand h-full origin-left rounded-full"
                  style={{ transform: `scaleX(${progress})` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stamp({ scam, shown }: { scam: boolean; shown: boolean }) {
  return (
    <span
      className={cn(
        "font-heading pointer-events-none absolute top-4 right-4 rounded-lg border-[3px] px-2.5 py-0.5 text-sm font-extrabold tracking-wide",
        "transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        scam
          ? "border-risk-critical-line text-risk-critical-fg bg-risk-critical/80"
          : "border-risk-safe-line text-risk-safe-fg bg-risk-safe/80",
        shown ? "scale-100 -rotate-6 opacity-100" : "scale-150 rotate-6 opacity-0",
      )}
    >
      {scam ? "Scam" : "Genuine"}
    </span>
  );
}

/* ---------------------------------------------------------------------------------------
 * 3. How it works: a conversation replays on a pinned phone as the reader scrolls,
 *    and the explanation beside it follows along.
 * ------------------------------------------------------------------------------------- */

const STAGES = [
  {
    title: "Tell us what happened",
    text: "In your own words, in Finnish, Swedish or English. Paste the message, attach a screenshot or just talk.",
  },
  {
    title: "We ask only what matters",
    text: "One question at most, and only if your answer changes the advice. No forms.",
  },
  {
    title: "We ask before we look",
    text: "Checking your SIM or recent logins helps, but only with your permission. Saying no is fine.",
  },
  {
    title: "You get one clear next step",
    text: "How risky it is, how urgent, and exactly what to do, with the reason in plain words.",
  },
  {
    title: "A person takes over when it’s serious",
    text: "If your number is being stolen, you’re connected to DNA support with everything already explained.",
  },
];

export function ChatReplay() {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();
  const reduced = useReducedMotion();
  const stage = reduced
    ? STAGES.length - 1
    : Math.min(STAGES.length - 1, Math.floor(progress * STAGES.length));
  const at = (n: number) => stage >= n;

  return (
    <section aria-labelledby="how-heading" id="how" className="scroll-mt-20 bg-[#fdf6fa]">
      <div ref={ref} className={cn("relative", reduced ? "" : "h-[460vh]")}>
        <div
          className={cn(
            "mx-auto grid w-full max-w-6xl items-center gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_400px] lg:gap-20 lg:py-16",
            reduced ? "" : "sticky top-0 h-screen",
          )}
        >
          <div className="flex flex-col gap-4 lg:gap-6">
            <div className="flex flex-col gap-2 lg:gap-3">
              <p className="text-brand text-sm font-semibold">How it works</p>
              <h2 id="how-heading" className="text-3xl font-bold tracking-tight sm:text-5xl">
                From “is this real?” to a plan
              </h2>
            </div>
            <ol className="flex flex-col gap-1">
              {STAGES.map((s, i) => (
                <li
                  key={s.title}
                  className={cn(
                    "flex gap-4 rounded-2xl p-3 transition-[background-color,opacity] duration-500",
                    i === stage ? "bg-white opacity-100 shadow-sm" : "opacity-45",
                    i !== stage && "max-lg:hidden",
                  )}
                >
                  <span
                    className={cn(
                      "font-heading flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors duration-500",
                      i <= stage ? "bg-brand text-brand-foreground" : "text-brand bg-white",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="font-heading text-lg font-semibold">{s.title}</span>
                    <span
                      className={cn(
                        "text-muted-foreground",
                        i === stage ? "block" : "hidden lg:block lg:max-h-0 lg:overflow-hidden",
                      )}
                    >
                      {s.text}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div aria-hidden className="mx-auto w-full max-w-[380px]">
            <div className="bg-ink rounded-[2.75rem] p-3 shadow-[0_30px_60px_rgb(0_0_0/0.22)]">
              <div className="flex h-[min(560px,44vh)] flex-col justify-end gap-2.5 overflow-hidden rounded-[2.1rem] bg-[#f4f4f6] px-4 pt-8 pb-5 text-[13px] leading-snug text-[#121212] lg:h-[min(560px,62vh)]">
                <Bubble shown me>
                  Someone called from “my operator” and I read out a code they texted me. Now my
                  phone has no signal.
                </Bubble>
                <Bubble shown={at(1)}>Did you read the code out to the caller?</Bubble>
                <Bubble shown={at(1)} me delay>
                  Yes, about ten minutes ago.
                </Bubble>
                <Card shown={at(2)}>
                  <p className="flex items-center gap-1.5 font-semibold">
                    <LockKeyhole className="text-brand size-3.5" />
                    May I check recent changes to your SIM?
                  </p>
                  <span className="bg-brand mt-1.5 inline-block self-start rounded-full px-3 py-1 text-[11px] font-semibold text-white">
                    Allow
                  </span>
                </Card>
                <Card shown={at(3)}>
                  <p className="bg-risk-critical text-risk-critical-fg inline-flex items-center gap-1 self-start rounded-md px-2 py-0.5 text-[11px] font-semibold">
                    <TriangleExclamationPoint className="size-3" />
                    Critical · right now
                  </p>
                  <p className="font-heading mt-1 text-[14px] font-semibold">
                    Your number is being moved. Lock it now.
                  </p>
                </Card>
                <Card shown={at(4)} tone="safe">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <Headset className="text-brand size-3.5" />
                    Connecting you to DNA support…
                  </p>
                  <p className="text-[12px] text-black/60">They already know what happened.</p>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Bubble({
  children,
  shown,
  me = false,
  delay = false,
}: {
  children: React.ReactNode;
  shown: boolean;
  me?: boolean;
  delay?: boolean;
}) {
  return (
    <div
      className={cn(
        "max-w-[85%] rounded-2xl px-3.5 py-2.5 transition-[opacity,translate,max-height] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        me
          ? "bg-brand self-end rounded-br-md text-white"
          : "self-start rounded-bl-md bg-white shadow-sm",
        shown
          ? "max-h-40 translate-y-0 opacity-100"
          : "pointer-events-none max-h-0 translate-y-4 py-0 opacity-0",
        delay && shown && "delay-200",
      )}
    >
      <span className="flex items-start gap-1.5">
        {!me && <ShieldCheck className="text-brand mt-0.5 size-3.5 shrink-0" />}
        {me && <User className="mt-0.5 size-3.5 shrink-0 opacity-70" />}
        <span>{children}</span>
      </span>
    </div>
  );
}

function Card({
  children,
  shown,
  tone,
}: {
  children: React.ReactNode;
  shown: boolean;
  tone?: "safe";
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border bg-white p-3 shadow-sm transition-[opacity,translate,max-height] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        tone === "safe" ? "border-[#cfe8d6]" : "border-black/5",
        shown
          ? "max-h-40 translate-y-0 opacity-100"
          : "pointer-events-none max-h-0 translate-y-4 border-0 p-0 opacity-0",
      )}
    >
      {shown && children}
      {shown && tone === "safe" && (
        <CircleCheck className="text-risk-safe-fg mt-1 size-4 self-end" />
      )}
    </div>
  );
}
