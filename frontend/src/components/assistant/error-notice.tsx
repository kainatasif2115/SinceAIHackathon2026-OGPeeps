"use client";

import { PhoneCall, RotateCcw, TriangleExclamationPoint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import type { Dictionary } from "@/lib/i18n";
import { useT } from "./i18n-context";

/** Plain-language message for an API failure. */
export function describeError(error: unknown, t: Dictionary): string {
  if (!(error instanceof ApiError)) return t.errorServer;
  if (error.status === 0) return t.errorNetwork;
  if (error.status === -1) return t.errorUnexpected;
  if (error.status === 404 || error.status === 410) return t.errorExpired;
  if (error.status === 503 || error.status === 502 || error.status === 429) return t.errorBusy;
  return t.errorServer;
}

type Props = {
  error: unknown;
  onRetry: (() => void) | null;
  onStartOver: () => void;
};

export function ErrorNotice({ error, onRetry, onStartOver }: Props) {
  const t = useT();
  return (
    <div
      role="alert"
      className="border-risk-critical-line bg-card flex flex-col gap-3 rounded-lg border p-4"
    >
      <p className="flex items-center gap-2 font-medium">
        <TriangleExclamationPoint aria-hidden className="text-destructive size-5 shrink-0" />
        {t.errorHeading}
      </p>
      <p>{describeError(error, t)}</p>
      <p className="text-muted-foreground flex gap-2 text-sm">
        <PhoneCall aria-hidden className="mt-0.5 size-4 shrink-0" />
        {t.urgentFallback}
      </p>
      <div className="flex flex-wrap gap-2">
        {onRetry && (
          <Button onClick={onRetry}>
            <RotateCcw aria-hidden className="size-4" />
            {t.retry}
          </Button>
        )}
        <Button variant="ghost" onClick={onStartOver}>
          {t.startOver}
        </Button>
      </div>
    </div>
  );
}
