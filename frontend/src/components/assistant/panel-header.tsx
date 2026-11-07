"use client";

import { Info, ShieldCheck, X } from "lucide-react";
import { AUDIENCES, LANGUAGES, type Audience, type Language } from "@/lib/api";
import { useT } from "./i18n-context";
import { SegmentedControl } from "./segmented-control";

type Props = {
  audience: Audience;
  language: Language;
  onAudienceChange: (audience: Audience) => void;
  onLanguageChange: (language: Language) => void;
  audienceLocked: boolean;
  onClose?: () => void;
};

/** Header for the assistant when it sits in the homepage's slide-out panel. */
export function PanelHeader({
  audience,
  language,
  onAudienceChange,
  onLanguageChange,
  audienceLocked,
  onClose,
}: Props) {
  const t = useT();
  return (
    <header className="border-border bg-card border-b">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <h2
          id="assistant-panel-title"
          className="font-heading flex items-center gap-2 text-lg font-semibold"
        >
          <span className="bg-brand text-brand-foreground flex size-8 items-center justify-center rounded-full">
            <ShieldCheck aria-hidden className="size-4.5" />
          </span>
          {t.productName}
        </h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-muted text-foreground flex size-10 items-center justify-center rounded-full transition-colors duration-150"
          >
            <X aria-hidden className="size-5" />
            <span className="sr-only">{t.closePanel}</span>
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
        <SegmentedControl
          legend={t.audienceLegend}
          value={audience}
          onChange={onAudienceChange}
          disabled={audienceLocked}
          disabledHint={t.audienceLocked}
          options={AUDIENCES.map((value) => ({ value, label: t.audience[value] }))}
        />
        <SegmentedControl
          legend={t.languageLegend}
          value={language}
          onChange={onLanguageChange}
          options={LANGUAGES.map((value) => ({
            value,
            label: value.toUpperCase(),
            srLabel: t.languageNames[value],
            lang: value,
          }))}
        />
      </div>
      <p className="bg-muted text-muted-foreground flex items-center gap-2 px-5 py-1.5 text-xs">
        <Info aria-hidden className="size-4 shrink-0" />
        {t.prototypeNote}
      </p>
    </header>
  );
}
