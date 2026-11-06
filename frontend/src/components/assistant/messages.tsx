import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import type { QuestionTurn } from "@/lib/api";
import { useT } from "./i18n-context";

const ENTER = "animate-in fade-in slide-in-from-bottom-1 duration-200 ease-out";

export function UserMessage({ text }: { text: string }) {
  const t = useT();
  return (
    <div className={`flex justify-end ${ENTER}`}>
      <p className="bg-secondary text-secondary-foreground max-w-[85%] rounded-lg px-4 py-3 break-words whitespace-pre-wrap">
        <span className="sr-only">{t.you}: </span>
        {text}
      </p>
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
