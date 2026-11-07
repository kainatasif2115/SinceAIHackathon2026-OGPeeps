"use client";

import { useRef, useState } from "react";
import { ImagePlus, Mic, Square, X } from "lucide-react";
import {
  ImageError,
  MAX_IMAGES,
  imageFiles,
  prepareImage,
  type ImageAttachment,
} from "@/lib/media";
import { cn } from "@/lib/utils";
import { useT } from "./i18n-context";
import type { SpeechError } from "./use-speech-input";

/** Screenshots waiting to be sent with the next message. */
export function useImageAttachments() {
  const t = useT();
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function add(files: File[]) {
    if (files.length === 0) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      setError(t.imageTooMany(MAX_IMAGES));
      return;
    }
    setError(files.length > room ? t.imageTooMany(MAX_IMAGES) : null);
    const prepared: ImageAttachment[] = [];
    for (const file of files.slice(0, room)) {
      try {
        prepared.push(await prepareImage(file));
      } catch (err) {
        setError(
          err instanceof ImageError && err.reason === "size" ? t.imageTooBig : t.imageUnreadable,
        );
      }
    }
    setImages((prev) => [...prev, ...prepared].slice(0, MAX_IMAGES));
  }

  function remove(id: string) {
    setImages((prev) => prev.filter((image) => image.id !== id));
    setError(null);
  }

  function clear() {
    setImages([]);
    setError(null);
  }

  return { images, error, add, remove, clear, full: images.length >= MAX_IMAGES };
}

export type ImageAttachments = ReturnType<typeof useImageAttachments>;

/** Paste and drag-and-drop handlers for a text box or form. */
export function useImageDrop(onFiles: (files: File[]) => void) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const hasFiles = (event: React.DragEvent) => event.dataTransfer.types.includes("Files");
  return {
    dragging,
    handlers: {
      onPaste: (event: React.ClipboardEvent) => {
        const files = imageFiles(event.clipboardData.items);
        if (files.length > 0) {
          event.preventDefault();
          onFiles(files);
        }
      },
      onDragEnter: (event: React.DragEvent) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        depth.current += 1;
        setDragging(true);
      },
      onDragOver: (event: React.DragEvent) => {
        if (hasFiles(event)) event.preventDefault();
      },
      onDragLeave: () => {
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDragging(false);
      },
      onDrop: (event: React.DragEvent) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        depth.current = 0;
        setDragging(false);
        onFiles(imageFiles(event.dataTransfer.files));
      },
    },
  };
}

// Same focus ring as the shared Button, so every control in the composer
// behaves alike for keyboard users.
const TOOL_BUTTON =
  "text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40";

export function AttachButton({
  onFiles,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={disabled}
        title={t.attachImage}
        className={cn(TOOL_BUTTON, "border-border border")}
      >
        <ImagePlus aria-hidden className="size-5" />
        <span className="sr-only">{t.attachImage}</span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        tabIndex={-1}
        onChange={(event) => {
          onFiles(imageFiles(event.target.files));
          event.target.value = "";
        }}
      />
    </>
  );
}

export function MicButton({
  supported,
  listening,
  onToggle,
  disabled,
}: {
  supported: boolean;
  listening: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const t = useT();
  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={listening}
      title={listening ? t.voiceStop : t.voiceStart}
      className={cn(
        TOOL_BUTTON,
        listening &&
          "bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive",
      )}
    >
      {listening ? (
        <span className="relative flex size-5 items-center justify-center">
          <span className="bg-destructive/40 absolute inline-flex size-full animate-ping rounded-full" />
          <Square aria-hidden className="relative size-3.5 fill-current" />
        </span>
      ) : (
        <Mic aria-hidden className="size-5" />
      )}
      <span className="sr-only">{listening ? t.voiceStop : t.voiceStart}</span>
    </button>
  );
}

/** Live status under the box: listening, or why voice input failed. */
export function VoiceStatus({
  listening,
  transcribing = false,
  error,
}: {
  listening: boolean;
  transcribing?: boolean;
  error: SpeechError | null;
}) {
  const t = useT();
  const message = listening
    ? t.voiceListening
    : transcribing
      ? t.voiceTranscribing
      : error === "denied"
        ? t.voiceDenied
        : error === "no-speech"
          ? t.voiceNoSpeech
          : error === "unavailable"
            ? t.voiceUnavailable
            : null;
  return (
    <p
      aria-live="polite"
      className={cn(
        "text-sm",
        listening || transcribing ? "text-foreground" : "text-destructive",
        !message && "sr-only",
      )}
    >
      {message}
    </p>
  );
}

export function AttachmentTray({
  images,
  onRemove,
  error,
}: {
  images: ImageAttachment[];
  onRemove: (id: string) => void;
  error: string | null;
}) {
  const t = useT();
  if (images.length === 0 && !error) return null;
  return (
    <div className="flex flex-col gap-2">
      {images.length > 0 && (
        <>
          <ul className="flex flex-wrap gap-2">
            {images.map((image, index) => (
              <li key={image.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- local data: URL preview */}
                <img
                  src={image.previewUrl}
                  alt={t.screenshotAlt(index + 1)}
                  className="border-border size-16 rounded-lg border object-cover"
                />
                <button
                  type="button"
                  onClick={() => onRemove(image.id)}
                  className="bg-foreground text-background absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full shadow"
                >
                  <X aria-hidden className="size-3.5" />
                  <span className="sr-only">{t.removeImage(t.screenshotAlt(index + 1))}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-xs">{t.imageHint}</p>
        </>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
