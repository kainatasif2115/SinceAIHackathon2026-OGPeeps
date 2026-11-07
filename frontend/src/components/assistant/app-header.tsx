"use client";

import { Info, ShieldCheck } from "lucide-react";
import { AUDIENCES, LANGUAGES, type Audience, type Language } from "@/lib/api";
import { useT } from "./i18n-context";
import { SegmentedControl } from "./segmented-control";

type Props = {
  audience: Audience;
  language: Language;
  onAudienceChange: (audience: Audience) => void;
  onLanguageChange: (language: Language) => void;
  audienceLocked: boolean;
};

export function AppHeader({
  audience,
  language,
  onAudienceChange,
  onLanguageChange,
  audienceLocked,
}: Props) {
  const t = useT();
  return (
    <header className="border-border bg-card border-b">
      <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
        <p className="font-heading flex items-center gap-2 text-lg font-medium">
          <ShieldCheck aria-hidden className="text-primary size-5" />
          {t.productName}
        </p>
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
          size="sm"
          className="ml-auto"
          options={LANGUAGES.map((value) => ({
            value,
            label: value.toUpperCase(),
            srLabel: t.languageNames[value],
            lang: value,
          }))}
        />
      </div>
      <p className="border-border bg-muted border-t">
        <span className="text-muted-foreground mx-auto flex w-full max-w-2xl items-center gap-2 px-4 py-1.5 text-xs">
          <Info aria-hidden className="size-4 shrink-0" />
          {t.prototypeNote}
        </span>
      </p>
    </header>
  );
}
