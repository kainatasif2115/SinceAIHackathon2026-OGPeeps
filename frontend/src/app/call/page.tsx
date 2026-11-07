import type { Metadata } from "next";
import { CallCopilot } from "@/components/site/call-copilot";

export const metadata: Metadata = {
  title: "Call co-pilot · DNA security assistant (prototype)",
};

/** "Listen with me": live red flags during a suspicious call, then one clear next step. */
export default function CallPage() {
  return <CallCopilot />;
}
