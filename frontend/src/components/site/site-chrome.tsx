"use client";

import { MessageCircle } from "lucide-react";
import type { Audience } from "@/lib/api";
import { cn } from "@/lib/utils";

const AUDIENCE_TABS: { value: Audience; label: string }[] = [
  { value: "consumer", label: "Private" },
  { value: "small_business", label: "Business" },
];

/** Dark strip above the header: who the page is for, plus the prototype notice. */
export function TopStrip({
  audience,
  onAudienceChange,
}: {
  audience: Audience;
  onAudienceChange: (audience: Audience) => void;
}) {
  return (
    <div className="bg-ink text-ink-foreground">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-1.5 sm:px-6">
        <div role="group" aria-label="Show help for" className="flex gap-1">
          {AUDIENCE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              aria-pressed={audience === tab.value}
              onClick={() => onAudienceChange(tab.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-150",
                audience === tab.value
                  ? "text-ink bg-white"
                  : "text-ink-foreground/80 hover:text-ink-foreground hover:bg-white/10",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="text-ink-foreground/75 hidden text-xs sm:block">
          Prototype · synthetic data · not a live DNA service
        </p>
      </div>
    </div>
  );
}

const NAV = [
  { href: "#help-topics", label: "Get help" },
  { href: "#how", label: "How it works" },
  { href: "#scams", label: "Scams now" },
  { href: "#try-to-trick-it", label: "Try to fool it" },
  { href: "#never", label: "Stay safe" },
];

export function SiteHeader({ onOpenAssistant }: { onOpenAssistant: () => void }) {
  return (
    <header className="border-border sticky top-0 z-30 border-b bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-3 sm:gap-6 sm:px-6">
        <a href="#main" className="flex min-w-0 items-center gap-2 rounded-sm sm:gap-2.5">
          <span className="font-heading text-brand shrink-0 text-xl leading-none font-bold tracking-tight sm:text-2xl">
            DNA
          </span>
          <span className="font-heading min-w-0 text-sm font-semibold whitespace-nowrap sm:text-base">
            - Security Assistant
          </span>
        </a>

        <nav aria-label="Page sections" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="hover:bg-muted rounded-full px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition-colors duration-150"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          onClick={onOpenAssistant}
          className="bg-brand text-brand-foreground hover:bg-brand/90 inline-flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full px-0 text-sm font-semibold whitespace-nowrap transition-colors duration-150 min-[380px]:w-auto min-[380px]:px-4"
        >
          <MessageCircle aria-hidden className="size-4" />
          <span className="sr-only min-[380px]:not-sr-only sm:hidden">Check</span>
          <span className="hidden sm:inline">Check a message</span>
        </button>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-ink text-ink-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex max-w-sm flex-col gap-3">
          <p className="font-heading flex items-center gap-2.5 text-lg font-semibold">
            <span className="text-brand-soft font-bold">DNA</span>
            <span className="h-5 w-px bg-white/25" aria-hidden />
            Security assistant
          </p>
          <p className="text-ink-foreground/75 text-sm">
            A prototype by team OGPeeps for the DNA × Since AI Hackathon 2026 in Turku. It uses
            synthetic data only and is not a live DNA service or real security advice.
          </p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="text-ink-foreground/60 mx-auto w-full max-w-6xl px-4 py-4 text-xs sm:px-6">
          DNA × Since AI Hackathon 2026 · Team OGPeeps
        </p>
      </div>
    </footer>
  );
}
