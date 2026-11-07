"use client";

import { Assistant } from "@/components/assistant/assistant";
import { useChat } from "./chat-context";
import { DashboardWelcome } from "./welcome";

/**
 * The dashboard's Chat tab: the welcome screen until a conversation starts (or one is
 * reopened from the history), then the conversation on a clean full-width canvas. The
 * assistant's own header is hidden; the dashboard header already says where you are.
 */
export function ChatSection() {
  const { chatKey, resume, initial, voice, onActivity } = useChat();

  if (!resume && !initial && !voice) return <DashboardWelcome key={chatKey} />;

  return (
    // relative + overflow-hidden: screen-reader-only text inside the chat is positioned
    // against this clipped box, so it can't stretch the page below the screen.
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <Assistant
        key={chatKey}
        variant="panel"
        bare
        expanded
        initial={initial}
        resume={resume}
        startInVoice={voice !== null}
        defaultAudience={initial?.audience ?? resume?.audience ?? voice?.audience ?? "consumer"}
        onActivity={onActivity}
      />
    </div>
  );
}
