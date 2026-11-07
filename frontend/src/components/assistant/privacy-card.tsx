"use client";

import { useState } from "react";
import { CircleCheck, Clock, EyeOff, LoaderCircle, ShieldCheck, Trash2 } from "lucide-react";
import { deleteSession, type Language } from "@/lib/api";
import { useT } from "./i18n-context";

const LOCALES: Record<Language, string> = { fi: "fi-FI", sv: "sv-SE", en: "en-GB" };

type Props = {
  sessionId: string;
  language: Language;
  /** Labels of the account data the user allowed / refused in consent requests. */
  allowed: string[];
  declined: string[];
  screenshots: number;
  /** When the service deletes the conversation by itself (24 h after the last turn). */
  expiresAt: Date | null;
  handedOff: boolean;
  onDeleted: () => void;
};

/**
 * Shown under the final answer: what was used, what was not, when it is
 * deleted, and a button to delete it now. Makes the consent rules visible.
 */
export function PrivacyCard({
  sessionId,
  language,
  allowed,
  declined,
  screenshots,
  expiresAt,
  handedOff,
  onDeleted,
}: Props) {
  const t = useT();
  const [state, setState] = useState<"idle" | "deleting" | "deleted" | "error">("idle");

  async function remove() {
    setState("deleting");
    try {
      await deleteSession(sessionId);
      setState("deleted");
      onDeleted();
    } catch {
      setState("error");
    }
  }

  const used = [t.privacyWords, screenshots > 0 && t.privacyScreenshots(screenshots)].filter(
    Boolean,
  ) as string[];
  const when =
    expiresAt &&
    new Intl.DateTimeFormat(LOCALES[language], {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(expiresAt);

  return (
    <section
      aria-labelledby="privacy-heading"
      className="border-border bg-card flex flex-col gap-4 rounded-lg border p-4 sm:p-5"
    >
      <h2 id="privacy-heading" className="flex items-center gap-2 text-base">
        <ShieldCheck aria-hidden className="text-primary size-5 shrink-0" />
        {t.privacyHeading}
      </h2>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Row
          icon={<CircleCheck aria-hidden className="text-risk-safe-fg size-4" />}
          term={t.privacyUsed}
        >
          {[
            ...used,
            ...allowed.map((label) => `${label} (${t.privacyAllowed.toLowerCase()})`),
          ].join(" · ")}
        </Row>
        <Row
          icon={<EyeOff aria-hidden className="text-muted-foreground size-4" />}
          term={t.privacyNotUsed}
        >
          {declined.length > 0
            ? `${t.privacyDeclined}: ${declined.join(", ")}`
            : allowed.length > 0
              ? t.privacyOtherData
              : t.privacyNoAccountData}
        </Row>
      </dl>

      <p className="text-muted-foreground text-sm">{t.privacyNever}</p>
      {handedOff && <p className="text-muted-foreground text-sm">{t.privacyHandoffNote}</p>}

      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        {state === "deleted" ? (
          <p role="status" className="flex items-center gap-2 text-sm font-medium">
            <CircleCheck aria-hidden className="text-risk-safe-fg size-4" />
            {t.privacyDeleted}
          </p>
        ) : (
          <>
            {when && (
              <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                <Clock aria-hidden className="size-4 shrink-0" />
                {t.privacyDeletedAt(when)}
              </p>
            )}
            <button
              type="button"
              onClick={() => void remove()}
              disabled={state === "deleting"}
              className="border-border hover:bg-muted inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors duration-150 disabled:opacity-60"
            >
              {state === "deleting" ? (
                <LoaderCircle aria-hidden className="size-4 animate-spin" />
              ) : (
                <Trash2 aria-hidden className="size-4" />
              )}
              {state === "deleting" ? t.privacyDeleting : t.privacyDeleteNow}
            </button>
          </>
        )}
        {state === "error" && (
          <p role="alert" className="text-destructive w-full text-sm">
            {t.privacyDeleteError}
          </p>
        )}
      </div>
    </section>
  );
}

function Row({
  icon,
  term,
  children,
}: {
  icon: React.ReactNode;
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="flex flex-col gap-0.5">
        <dt className="font-medium">{term}</dt>
        <dd className="text-muted-foreground">{children}</dd>
      </div>
    </div>
  );
}
