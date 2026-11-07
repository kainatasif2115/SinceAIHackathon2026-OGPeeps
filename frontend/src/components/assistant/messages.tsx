import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import type { QuestionTurn } from "@/lib/api";
import { useT } from "./i18n-context";

const ENTER = "animate-in fade-in slide-in-from-bottom-1 duration-200 ease-out";

export function UserMessage({ text, images = [] }: { text: string; images?: string[] }) {
  const t = useT();
  return (
    <div className={`flex flex-col items-end gap-2 ${ENTER}`}>
      {images.length > 0 && (
        <ul className="flex max-w-[85%] flex-wrap justify-end gap-2">
          {images.map((src, index) => (
            <li key={src.slice(-32) + index}>
              {/* eslint-disable-next-line @next/next/no-img-element -- local data: URL */}
              <img
                src={src}
                alt={t.screenshotAlt(index + 1)}
                className="border-border max-h-48 max-w-48 rounded-lg border object-cover"
              />
            </li>
          ))}
        </ul>
      )}
      {text && (
        <p className="bg-secondary text-secondary-foreground max-w-[85%] rounded-lg px-4 py-3 break-words whitespace-pre-wrap">
          <span className="sr-only">{t.you}: </span>
          {text}
        </p>
      )}
    </div>
  );
}

/** Wrapper for every assistant turn: a small label, then the content. */
export function AssistantTurn({ id, children }: { id: string; children: ReactNode }) {
  const t = useT();
  return (
    <div id={id} tabIndex={-1} className={`flex scroll-mt-4 flex-col gap-2 outline-none ${ENTER}`}>
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
        <ShieldCheck aria-hidden className="text-primary size-4" />
        {t.assistant}
      </p>
      {children}
    </div>
  );
}

export function QuestionMessage({ turn }: { turn: QuestionTurn }) {
  return <p className="font-heading max-w-prose text-lg">{turn.text}</p>;
}
