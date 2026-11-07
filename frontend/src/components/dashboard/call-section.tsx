"use client";

import { useRouter } from "next/navigation";
import { CallCopilot } from "@/components/site/call-copilot";
import { useAccount } from "./account-context";
import { useChat } from "./chat-context";

/**
 * The call co-pilot inside the dashboard: it listens to a live call (or a sample), then
 * hands what was said to the chat, where the advice is saved with the other checks.
 */
export function CallSection() {
  const { account } = useAccount();
  const { startChat } = useChat();
  const router = useRouter();
  return (
    <CallCopilot
      embedded={{
        audience: account.company ? "small_business" : "consumer",
        onAdvice: (request) => {
          startChat(request);
          router.push("/dashboard");
        },
      }}
    />
  );
}
