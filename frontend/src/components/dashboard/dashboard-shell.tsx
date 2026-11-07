"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, LoaderCircle, Menu, MessageCircle, Settings, Users, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountProvider, useAccount } from "./account-context";
import { ChatProvider } from "./chat-context";
import { ChatSection } from "./chat-section";
import { HistorySidebar } from "./history-sidebar";
import { ProfileMenu } from "./profile-menu";

type Tab = { href: string; label: string; icon: LucideIcon; businessOnly?: boolean };

const TABS: Tab[] = [
  { href: "/dashboard", label: "Chat", icon: MessageCircle },
  { href: "/dashboard/checks", label: "Your checks", icon: History },
  { href: "/dashboard/team", label: "Team", icon: Users, businessOnly: true },
  { href: "/dashboard/account", label: "Account", icon: Settings },
];

/**
 * The signed-in app, laid out like a chat app: a header with the sections and the
 * profile menu, the chat history on the left (a drawer on phones), the section on the right.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="theme-dna flex h-dvh flex-col overflow-hidden bg-[#fdf6fa]">
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
        <ChatProvider>
          <Layout>{children}</Layout>
        </ChatProvider>
      </AccountProvider>
    </div>
  );
}

function Layout({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Close the history drawer with Escape and whenever the section changes.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);
  const [drawerPath, setDrawerPath] = useState(pathname);
  if (drawerPath !== pathname) {
    setDrawerPath(pathname);
    setDrawerOpen(false);
  }

  const { signedOut } = useAccount();

  return (
    <>
      <Header drawerOpen={drawerOpen} onToggleDrawer={() => setDrawerOpen((v) => !v)} />
      {signedOut && (
        <div
          role="alert"
          className="border-risk-medium-line bg-risk-medium text-risk-medium-fg flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b px-4 py-2 text-sm"
        >
          <span>You&apos;ve been signed out, so new chats aren&apos;t saved to your history.</span>
          <Link href="/login" className="font-semibold underline underline-offset-4">
            Log in again
          </Link>
        </div>
      )}
      <div className="relative flex min-h-0 flex-1">
        <aside
          aria-label="Chat history"
          className="border-border hidden w-72 shrink-0 border-r bg-white md:block"
        >
          <HistorySidebar />
        </aside>

        {drawerOpen && (
          <div className="absolute inset-0 z-30 flex md:hidden">
            <aside
              id="history-drawer"
              aria-label="Chat history"
              className="border-border h-full w-[min(20rem,85vw)] border-r bg-white"
            >
              <HistorySidebar onPick={() => setDrawerOpen(false)} />
            </aside>
            <button
              type="button"
              aria-label="Close chat history"
              onClick={() => setDrawerOpen(false)}
              className="flex-1 bg-black/30"
            />
          </div>
        )}

        <main id="main" className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
          <PersistentChat />
          {children}
        </main>
      </div>
    </>
  );
}

function Header({
  drawerOpen,
  onToggleDrawer,
}: {
  drawerOpen: boolean;
  onToggleDrawer: () => void;
}) {
  const { account } = useAccount();
  const pathname = usePathname();
  const tabs = TABS.filter((t) => !t.businessOnly || account.company);

  return (
    <header className="border-border shrink-0 border-b bg-white">
      <div className="flex h-16 items-center gap-2 px-3 md:gap-6 md:px-5">
        <button
          type="button"
          onClick={onToggleDrawer}
          aria-expanded={drawerOpen}
          aria-controls="history-drawer"
          className="hover:bg-muted flex size-10 shrink-0 items-center justify-center rounded-full transition-colors duration-150 md:hidden"
        >
          {drawerOpen ? (
            <X aria-hidden className="size-5" />
          ) : (
            <Menu aria-hidden className="size-5" />
          )}
          <span className="sr-only">{drawerOpen ? "Close chat history" : "Open chat history"}</span>
        </button>
        <Link href="/" className="flex shrink-0 items-center gap-2 rounded-sm">
          <span className="font-heading text-brand text-2xl leading-none font-bold tracking-tight">
            DNA
          </span>
          <span className="font-heading hidden text-sm font-semibold whitespace-nowrap lg:inline">
            - Security Assistant
          </span>
        </Link>

        <nav aria-label="Sections" className="hidden min-w-0 md:block">
          <TabList tabs={tabs} pathname={pathname} />
        </nav>

        <div className="ml-auto">
          <ProfileMenu />
        </div>
      </div>
      <nav aria-label="Sections" className="overflow-x-auto px-2 pb-2 md:hidden">
        <TabList tabs={tabs} pathname={pathname} />
      </nav>
    </header>
  );
}

function TabList({ tabs, pathname }: { tabs: Tab[]; pathname: string }) {
  return (
    <ul className="flex gap-1">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <li key={tab.href} className="shrink-0">
            <Link
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold whitespace-nowrap transition-colors duration-150",
                active ? "bg-brand-soft text-accent-foreground" : "hover:bg-muted",
              )}
            >
              <tab.icon aria-hidden className="size-4" />
              {tab.label}
            </Link>
          </li>
        );
      })}
    </ul>
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
