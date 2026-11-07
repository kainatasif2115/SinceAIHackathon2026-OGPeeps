import type { Metadata } from "next";
import { AgentApp } from "@/components/agent/agent-app";

export const metadata: Metadata = {
  title: "Results · DNA security assistant (prototype)",
};

/** Evaluation results from the organisers' evaluator, behind the staff sign-in. */
export default function ResultsPage() {
  return <AgentApp view="results" />;
}
