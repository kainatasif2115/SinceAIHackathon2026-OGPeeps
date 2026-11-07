"use client";

import Link from "next/link";
import { ChartColumn, Headset, KanbanSquare, LogOut, MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export type AgentView = "board" | "results" | "cases";

const TABS: { view: AgentView; href: string; label: string; icon: typeof Headset }[] = [
  { view: "board", href: "/agent", label: "Board", icon: KanbanSquare },
  { view: "results", href: "/agent/results", label: "Results", icon: ChartColumn },
  { view: "cases", href: "/agent/cases", label: "Cases", icon: MessagesSquare },
];

/** Shared header for the staff console: brand, Board / Results tabs, signed-in agent. */
export function AgentHeader({
  active,
  agentName,
  onSignOut,
}: {
  active: AgentView;
  agentName: string;
  onSignOut: () => void;
}) {
  return (
    <header className="border-border sticky top-0 z-30 border-b bg-white">
      <div className="flex h-16 flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="font-heading text-brand text-2xl leading-none font-bold tracking-tight">
            DNA
          </span>
          <span className="bg-border h-6 w-px" aria-hidden />
          <span className="font-heading flex items-center gap-1.5 text-base font-semibold">
            <Headset aria-hidden className="text-brand size-4.5" />
            <span className="hidden sm:inline">Support console</span>
          </span>
          <nav aria-label="Console sections" className="ml-2 flex items-center gap-1">
            {TABS.map((tab) => (
              <Link
                key={tab.view}
                href={tab.href}
                aria-current={tab.view === active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors duration-150",
                  tab.view === active
                    ? "bg-brand-soft text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <tab.icon aria-hidden className="size-4" />
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground hidden lg:inline">Prototype · demo account</span>
          <span className="border-border flex items-center gap-2 rounded-full border py-1 pr-3 pl-1">
            <span className="bg-brand text-brand-foreground flex size-7 items-center justify-center rounded-full text-xs font-bold">
              {agentName
                .split(" ")
                .map((part) => part[0])
                .join("")}
            </span>
            <span className="hidden font-medium md:inline">{agentName}</span>
          </span>
          <button
            type="button"
            onClick={onSignOut}
            className="text-brand hover:bg-brand-soft inline-flex h-9 items-center gap-1.5 rounded-full px-3 font-semibold transition-colors duration-150"
          >
            <LogOut aria-hidden className="size-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
