"use client";

import { useEffect, useState } from "react";
import { CircleCheck, FlaskConical, LoaderCircle, WifiOff } from "lucide-react";
import { getHealth, isMockMode, type Health } from "@/lib/api";
import { useT } from "./i18n-context";

/** Small footer line showing whether the backend answers /api/health. */
export function ServiceStatus() {
  const t = useT();
  const [health, setHealth] = useState<Health | null>(null);
  const [down, setDown] = useState(false);

  useEffect(() => {
    let active = true;
    getHealth()
      .then((h) => active && setHealth(h))
      .catch(() => active && setDown(true));
    return () => {
      active = false;
    };
  }, []);

  const [Icon, text] = isMockMode
    ? [FlaskConical, t.statusMock]
    : down
      ? [WifiOff, t.statusDown]
      : health
        ? [CircleCheck, t.statusOk(health.simset_version)]
        : [LoaderCircle, t.statusChecking];

  return (
    <p className="flex items-center gap-1.5">
      <Icon aria-hidden className="size-4 shrink-0" />
      {text}
    </p>
  );
}
