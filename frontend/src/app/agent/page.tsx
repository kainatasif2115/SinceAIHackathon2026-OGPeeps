import type { Metadata } from "next";
import { AgentApp } from "@/components/agent/agent-app";

export const metadata: Metadata = {
  title: "Support console · DNA security assistant (prototype)",
};

/** What a DNA support agent sees when a customer taps "Talk to a person". */
export default function AgentPage() {
  return <AgentApp />;
}
