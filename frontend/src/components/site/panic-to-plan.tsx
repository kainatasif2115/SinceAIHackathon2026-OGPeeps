"use client";

import { useRef, useState } from "react";
import {
  Bell,
  CircleAlert,
  Headset,
  Link,
  LockKeyhole,
  MessageSquareText,
  PhoneCall,
  ShieldCheck,
  Smartphone,
  TriangleExclamationPoint,
  User,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion, useSmoothScrollProgress } from "./motion";

/*
 * "From panic to plan": a pinned scene that tells the product story as the
 * reader scrolls. Scam notifications are scattered over a dark red screen;
 * the DNA shield appears and pulls them in; one question; then the screen
 * calms to white and a single clear answer rises, with a timer under a minute.
 * All motion is written straight to the DOM each frame (no React re-render),
 * eased toward the scroll position.
 */

type Chaos = { icon: LucideIcon; text: string; x: number; y: number; r: number };

// Scattered positions as % of the stage, with a tilt in degrees.
const CHAOS: Chaos[] = [
  { icon: CircleAlert, text: "URGENT: your account is locked", x: 14, y: 18, r: -8 },
  { icon: PhoneCall, text: "Bank security calling…", x: 72, y: 14, r: 6 },
  { icon: MessageSquareText, text: "Read me the code we just sent", x: 82, y: 46, r: -5 },
  { icon: Link, text: "Click here to verify: secure-login.example", x: 10, y: 52, r: 7 },
  { icon: Smartphone, text: "No service", x: 30, y: 82, r: -4 },
  { icon: Bell, text: "Your number is being moved", x: 66, y: 80, r: 9 },
  { icon: TriangleExclamationPoint, text: "Pay €1.99 within 24 h", x: 44, y: 10, r: -3 },
  { icon: CircleAlert, text: "Don’t tell anyone about this call", x: 86, y: 70, r: -9 },
  { icon: MessageSquareText, text: "Your parcel is on hold", x: 20, y: 34, r: 4 },
];

const PHASES = [
  "It starts with panic.",
  "You tell us. We take it from there.",
  "One question. Only if it matters.",
  "One clear next step. In under a minute.",
];

