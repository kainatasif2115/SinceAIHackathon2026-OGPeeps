"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Flag, ShieldCheck, TriangleExclamationPoint } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "./motion";

type Step = { title: string; body: string; flag?: string; snippet?: string };

// One synthetic scam text, taken apart step by step as the reader scrolls.
const STEPS: Step[] = [
  {
    title: "It looks official",
    body: "Anyone can set the name a text appears to come from. A familiar sender proves nothing about who really sent it.",
    flag: "Sender name can be faked",
    snippet: "PARCEL-INFO",
  },
  {
    title: "It rushes you",
    body: "A short deadline is there to stop you from checking. Real companies give you time and other ways to pay.",
    flag: "Pressure to act fast",
    snippet: "within 24 h",
  },
  {
    title: "The fee is tiny",
    body: "€1.99 feels too small to question. The real target is the card number you type in to pay it.",
    flag: "Small fee, big catch",
    snippet: "€1.99",
  },
  {
    title: "The link isn’t theirs",
    body: "Customs and delivery firms don’t ask for payment by text link. Open their own app or website yourself instead.",
    flag: "Link to a look-alike site",
    snippet: "parcel-hold.example/pay",
  },
  {
    title: "Then: one clear next step",
    body: "The assistant puts it together and says exactly what to do, including what to do if you already clicked.",
  },
];

/** Index of the step nearest the middle of the screen. */
function useActiveStep(count: number) {
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  // -1 until the first step reaches the middle of the screen, so nothing is marked early.
  const [active, setActive] = useState(-1);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.step));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.slice(0, count).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [count]);
  return { refs, active };
}

/**
 * Signature scroll moment: a phone stays pinned while the reader scrolls, and
 * each step marks up one tell in the scam text, ending with the assistant's
 * answer. On narrow screens each step shows its own highlighted snippet.
 */
