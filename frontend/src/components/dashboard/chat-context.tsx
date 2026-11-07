"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ApiError, type Audience } from "@/lib/api";
import type { InitialRequest } from "@/components/assistant/assistant";
import { useAccount } from "./account-context";
import {
  getConversation,
  listConversations,
  type AccountConversation,
  type ConversationDetail,
} from "@/lib/account-api";

type ChatContextValue = {
  /** Changes whenever the chat should start fresh or reopen something (used as `key`). */
  chatKey: number;
  resume: ConversationDetail | null;
  /** A new conversation started from the welcome screen. */
  initial: InitialRequest | null;
  /** A new conversation that opens straight into hands-free talking. */
  voice: { audience: Audience } | null;
  activeId: string | null;
  history: AccountConversation[] | null;
  opening: string | null;
  newChat: () => void;
  startChat: (request: InitialRequest) => void;
  startVoice: (audience: Audience) => void;
  openChat: (sessionId: string) => Promise<void>;
  /** The chat got a reply: mark that conversation active and refresh the list. */
  onActivity: (sessionId: string) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChat(): ChatContextValue {
  const value = useContext(ChatContext);
  if (!value) throw new Error("useChat must be used inside the dashboard");
  return value;
}

/** The dashboard's chat and its history list, shared by the sidebar and the chat. */
export function ChatProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [chatKey, setChatKey] = useState(0);
  const [resume, setResume] = useState<ConversationDetail | null>(null);
  const [initial, setInitial] = useState<InitialRequest | null>(null);
  const [voice, setVoice] = useState<{ audience: Audience } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [history, setHistory] = useState<AccountConversation[] | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const { checkSession } = useAccount();
  const refresh = useCallback(() => {
    listConversations()
      .then(setHistory)
      .catch((err) => {
        setHistory((prev) => prev ?? []);
        if (err instanceof ApiError && err.status === 401) checkSession();
      });
  }, [checkSession]);
  useEffect(refresh, [refresh]);

  const newChat = useCallback(() => {
    setResume(null);
    setInitial(null);
    setVoice(null);
    setActiveId(null);
    setChatKey((k) => k + 1);
    router.push("/dashboard");
  }, [router]);

  const startChat = useCallback((request: InitialRequest) => {
    setResume(null);
    setInitial(request);
    setVoice(null);
    setActiveId(null);
    setChatKey((k) => k + 1);
  }, []);

  const startVoice = useCallback((audience: Audience) => {
    setResume(null);
    setInitial(null);
    setVoice({ audience });
    setActiveId(null);
    setChatKey((k) => k + 1);
  }, []);

  const openChat = useCallback(
    async (sessionId: string) => {
      setOpening(sessionId);
      try {
        const detail = await getConversation(sessionId);
        setResume(detail);
        setInitial(null);
        setVoice(null);
        setActiveId(sessionId);
        setChatKey((k) => k + 1);
        router.push("/dashboard");
      } catch {
        refresh(); // it has probably expired; drop it from the list
      } finally {
        setOpening(null);
      }
    },
    [router, refresh],
  );

  const onActivity = useCallback(
    (sessionId: string) => {
      setActiveId(sessionId);
      refresh();
    },
    [refresh],
  );

  return (
    <ChatContext
      value={{
        chatKey,
        resume,
        initial,
        voice,
        activeId,
        history,
        opening,
        newChat,
        startChat,
        startVoice,
        openChat,
        onActivity,
      }}
    >
      {children}
    </ChatContext>
  );
}
