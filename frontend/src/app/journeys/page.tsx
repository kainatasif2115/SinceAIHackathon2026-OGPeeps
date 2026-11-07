import type { Metadata } from "next";
import { JourneysPage } from "@/components/site/journeys-page";

export const metadata: Metadata = {
  title: "The five journeys · DNA - Security Assistant",
};

/** The five journeys as saved conversations, one tab each, for showing the assistant at work. */
export default function Journeys() {
  return <JourneysPage />;
}
