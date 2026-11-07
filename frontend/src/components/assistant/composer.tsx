"use client";

import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { CircleExclamationPoint, LoaderCircle, SendHorizontal } from "lucide-react";
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
        className="max-h-72 min-h-24 resize-none"
      />
      <AttachmentTray
        images={attachments.images}
        onRemove={attachments.remove}
        error={attachments.error}
      />
      <VoiceStatus listening={speech.listening} error={speech.error} />
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
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="-ml-2 flex items-center">
          <AttachButton
            onFiles={(files) => void attachments.add(files)}
            disabled={busy || attachments.full}
          />
          <MicButton
            supported={speech.supported}
            listening={speech.listening}
            onToggle={speech.toggle}
            disabled={busy}
          />
        </div>
        <p id={`${id}-hint`} className="text-muted-foreground mr-auto text-xs">
          <span className="hidden [@media(pointer:fine)]:inline">{t.sendHint}</span>
          {nearLimit && (
            <span className={cn("ml-2 tabular-nums", tooLong && "text-destructive")}>
              {value.length}/{MAX_MESSAGE_LENGTH}
            </span>
          )}
        </p>
        <Button type="submit" size="lg" aria-disabled={busy || undefined}>
          {busy ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          ) : (
            <SendHorizontal aria-hidden className="size-4" />
          )}
          {t.send}
        </Button>
      </div>
    </form>
  );
}
