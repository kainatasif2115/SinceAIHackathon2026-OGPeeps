"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import { MessageCircle } from "lucide-react";
import type { Audience, Scenario } from "@/lib/api";
import { Assistant, type InitialRequest } from "@/components/assistant/assistant";
import type { TopicSuggestions } from "@/components/assistant/start-view";
import { cn } from "@/lib/utils";

type PanelProps = {
  open: boolean;
  onClose: () => void;
  assistantKey: number;
  initial: InitialRequest | null;
  startInVoice: boolean;
  topic: TopicSuggestions | null;
  prefill: Scenario | null;
  audience: Audience;
};

/**
 * Slide-out drawer holding the assistant: full screen on phones, 720px on
 * the right from `sm` up, with a control to cover the window. It stays
 * mounted while closed (inert) so an open conversation survives closing
 * and reopening.
 */
export function ChatPanel({
  open,
  onClose,
  assistantKey,
  initial,
  startInVoice,
  topic,
  prefill,
  audience,
}: PanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Mount the assistant on first open so it picks up the audience chosen by then.
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  if (open && !mounted) setMounted(true);

  // Closing the drawer also leaves full-window mode.
  if (!open && expanded) setExpanded(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTarget = panelRef.current?.querySelector<HTMLElement>(
      "textarea, button[type='submit']",
    );
    (focusTarget ?? panelRef.current)?.focus({ preventScroll: true });
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, assistantKey]);

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/45 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="assistant-panel-title"
        tabIndex={-1}
        inert={!open}
        className={cn(
          "bg-card fixed inset-y-0 right-0 z-50 flex flex-col shadow-[0_0_40px_rgb(0_0_0/0.18)] outline-none",
          "transition-[transform,width] duration-250 ease-out",
          expanded ? "w-full" : "w-full sm:w-[720px]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {mounted && (
          <Assistant
            key={assistantKey}
            variant="panel"
            initial={initial}
            startInVoice={startInVoice}
            topic={topic}
            prefill={prefill}
            defaultAudience={audience}
            expanded={expanded}
            onToggleExpanded={() => setExpanded((value) => !value)}
            onClose={onClose}
          />
        )}
      </div>
    </>
  );
}

type LauncherProps = {
  ref?: Ref<HTMLButtonElement>;
  hidden: boolean;
  onClick: () => void;
};

/** Floating chat button, bottom right, like an operator's support chat. */
export function ChatLauncher({ ref, hidden, onClick }: LauncherProps) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
      className={cn(
        "bg-brand text-brand-foreground fixed right-4 bottom-4 z-30 flex size-14 items-center justify-center gap-2 rounded-full shadow-[0_6px_24px_rgb(0_0_0/0.3)] ring-2 ring-white transition-[transform,opacity] duration-200 hover:-translate-y-0.5 sm:right-6 sm:bottom-6 sm:w-auto sm:px-5",
        hidden && "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      <MessageCircle aria-hidden className="size-5" />
      <span className="font-heading sr-only text-sm font-semibold sm:not-sr-only">
        Ask security
      </span>
    </button>
  );
}
