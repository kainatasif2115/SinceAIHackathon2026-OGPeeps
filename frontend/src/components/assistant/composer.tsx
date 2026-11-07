"use client";

import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp, CircleExclamationPoint, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Language } from "@/lib/api";
import type { ImageAttachment } from "@/lib/media";
import { cn } from "@/lib/utils";
import { useT } from "./i18n-context";
import {
  AttachButton,
  AttachmentTray,
  MicButton,
  VoiceStatus,
  useImageAttachments,
  useImageDrop,
} from "./input-tools";
import { useSpeechInput } from "./use-speech-input";

export const MAX_MESSAGE_LENGTH = 2000;

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (text: string, images: ImageAttachment[]) => void;
  busy: boolean;
  /** Speech recognition language. */
  language: Language;
  placeholder: string;
  /** Visible label text. Omit when `labelledBy` points at a heading instead. */
  label?: string;
  labelledBy?: string;
  rows?: number;
  autoFocus?: boolean;
};

/**
 * Message box with screenshot and voice input, plus the send button. While
 * busy it stays focusable (readOnly rather than disabled) so keyboard and
 * screen reader users keep their place. Screenshots can also be pasted or
 * dropped onto the form.
 */
export function Composer({
  value,
  onChange,
  onSubmit,
  busy,
  language,
  placeholder,
  label,
  labelledBy,
  rows = 3,
  autoFocus,
}: Props) {
  const t = useT();
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const tooLong = value.length > MAX_MESSAGE_LENGTH;
  const nearLimit = value.length > MAX_MESSAGE_LENGTH - 200;
  const attachments = useImageAttachments();
  const drop = useImageDrop((files) => void attachments.add(files));
  const speech = useSpeechInput(language, value, onChange);

  function submit() {
    if (busy) return;
    speech.stop();
    const text = value.trim();
    if (!text && attachments.images.length === 0) {
      setError(t.emptyError);
      return;
    }
    if (tooLong) {
      setError(t.tooLong(MAX_MESSAGE_LENGTH));
      return;
    }
    setError(null);
    onSubmit(text, attachments.images);
    attachments.clear();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // On touch keyboards Enter should add a line; the send button is right there.
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && !coarse) {
      event.preventDefault();
      submit();
    }
  }

  const describedBy = [error ? `${id}-error` : null, `${id}-hint`].filter(Boolean).join(" ");

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn(
        "relative flex flex-col gap-2 rounded-lg",
        drop.dragging && "outline-primary outline-2 outline-offset-4 outline-dashed",
      )}
      {...drop.handlers}
    >
      {drop.dragging && (
        <p className="bg-card/90 text-primary pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg font-medium">
          {t.dropHere}
        </p>
      )}
      {label && (
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
      )}
      {/* Chat-app style: one card holds the text and a bottom toolbar. */}
      <div
        className={cn(
          "bg-card border-input flex flex-col rounded-2xl border px-3 pt-2 pb-2 transition-colors",
          "focus-within:border-ring focus-within:ring-ring focus-within:ring-1",
          (error || tooLong) && "border-destructive",
        )}
      >
        <Textarea
          id={id}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          readOnly={busy}
          autoFocus={autoFocus}
          aria-labelledby={label ? undefined : labelledBy}
          aria-invalid={error || tooLong ? true : undefined}
          aria-describedby={describedBy}
          className="max-h-72 min-h-16 resize-none border-0 bg-transparent px-1 shadow-none focus-visible:ring-0 aria-invalid:ring-0"
        />
        <AttachmentTray
          images={attachments.images}
          onRemove={attachments.remove}
          error={attachments.error}
        />
        <div className="flex items-center gap-1 pt-1">
          <AttachButton
            onFiles={(files) => void attachments.add(files)}
            disabled={busy || attachments.full}
          />
          <p id={`${id}-hint`} className="text-muted-foreground mr-auto pl-2 text-xs">
            <span className="sr-only">{t.sendHint}</span>
            {nearLimit && (
              <span className={cn("tabular-nums", tooLong && "text-destructive")}>
                {value.length}/{MAX_MESSAGE_LENGTH}
              </span>
            )}
          </p>
          <MicButton
            supported={speech.supported}
            listening={speech.listening}
            onToggle={speech.toggle}
            disabled={busy}
          />
          <Button
            type="submit"
            size="icon"
            aria-disabled={busy || undefined}
            aria-label={t.send}
            title={t.send}
            className="rounded-[10px]"
          >
            {busy ? (
              <LoaderCircle aria-hidden className="size-5 animate-spin" />
            ) : (
              <ArrowUp aria-hidden className="size-5" />
            )}
          </Button>
        </div>
      </div>
      <VoiceStatus
        listening={speech.listening}
        transcribing={speech.transcribing}
        error={speech.error}
      />
      {error && (
        <p
          id={`${id}-error`}
          className="text-destructive flex items-center gap-1.5 text-sm"
          role="alert"
        >
          <CircleExclamationPoint aria-hidden className="size-4 shrink-0" />
          {error}
        </p>
      )}
    </form>
  );
}