const clamp = (v: number) => Math.min(1, Math.max(0, v));
/** 0→1 as p goes from a to b, eased out. */
const span = (p: number, a: number, b: number) => {
  const t = clamp((p - a) / (b - a));
  return 1 - Math.pow(1 - t, 3);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export function PanicToPlan() {
  const reduced = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const chaos = useRef<(HTMLDivElement | null)[]>([]);
  const shield = useRef<HTMLDivElement>(null);
  const question = useRef<HTMLDivElement>(null);
  const reply = useRef<HTMLDivElement>(null);
  const answer = useRef<HTMLDivElement>(null);
  const timer = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState(0);

  const sectionRef = useSmoothScrollProgress<HTMLDivElement>((p) => {
    // Background: deep red panic → calm white-pink.
    const calm = span(p, 0.72, 0.9);
    if (stage.current) {
      const from = [26, 8, 14];
      const to = [253, 246, 250];
      const [r, g, b] = from.map((c, i) => Math.round(mix(c, to[i], calm)));
      stage.current.style.backgroundColor = `rgb(${r} ${g} ${b})`;
      stage.current.style.color = calm > 0.5 ? "#121212" : "#ffffff";
    }

    // Chaos drifts, then is pulled into the shield and vanishes.
    const pull = span(p, 0.22, 0.5);
    CHAOS.forEach((c, i) => {
      const el = chaos.current[i];
      if (!el) return;
      const drift = (0.22 - Math.min(p, 0.22)) * (i % 2 ? 40 : -40);
      const x = mix(c.x, 50, pull);
      const y = mix(c.y, 50, pull) + drift * (1 - pull);
      el.style.left = `${x}%`;
      el.style.top = `${y}%`;
      el.style.transform = `translate(-50%, -50%) rotate(${mix(c.r, 0, pull)}deg) scale(${mix(1, 0.15, pull)})`;
      el.style.opacity = String(1 - span(p, 0.4, 0.52));
    });

    // The shield grows in, pulses while pulling, then steps aside.
    if (shield.current) {
      const grow = span(p, 0.16, 0.34);
      const leave = span(p, 0.52, 0.62);
      shield.current.style.transform = `translate(-50%, -50%) scale(${mix(0.2, 1, grow) * mix(1, 0.6, leave)})`;
      shield.current.style.opacity = String(grow * (1 - leave));
    }

    // One question, then the reply.
    const q = span(p, 0.54, 0.62) * (1 - span(p, 0.78, 0.84));
    if (question.current) {
      question.current.style.opacity = String(q);
      question.current.style.transform = `translate(-50%, ${mix(30, 0, q)}px) scale(${mix(0.94, 1, q)})`;
    }
    const a = span(p, 0.62, 0.68) * (1 - span(p, 0.78, 0.84));
    if (reply.current) {
      reply.current.style.opacity = String(a);
      reply.current.style.transform = `translate(0, ${mix(20, 0, a)}px)`;
    }

    // The answer rises as the screen calms.
    const ans = span(p, 0.82, 0.94);
    if (answer.current) {
      answer.current.style.opacity = String(ans);
      answer.current.style.transform = `translate(-50%, ${mix(80, 0, ans)}px) scale(${mix(0.9, 1, ans)})`;
    }

    // Timer: counts while we work, stops just under a minute.
    if (timer.current) {
      const seconds = Math.round(58 * span(p, 0.18, 0.92));
      timer.current.textContent = `0:${String(seconds).padStart(2, "0")}`;
    }

    const next = p < 0.2 ? 0 : p < 0.52 ? 1 : p < 0.78 ? 2 : 3;
    setPhase((prev) => (prev === next ? prev : next));
  });

  if (reduced) return <StaticVersion />;

  return (
    <section id="how" aria-labelledby="how-heading" className="scroll-mt-20">
      <h2 id="how-heading" className="sr-only">
        How it works: from panic to a clear next step
      </h2>
      <ol className="sr-only">
        {PHASES.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>
      <div ref={sectionRef} className="relative h-[520vh]">
        <div
          ref={stage}
          aria-hidden
          className="sticky top-0 h-screen overflow-hidden text-white"
          style={{ backgroundColor: "rgb(26 8 14)" }}
        >
          {/* Headline for the current phase */}
          <div className="absolute inset-x-0 top-[9%] z-20 flex justify-center px-4 text-center">
            {PHASES.map((text, i) => (
              <p
                key={text}
                className={cn(
                  "font-heading absolute max-w-4xl px-4 text-[clamp(1.9rem,5vw,4.25rem)] leading-[1.05] font-bold tracking-tight transition-[opacity,transform]",
                  // The old line clears out before the new one arrives, so they never overlap.
                  i === phase
                    ? "translate-y-0 opacity-100 delay-200 duration-500"
                    : "-translate-y-3 opacity-0 duration-200",
                )}
              >
                {text}
              </p>
            ))}
          </div>

          {/* Timer */}
          <div className="absolute bottom-[6%] left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-current/20 px-4 py-1.5 text-sm font-semibold tabular-nums opacity-80">
            <span className="bg-brand size-2 animate-pulse rounded-full" />
            <span ref={timer}>0:00</span>
          </div>

          {/* The chaos */}
          {CHAOS.map((c, i) => (
            <div
              key={c.text}
              ref={(el) => {
                chaos.current[i] = el;
              }}
              className="absolute z-10 flex items-center gap-2 rounded-2xl bg-white/95 px-3.5 py-2.5 text-[13px] font-semibold whitespace-nowrap text-[#121212] shadow-[0_12px_30px_rgb(0_0_0/0.35)] will-change-transform sm:text-sm"
              style={{
                left: `${c.x}%`,
                top: `${c.y}%`,
                transform: `translate(-50%, -50%) rotate(${c.r}deg)`,
              }}
            >
              <c.icon className="text-risk-critical-fg size-4 shrink-0" />
              {c.text}
            </div>
          ))}

          {/* The shield */}
          <div
            ref={shield}
            className="absolute top-1/2 left-1/2 z-10 opacity-0 will-change-transform"
            style={{ transform: "translate(-50%, -50%) scale(0.2)" }}
          >
            <span className="bg-brand absolute inset-0 animate-ping rounded-full opacity-30" />
            <span className="bg-brand/25 absolute -inset-10 rounded-full blur-2xl" />
            <span className="bg-brand relative flex size-36 items-center justify-center rounded-full shadow-[0_0_80px_rgb(218_0_112/0.6)] sm:size-44">
              <ShieldCheck className="size-16 text-white sm:size-20" />
            </span>
          </div>

          {/* One question */}
          <div
            ref={question}
            className="absolute top-1/2 left-1/2 z-10 flex w-[min(90vw,440px)] flex-col gap-3 opacity-0"
          >
            <div className="flex items-start gap-2 self-start rounded-3xl rounded-bl-md bg-white px-5 py-4 text-lg font-semibold text-[#121212] shadow-[0_20px_50px_rgb(0_0_0/0.35)]">
              <ShieldCheck className="text-brand mt-1 size-5 shrink-0" />
              Did you read the code out to the caller?
            </div>
            <div
              ref={reply}
              className="bg-brand flex items-start gap-2 self-end rounded-3xl rounded-br-md px-5 py-4 text-lg font-semibold text-white opacity-0 shadow-[0_20px_50px_rgb(218_0_112/0.35)]"
            >
              <User className="mt-1 size-5 shrink-0 opacity-80" />
              Yes, ten minutes ago.
            </div>
          </div>

          {/* The answer */}
          <div
            ref={answer}
            className="absolute top-[30%] left-1/2 z-10 w-[min(92vw,520px)] opacity-0 will-change-transform"
          >
            <div className="flex flex-col gap-4 rounded-[2rem] border border-[#f3e4ec] bg-white p-6 text-[#121212] shadow-[0_30px_80px_rgb(218_0_112/0.18)] sm:p-8">
              <p className="bg-risk-critical text-risk-critical-fg inline-flex items-center gap-1.5 self-start rounded-lg px-2.5 py-1 text-sm font-semibold">
                <TriangleExclamationPoint className="size-4" />
                Critical · act right now
              </p>
              <p className="font-heading text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
                Lock your number now.
              </p>
              <p className="text-base text-black/65">
                The code you read out lets someone move your number to their SIM. We’ll stop it
                together, then check your bank.
              </p>
              <div className="flex items-center gap-3 rounded-2xl bg-[#fdf6fa] p-3.5">
                <span className="bg-brand flex size-10 shrink-0 items-center justify-center rounded-full text-white">
                  <Headset className="size-5" />
                </span>
                <span className="flex flex-col">
                  <span className="font-semibold">Connecting you to DNA support…</span>
                  <span className="text-sm text-black/60">They already know what happened.</span>
                </span>
                <LockKeyhole className="text-brand ml-auto size-5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** With reduced motion: the same story as a calm, static sequence. */
function StaticVersion() {
  return (
    <section id="how" aria-labelledby="how-heading" className="scroll-mt-20 bg-[#fdf6fa]">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-20 sm:px-6">
        <h2 id="how-heading" className="text-3xl font-bold tracking-tight sm:text-5xl">
          From panic to a plan, in under a minute
        </h2>
        <ol className="flex flex-col gap-3">
          {PHASES.map((text, i) => (
            <li key={text} className="flex items-center gap-4 rounded-2xl bg-white p-4">
              <span className="bg-brand font-heading flex size-9 shrink-0 items-center justify-center rounded-full font-bold text-white">
                {i + 1}
              </span>
              <span className="font-heading text-lg font-semibold">{text}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
