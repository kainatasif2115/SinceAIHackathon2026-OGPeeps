"use client";

import { cn } from "@/lib/utils";
import { CountUp, Reveal, useInView } from "./motion";

// From results/dev_full_588_evaluator.txt and results/baseline_dev_588_evaluator.txt:
// the organisers' evaluator on their 588 synthetic dev cases.
const METRICS = [
  {
    label: "Gave the right next step",
    ours: 82.5,
    baseline: 60.5,
    better: "higher" as const,
  },
  {
    label: "Handed to a person when it was needed",
    ours: 91.7,
    baseline: 47.0,
    better: "higher" as const,
  },
  {
    label: "False alarms on harmless messages",
    ours: 6.1,
    baseline: 28.0,
    better: "lower" as const,
  },
  {
    label: "Unsafe advice (pay, click, share a code)",
    ours: 0,
    baseline: 0,
    better: "lower" as const,
  },
];

/** Evidence strip: our evaluation results against the organisers' rules baseline. */
export function Proof() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.3 });
  return (
    <section aria-labelledby="proof-heading" className="bg-[#fdf6fa]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-20 sm:px-6">
        <Reveal className="flex max-w-2xl flex-col gap-3">
          <p className="text-brand text-sm font-semibold">Tested, not promised</p>
          <h2 id="proof-heading" className="text-3xl font-bold tracking-tight sm:text-5xl">
            Scored on 588 cases by the organisers’ own evaluator
          </h2>
          <p className="text-muted-foreground text-lg">
            Compared with the keyword-and-rules baseline the organisers ship with the test set.
          </p>
        </Reveal>

        <div ref={ref} className="grid gap-x-12 gap-y-10 md:grid-cols-2">
          {METRICS.map((m, i) => (
            <div key={m.label} className="flex flex-col gap-3">
              <p className="font-medium">{m.label}</p>
              <p className="font-heading text-5xl font-bold tracking-tight">
                <CountUp value={m.ours} decimals={m.ours % 1 ? 1 : 0} suffix=" %" />
              </p>
              <div className="flex flex-col gap-1.5" aria-hidden>
                <Bar
                  value={m.ours}
                  shown={inView}
                  delay={i * 120}
                  className="bg-brand"
                  label="Our assistant"
                />
                <Bar
                  value={m.baseline}
                  shown={inView}
                  delay={i * 120 + 80}
                  className="bg-[#a3a3ad]"
                  label={`Baseline ${m.baseline.toFixed(1)} %`}
                />
              </div>
              <p className="text-muted-foreground text-sm">
                Rules baseline: {m.baseline.toFixed(1)} %, {m.better} is better
              </p>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          Single answers on the full development set, Claude Sonnet via ElevenLabs. Synthetic data;
          our own human safety review is still to come.
        </p>
      </div>
    </section>
  );
}

function Bar({
  value,
  shown,
  delay,
  className,
  label,
}: {
  value: number;
  shown: boolean;
  delay: number;
  className: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white">
        <div
          className={cn(
            "h-full origin-left rounded-r-full transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
            className,
          )}
          style={{
            width: `${Math.max(value, 0.8)}%`,
            transform: shown ? "scaleX(1)" : "scaleX(0)",
            transitionDelay: `${delay}ms`,
          }}
        />
      </div>
      <span className="text-muted-foreground w-28 shrink-0 text-xs">{label}</span>
    </div>
  );
}
