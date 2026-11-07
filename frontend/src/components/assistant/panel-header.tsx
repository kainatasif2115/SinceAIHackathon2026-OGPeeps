"use client";

import { Info, Maximize2, Minimize2, ShieldCheck, X } from "lucide-react";
import { LANGUAGES, type Language } from "@/lib/api";
import { useT } from "./i18n-context";
import { SegmentedControl } from "./segmented-control";

type Props = {
  language: Language;
  onLanguageChange: (language: Language) => void;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  onClose?: () => void;
};

/** Header for the assistant when it sits in the homepage's slide-out panel. */
export function PanelHeader({
  language,
  onLanguageChange,
  expanded = false,
  onToggleExpanded,
  onClose,
}: Props) {
  const t = useT();
  return (
    <header className="border-border bg-card border-b">
      <div className="flex items-center gap-3 px-5 py-3">
        <h2
          id="assistant-panel-title"
          className="font-heading flex min-w-0 items-center gap-2 text-lg font-semibold"
        >
          <span className="bg-brand text-brand-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
            <ShieldCheck aria-hidden className="size-4.5" />
          </span>
          <span className="truncate">{t.productName}</span>
        </h2>
        <SegmentedControl
          legend={t.languageLegend}
          value={language}
          onChange={onLanguageChange}
          size="sm"
          className="ml-auto"
          options={LANGUAGES.map((value) => ({
            value,
            label: value.toUpperCase(),
            srLabel: t.languageNames[value],
            lang: value,
          }))}
        />
        {onToggleExpanded && (
          <button
            type="button"
            onClick={onToggleExpanded}
            aria-pressed={expanded}
            className="hover:bg-muted text-foreground hidden size-10 shrink-0 items-center justify-center rounded-full transition-colors duration-150 sm:flex"
          >
            {expanded ? (
              <Minimize2 aria-hidden className="size-5" />
            ) : (
              <Maximize2 aria-hidden className="size-5" />
            )}
            <span className="sr-only">{expanded ? t.collapsePanel : t.expandPanel}</span>
          </button>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-full transition-colors duration-150"
          >
            <X aria-hidden className="size-5" />
            <span className="sr-only">{t.closePanel}</span>
          </button>
        )}
      </div>
      <p className="bg-muted text-muted-foreground flex items-center gap-2 px-5 py-1.5 text-xs">
        <Info aria-hidden className="size-4 shrink-0" />
        {t.prototypeNote}
      </p>
    </header>
  );
}
