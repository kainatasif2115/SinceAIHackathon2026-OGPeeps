import type { Metadata } from "next";
import { Assistant } from "@/components/assistant/assistant";

export const metadata: Metadata = {
  title: "Security assistant: what should I do now?",
};

/** The assistant on its own, phone-first, as it would sit inside an operator's app. */
export default function AssistantPage() {
  return <Assistant />;
}
