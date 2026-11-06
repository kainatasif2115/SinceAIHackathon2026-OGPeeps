"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useT } from "./i18n-context";

const SLOW_AFTER_MS = 8000;

/** Calm waiting line. The backend can take 5-20 s, so after 8 s say so. */
export function ThinkingStatus() {
  const t = useT();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div role="status" className="text-muted-foreground flex items-center gap-2">
      <LoaderCircle aria-hidden className="text-primary size-4 shrink-0 animate-spin" />
      <span>{slow ? t.thinkingSlow : t.thinking}</span>
    </div>
  );
}
