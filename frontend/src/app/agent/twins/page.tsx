import type { Metadata } from "next";
import { AgentApp } from "@/components/agent/agent-app";

export const metadata: Metadata = {
  title: "Twin cases · DNA security assistant (prototype)",
};

/** Same message, different truth: the organisers' twin cases, branch by branch. */
export default function TwinsPage() {
  return <AgentApp view="twins" />;
}
