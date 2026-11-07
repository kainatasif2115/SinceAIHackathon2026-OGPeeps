"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Ear, Headset, LockKeyhole, PhoneCall, ShieldCheck, X } from "lucide-react";
import { Composer } from "@/components/assistant/composer";
import { I18nContext } from "@/components/assistant/i18n-context";
import { RISK_STYLES } from "@/components/assistant/risk";
import { SegmentedControl } from "@/components/assistant/segmented-control";
import { getScenarios, LANGUAGES, type Language, type RiskLevel, type Scenario } from "@/lib/api";
import type { ImageAttachment } from "@/lib/media";
import { getDictionary } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAccount } from "./account-context";
import { useChat } from "./chat-context";

const EXAMPLES_SHOWN = 4;

// Other ways in than typing: talking hands-free, or having a live call listened to.
const WAY =
  "hover:bg-white inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors duration-150";

const GREETINGS: Record<Language, [string, string, string]> = {
  en: ["Good morning", "Good afternoon", "Good evening"],
  fi: ["Hyvää huomenta", "Hyvää päivää", "Hyvää iltaa"],
  sv: ["God morgon", "God eftermiddag", "God kväll"],
};

function greeting(language: Language): string {
  const hour = new Date().getHours();
  return GREETINGS[language][hour < 12 ? 0 : hour < 18 ? 1 : 2];
}

/**
 * The signed-in home, calm like a chat app's: a greeting, one large message box, a few
 * example situations, and the latest chats. A business account is always in business
 * mode, so there is no Private/Business switch here.
 */
