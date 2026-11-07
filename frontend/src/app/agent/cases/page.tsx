import type { Metadata } from "next";
import { AgentApp } from "@/components/agent/agent-app";

export const metadata: Metadata = {
  title: "Test cases · DNA security assistant (prototype)",
};

/** The organisers' dev cases as chats, with our answers and the official verdicts. */
export default function CasesPage() {
  return <AgentApp view="cases" />;
}
