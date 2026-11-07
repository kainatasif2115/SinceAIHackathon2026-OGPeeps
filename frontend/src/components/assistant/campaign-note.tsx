"use client";

import { Radar } from "lucide-react";
import { useT } from "./i18n-context";

/**
 * Campaign radar: shown when enough other customers asked about a very similar
 * message. Neutral on purpose (genuine bills get many questions too); the
 * advice that follows does not depend on it.
 */
export function CampaignNote({ others }: { others: number }) {
  const t = useT();
  return (
    <aside
      aria-live="polite"
      className="border-primary/30 bg-accent text-accent-foreground animate-in fade-in mt-3 flex gap-3 rounded-lg border px-4 py-3 text-sm duration-200"
    >
      <Radar aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="flex flex-col gap-0.5">
        <p className="font-medium">{t.campaignNote(others)}</p>
        <p className="text-muted-foreground text-xs">{t.campaignPrivacy}</p>
      </div>
    </aside>
  );
}
