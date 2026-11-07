"use client";

import {
  Bell,
  Mail,
  MessageCircle,
  MessageSquareText,
  PhoneCall,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";
import { useReducedMotion, useScrollProgress, useSmoothScrollProgress } from "./motion";

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
  const reduced = useReducedMotion();
  const n = SAMPLES.length;
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  // How many cards have their verdict; only re-renders when this number changes.
  const [decided, setDecided] = useState(0);
  const sectionRef = useSmoothScrollProgress<HTMLDivElement>((p) => {
    const el = track.current;
    if (el) {
      const travel = Math.max(0, el.scrollWidth - window.innerWidth);
      el.style.transform = `translate3d(${-p * travel}px, 0, 0)`;
    }
    if (bar.current) bar.current.style.transform = `scaleX(${p})`;
    const count = Math.min(n, Math.floor(p * n + 0.65));
    setDecided((prev) => (prev === count ? prev : count));
  });
  const isDecided = (i: number) => reduced || i < decided;

  return (
    <section aria-labelledby="real-or-scam-heading" className="bg-ink text-ink-foreground">
      <div ref={sectionRef} className={cn("relative", reduced ? "" : "h-[380vh]")}>
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
            ref={track}
            className={cn(
              // Starts in line with the heading above, wherever the screen edge is.
              "flex w-max items-start gap-5 pr-[max(1rem,calc((100vw-72rem)/2+1.5rem))] pl-[max(1rem,calc((100vw-72rem)/2+1.5rem))]",
              reduced ? "max-w-full overflow-x-auto pb-4" : "will-change-transform",
            )}
          >
            {SAMPLES.map((s, i) => (
              <article
                key={s.text}
                className="relative flex w-[min(78vw,330px)] shrink-0 flex-col gap-3 rounded-3xl bg-white p-5 text-[#121212] shadow-[0_20px_50px_rgb(0_0_0/0.35)]"
              >
                <p className="flex items-center gap-2 pr-24 text-xs font-semibold text-black/55">
                  <s.icon aria-hidden className="text-brand size-4 shrink-0" />
                  {s.kind} from {s.from}
                </p>
                <p className="text-[15px] leading-relaxed">{s.text}</p>
                <p
                  className={cn(
                    "border-t border-black/5 pt-3 text-sm text-black/65 transition-opacity duration-500",
                    isDecided(i) ? "opacity-100" : "opacity-0",
                  )}
                >
                  {s.why}
                </p>
                <Stamp scam={s.scam} shown={isDecided(i)} />
              </article>
            ))}
          </div>

          {!reduced && (
            <div aria-hidden className="mx-auto h-1 w-full max-w-6xl px-4 sm:px-6">
              <div className="h-full overflow-hidden rounded-full bg-white/15">
                <div ref={bar} className="bg-brand h-full origin-left scale-x-0 rounded-full" />
              </div>
            </div>
          )}
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
