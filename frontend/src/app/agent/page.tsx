import type { Metadata } from "next";
import { AgentConsole } from "@/components/agent/agent-console";

export const metadata: Metadata = {
  title: "Support console · DNA security assistant (prototype)",
};

/** What a DNA support agent sees when a customer taps "Talk to a person". */
export default function AgentPage() {
  return <AgentConsole />;
}
