import type { Metadata } from "next";
import { AgentApp } from "@/components/agent/agent-app";

export const metadata: Metadata = {
  title: "Campaign radar · DNA security assistant (prototype)",
};

/** Scam campaigns across all chats in the last 24 hours (fingerprints only). */
export default function RadarPage() {
  return <AgentApp view="radar" />;
}