export function DashboardWelcome() {
  const { account } = useAccount();
  const { startChat, startVoice, history, openChat } = useChat();
  const audience = account.company ? "small_business" : "consumer";
  const member = account.role === "member";
  const [language, setLanguage] = useState<Language>("en");
  const [draft, setDraft] = useState("");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const t = getDictionary(language);
  const firstName = account.name.trim().split(/\s+/)[0];

  useEffect(() => {
    getScenarios()
      .then(setScenarios)
      .catch(() => setScenarios([]));
  }, []);

  // One example per kind of situation, in the chosen language, labelled by the situation.
  const examples = useMemo(() => {
    const byJourney = new Map<string, Scenario>();
    for (const s of scenarios)
      if (s.audience === audience && s.language === language && !byJourney.has(s.journey))
        byJourney.set(s.journey, s);
    return [...byJourney.values()].slice(0, EXAMPLES_SHOWN);
  }, [scenarios, audience, language]);

  function send(text: string, images: ImageAttachment[]) {
    startChat({ text, images, audience, language, scenario });
  }

  const recent = (history ?? []).slice(0, 3);
  const waiting = (history ?? []).filter(
    (c) => c.handoff_status && c.handoff_status !== "done",
  ).length;

  return (
    <I18nContext value={t}>
      <div className="relative isolate flex min-h-full flex-col px-4 pt-6 pb-12 md:px-10">
        <FlowLines />
        <div className="flex justify-end">
          <SegmentedControl
            legend={t.languageLegend}
            value={language}
            onChange={setLanguage}
            size="sm"
            options={LANGUAGES.map((value) => ({
              value,
              label: value.toUpperCase(),
              srLabel: t.languageNames[value],
              lang: value,
            }))}
          />
        </div>

        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-7 py-6 md:py-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="text-brand flex size-14 items-center justify-center rounded-2xl border border-[#eee3e8] bg-white shadow-[0_1px_2px_rgb(60_20_40/0.05)]">
              <ShieldCheck aria-hidden className="size-7" />
            </span>
            <div>
              <h2
                id="welcome-heading"
                className="font-heading text-3xl font-bold tracking-tight md:text-4xl"
              >
                {greeting(language)}, {firstName}
              </h2>
              <p className="text-muted-foreground mt-2 text-base md:text-lg">{t.startHeading}</p>
            </div>
          </div>

          <div>
            {scenario && (
              <p className="text-muted-foreground mb-2 flex items-center gap-1 px-1 text-xs">
                Example: {scenario.journey_label}
                <button
                  type="button"
                  onClick={() => {
                    setScenario(null);
                    setDraft("");
                  }}
                  className="hover:bg-muted rounded-full p-1"
                >
                  <X aria-hidden className="size-3.5" />
                  <span className="sr-only">Clear the example</span>
                </button>
              </p>
            )}
            <div className="rounded-2xl bg-white shadow-[0_1px_2px_rgb(60_20_40/0.05),0_12px_32px_rgb(120_0_60/0.08)]">
              <Composer
                value={draft}
                onChange={(value) => {
                  setDraft(value);
                  if (!value.trim()) setScenario(null);
                }}
                onSubmit={send}
                busy={false}
                language={language}
                labelledBy="welcome-heading"
                placeholder={t.startPlaceholder}
                rows={3}
                autoFocus
              />
            </div>
          </div>

          <p className="text-muted-foreground -mt-3 flex items-start justify-center gap-1.5 text-center text-xs">
            <LockKeyhole aria-hidden className="mt-px size-3.5 shrink-0" />
            <span>
              {t.privacyStored} {t.privacyNoSecrets}
              {member && ` Checks here are shared with ${account.company}'s owner.`}
            </span>
          </p>

          <div className="-mt-2 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => startVoice(audience)} className={WAY}>
              <PhoneCall aria-hidden className="text-brand size-4" />
              Talk instead
            </button>
            <Link href="/dashboard/call" className={WAY}>
              <Ear aria-hidden className="text-brand size-4" />
              On a call right now? We&apos;ll listen
              <ArrowRight aria-hidden className="text-muted-foreground size-4" />
            </Link>
          </div>

          {examples.length > 0 && (
            <ul aria-label="Examples" className="flex flex-wrap justify-center gap-2">
              {examples.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setScenario(s);
                      setDraft(s.opening_message);
                    }}
                    lang={s.language}
                    title={s.title}
                    className="text-foreground hover:border-brand hover:text-brand rounded-full border border-[#eee3e8] bg-white px-3.5 py-1.5 text-sm transition-colors duration-150"
                  >
                    {s.journey_label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {(recent.length > 0 || waiting > 0) && (
          <section aria-labelledby="recent-heading" className="mx-auto w-full max-w-2xl">
            <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
              <h2 id="recent-heading" className="text-muted-foreground text-sm font-semibold">
                Recent
              </h2>
              {waiting > 0 && (
                <p className="text-brand flex items-center gap-1.5 text-sm font-semibold">
                  <Headset aria-hidden className="size-4" />
                  {waiting} with a support agent
                </p>
              )}
            </div>
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-3">
              {recent.map((c) => {
                const risk =
                  c.risk_level && c.risk_level in RISK_STYLES ? (c.risk_level as RiskLevel) : null;
                const Icon = risk ? RISK_STYLES[risk].icon : null;
                return (
                  <li key={c.session_id} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => void openChat(c.session_id)}
                      className="hover:border-brand group flex h-full w-full flex-col gap-2 rounded-2xl border border-[#eee3e8] bg-white p-3.5 text-left transition-colors duration-150"
                    >
                      <span className="line-clamp-2 text-sm font-semibold" lang={c.language}>
                        {c.title}
                      </span>
                      <span className="mt-auto flex items-center justify-between gap-2">
                        {risk && Icon ? (
                          <span
                            className={cn(
                              "inline-flex min-w-0 items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-xs font-semibold",
                              RISK_STYLES[risk].surface,
                            )}
                          >
                            <Icon aria-hidden className="size-3 shrink-0" />
                            <span className="truncate">{c.action_label}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">Not finished</span>
                        )}
                        <ArrowRight
                          aria-hidden
                          className="text-muted-foreground group-hover:text-brand size-4 shrink-0"
                        />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </I18nContext>
  );
}

/**
 * Three thin brand-pink curves behind the greeting, fading out before the message box.
 * Decoration only: hidden from screen readers, never animated, and only on this screen.
 */
function FlowLines() {
  const lines = [
    { d: "M-40 150 C 240 60, 460 250, 720 150 S 1080 50, 1240 170", opacity: 0.2 },
    { d: "M-40 205 C 230 130, 480 310, 740 215 S 1090 120, 1240 240", opacity: 0.13 },
    { d: "M-40 265 C 250 200, 470 360, 760 280 S 1100 200, 1240 310", opacity: 0.08 },
  ];
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 1200 420"
      preserveAspectRatio="none"
      className="text-brand pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px] w-full [mask-image:linear-gradient(to_bottom,black_45%,transparent)] md:h-[420px]"
    >
      {lines.map((line) => (
        <path
          key={line.d}
          d={line.d}
          fill="none"
          stroke="currentColor"
          strokeOpacity={line.opacity}
          strokeWidth={1.5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
