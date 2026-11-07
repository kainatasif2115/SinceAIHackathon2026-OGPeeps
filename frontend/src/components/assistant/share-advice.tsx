"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Check, Copy, Mail, MessageSquareText, Send, Share2, Users } from "lucide-react";
import type { Answer, Audience } from "@/lib/api";
import type { Dictionary } from "@/lib/i18n";
import { useT } from "./i18n-context";

/**
 * The message to send: built only from the assistant's advice, never from
 * what the user typed, so nothing private leaves unless they add it.
 */
function draftMessage(answer: Answer, audience: Audience, t: Dictionary): string {
  const team = audience === "small_business";
  const steps = answer.steps.map((step, i) => `${i + 1}. ${step}`).join("\n");
  return [
    team ? t.shareIntroTeam : t.shareIntroTrusted,
    `${answer.action_label}\n${answer.advice_text}`,
    steps,
    team ? t.shareAskTeam : t.shareAskTrusted,
  ]
    .filter(Boolean)
    .join("\n\n");
}

const noSubscribe = () => () => {};

/** "Send to someone I trust" (consumers) or "Alert my team" (small businesses). */
export function ShareAdvice({ answer, audience }: { answer: Answer; audience: Audience }) {
  const t = useT();
  const team = audience === "small_business";
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => draftMessage(answer, audience, t));
  const [copied, setCopied] = useState(false);
  // The system share sheet exists mostly on phones; known only in the browser.
  const canShare = useSyncExternalStore(
    noSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const subject = team ? t.shareSubjectTeam : t.shareSubjectTrusted;
  const Icon = team ? Users : Send;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard API blocked (e.g. http://<LAN IP>): select the text so it can be copied by hand.
      document.getElementById("share-text")?.focus();
      (document.getElementById("share-text") as HTMLTextAreaElement | null)?.select();
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-border hover:bg-muted inline-flex h-10 items-center gap-2 self-start rounded-full border px-4 text-sm font-medium transition-colors duration-150"
      >
        <Icon aria-hidden className="text-primary size-4" />
        {team ? t.shareTeam : t.shareTrusted}
      </button>
    );
  }

  const link =
    "border-border hover:bg-muted inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors duration-150";

  return (
    <section
      aria-labelledby="share-heading"
      className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4 sm:p-5"
    >
      <h2 id="share-heading" className="flex items-center gap-2 text-base">
        <Icon aria-hidden className="text-primary size-5 shrink-0" />
        {team ? t.shareHeadingTeam : t.shareHeadingTrusted}
      </h2>
      <label htmlFor="share-text" className="sr-only">
        {team ? t.shareHeadingTeam : t.shareHeadingTrusted}
      </label>
      <textarea
        id="share-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        className="border-input focus-visible:border-primary w-full resize-y rounded-md border px-3 py-2 text-sm outline-none"
      />
      <p className="text-muted-foreground text-xs">{t.shareNote}</p>
      <div className="flex flex-wrap gap-2">
        {canShare && (
          <button
            type="button"
            onClick={() => void navigator.share({ title: subject, text }).catch(() => {})}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors duration-150"
          >
            <Share2 aria-hidden className="size-4" />
            {t.shareVia}
          </button>
        )}
        <a
          href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`}
          className={link}
        >
          <Mail aria-hidden className="size-4" />
          {t.shareEmail}
        </a>
        <a href={`sms:?&body=${encodeURIComponent(text)}`} className={link}>
          <MessageSquareText aria-hidden className="size-4" />
          {t.shareSms}
        </a>
        <button type="button" onClick={() => void copy()} className={link}>
          {copied ? (
            <Check aria-hidden className="text-primary size-4" />
          ) : (
            <Copy aria-hidden className="size-4" />
          )}
          {copied ? t.copied : t.copy}
        </button>
      </div>
    </section>
  );
}
