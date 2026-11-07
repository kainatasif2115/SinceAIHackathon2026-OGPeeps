"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  History,
  LoaderCircle,
  LogOut,
  MessageCircle,
  Settings,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountProvider, useAccount } from "./account-context";
import { ChatSection } from "./chat-section";

type Section = { href: string; label: string; icon: LucideIcon; businessOnly?: boolean };

const SECTIONS: Section[] = [
  { href: "/dashboard", label: "Chat", icon: MessageCircle },
  { href: "/dashboard/checks", label: "Your checks", icon: History },
  { href: "/dashboard/team", label: "Team", icon: Users, businessOnly: true },
  { href: "/dashboard/account", label: "Account", icon: Settings },
];

/** The signed-in app: a sidebar (a top bar on phones) and the chosen section. */
export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="theme-dna flex min-h-dvh flex-1 flex-col bg-[#fdf6fa] md:h-dvh md:flex-row">
      <AccountProvider
        fallback={(state) => (
          <div className="flex flex-1 items-center justify-center">
            {state === "loading" ? (
              <LoaderCircle aria-label="Loading" className="text-brand size-6 animate-spin" />
            ) : (
              <p role="alert" className="text-destructive text-sm">
                Can&apos;t load your account right now. Reload the page to try again.
              </p>
            )}
          </div>
        )}
      >
        <Sidebar />
        <main id="main" className="flex min-h-0 min-w-0 flex-1 flex-col md:overflow-y-auto">
          <PersistentChat />
          {children}
        </main>
      </AccountProvider>
    </div>
  );
}

/**
 * The chat lives in the shell, not in the /dashboard page, and is only hidden while
 * another section is open. Next keeps just the last few pages in memory, so a page-level
 * chat would lose a half-finished conversation after a visit to a few other sections.
 */
function PersistentChat() {
  const onChat = usePathname() === "/dashboard";
  return (
    <div hidden={!onChat} className="flex min-h-0 flex-1 flex-col">
      <ChatSection />
    </div>
  );
}

function Sidebar() {
  const { account, signOut } = useAccount();
  const pathname = usePathname();
  const sections = SECTIONS.filter((s) => !s.businessOnly || account.company);

  return (
    <aside className="border-border flex shrink-0 flex-col border-b bg-white md:w-64 md:border-r md:border-b-0">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 md:block md:px-5 md:pt-6">
        <Link href="/" className="flex items-center gap-2 rounded-sm">
          <span className="font-heading text-brand text-2xl leading-none font-bold tracking-tight">
            DNA
          </span>
          <span className="font-heading text-sm font-semibold">- Security Assistant</span>
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className="hover:bg-muted inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors duration-150 md:hidden"
        >
          <LogOut aria-hidden className="size-4" />
          Log out
        </button>
      </div>

      <div className="hidden px-5 pt-6 md:block">
        <p className="truncate font-semibold">{account.name}</p>
        <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
          {account.company ? (
            <>
              <Building2 aria-hidden className="size-3.5 shrink-0" />
              <span className="truncate">
                {account.company} · {account.role === "owner" ? "owner" : "member"}
              </span>
            </>
          ) : (
            <>
              <UserRound aria-hidden className="size-3.5 shrink-0" />
              Private account
            </>
          )}
        </p>
      </div>

      <nav aria-label="Your account" className="px-2 py-3 md:px-3 md:py-5">
        <ul className="flex gap-1 overflow-x-auto md:flex-col">
          {sections.map((section) => {
            const active = pathname === section.href;
            return (
              <li key={section.href} className="shrink-0">
                <Link
                  href={section.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold whitespace-nowrap transition-colors duration-150",
                    active ? "bg-brand-soft text-accent-foreground" : "hover:bg-muted",
                  )}
                >
                  <section.icon aria-hidden className="size-4.5" />
                  {section.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto hidden px-3 pb-5 md:block">
        <button
          type="button"
          onClick={() => void signOut()}
          className="hover:bg-muted flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-semibold transition-colors duration-150"
        >
          <LogOut aria-hidden className="size-4.5" />
          Log out
        </button>
      </div>
    </aside>
  );
}
