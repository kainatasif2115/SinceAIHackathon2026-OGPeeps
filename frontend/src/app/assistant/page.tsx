import type { Metadata } from "next";
import { Assistant } from "@/components/assistant/assistant";

export const metadata: Metadata = {
  title: "DNA - Security Assistant",
};

/** The assistant on its own, phone-first, as it would sit inside an operator's app. */
export default function AssistantPage() {
  return <Assistant />;
}