export function Anatomy() {
  const { refs, active } = useActiveStep(STEPS.length);
  return (
    <section aria-labelledby="anatomy-heading" className="bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
        <Reveal className="flex max-w-2xl flex-col gap-3">
          <p className="text-brand text-sm font-semibold">Anatomy of a scam</p>
          <h2 id="anatomy-heading" className="text-3xl font-bold tracking-tight sm:text-5xl">
            Four tells in one text message
          </h2>
          <p className="text-muted-foreground text-lg">
            Scroll through a typical parcel scam and see what the assistant notices.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-20">
          <div className="hidden lg:block">
            <div className="sticky top-28">
              <ScamPhone active={active} />
            </div>
          </div>

          <ol className="flex flex-col">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                data-step={i}
                className="flex min-h-[44vh] flex-col justify-center py-8 lg:min-h-[70vh]"
              >
                <div
                  className={cn(
                    "flex flex-col gap-3 transition-opacity duration-500",
                    active === i ? "opacity-100" : "lg:opacity-35",
                  )}
                >
                  <span
                    className={cn(
                      "font-heading flex size-10 items-center justify-center rounded-full text-base font-bold transition-colors duration-500",
                      active >= i ? "bg-brand text-brand-foreground" : "bg-brand-soft text-brand",
                    )}
                  >
                    {i + 1}
                  </span>
                  <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">{step.title}</h3>
                  <p className="text-muted-foreground max-w-md text-lg">{step.body}</p>
                  {step.snippet && (
                    <p className="lg:hidden">
                      <mark className="bg-risk-high text-risk-high-fg rounded-md px-2 py-1 text-sm font-semibold">
                        {step.snippet}
                      </mark>
                    </p>
                  )}
                  {!step.snippet && (
                    <div className="lg:hidden">
                      <Verdict />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function ScamPhone({ active }: { active: number }) {
  const flags = STEPS.slice(0, Math.min(active + 1, 4)).filter((s) => s.flag);
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[360px] select-none">
      <div className="bg-ink rounded-[2.75rem] p-3 shadow-[0_30px_60px_rgb(0_0_0/0.22)]">
        <div className="flex min-h-[560px] flex-col gap-3 rounded-[2.1rem] bg-[#f4f4f6] px-4 pt-8 pb-5 text-[#121212]">
          <div className="mx-auto mb-1 h-1.5 w-20 rounded-full bg-black/15" />
          <p className="text-center text-[11px] font-semibold text-black/50">Today 09:41</p>

          <p className="text-center text-sm font-bold">
            <Scribbled on={active >= 0} current={active === 0}>
              PARCEL-INFO
            </Scribbled>
          </p>

          <div className="max-w-[92%] self-start rounded-2xl rounded-bl-md bg-white px-3.5 py-3 text-[14px] leading-relaxed shadow-sm">
            Your parcel is on hold at customs. Pay the{" "}
            <Marked on={active >= 2} current={active === 2}>
              €1.99
            </Marked>{" "}
            customs fee{" "}
            <Marked on={active >= 1} current={active === 1}>
              within 24 h
            </Marked>
            :{" "}
            <span
              className={cn(
                "text-[#0060df] underline transition-colors duration-500",
                active >= 3 && "text-risk-critical-fg line-through decoration-2",
              )}
            >
              parcel-hold.example/pay
            </span>
          </div>

          <ul className="mt-1 flex flex-col gap-1.5">
            {flags.map((s) => (
              <li
                key={s.flag}
                className="animate-in fade-in slide-in-from-left-2 flex items-center gap-2 self-start rounded-full bg-white px-3 py-1 text-[12px] font-semibold shadow-sm duration-500"
              >
                <Flag className="text-brand size-3.5" />
                {s.flag}
              </li>
            ))}
          </ul>

          <div
            className={cn(
              "mt-auto transition-[opacity,translate] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
              active >= 4 ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
            )}
          >
            <Verdict />
          </div>
        </div>
      </div>
    </div>
  );
}

function Verdict() {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-black/5 bg-white p-3.5 shadow-sm">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-black/55">
        <ShieldCheck className="text-brand size-3.5" />
        Security assistant
      </p>
      <p className="bg-risk-medium text-risk-medium-fg inline-flex items-center gap-1.5 self-start rounded-md px-2 py-0.5 text-[11px] font-semibold">
        <TriangleExclamationPoint className="size-3" />
        Medium risk
      </p>
      <p className="font-heading text-[15px] leading-snug font-semibold">
        Don’t pay. Delete the text.
      </p>
      <p className="text-[12.5px] leading-snug text-black/65">
        Already typed your card number? Block the card in your bank’s app now.
      </p>
    </div>
  );
}

/** Highlighter sweep behind a phrase. */
function Marked({ on, current, children }: { on: boolean; current: boolean; children: ReactNode }) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      <span
        className={cn(
          "bg-risk-high absolute inset-x-[-2px] inset-y-[1px] -z-0 origin-left rounded-[3px] transition-transform duration-500 ease-out",
          on ? "scale-x-100" : "scale-x-0",
          current && "ring-risk-high-line ring-2",
        )}
      />
      <span className="relative font-semibold">{children}</span>
    </span>
  );
}

/** A hand-drawn ring that draws itself around a phrase. */
function Scribbled({
  on,
  current,
  children,
}: {
  on: boolean;
  current: boolean;
  children: ReactNode;
}) {
  return (
    <span className="relative inline-block px-3 py-1">
      {children}
      <svg
        viewBox="0 0 200 60"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      >
        <path
          d="M14 34 C 18 10, 120 4, 178 16 C 204 22, 196 50, 150 54 C 96 60, 20 56, 8 38 C 2 28, 24 14, 52 10"
          pathLength={1}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={current ? 3.2 : 2.4}
          strokeLinecap="round"
          style={{
            strokeDasharray: 1,
            strokeDashoffset: on ? 0 : 1,
            transition: "stroke-dashoffset 900ms cubic-bezier(0.65,0,0.35,1)",
          }}
        />
      </svg>
    </span>
  );
}
