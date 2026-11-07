import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/** Page frame for the account pages: the homepage's DNA header, then the content. */
export function AccountShell({ children }: { children: ReactNode }) {
  return (
    <div className="theme-dna flex min-h-full flex-1 flex-col bg-[#fdf6fa]">
      <header className="border-border border-b bg-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2 rounded-sm sm:gap-2.5">
            <span className="font-heading text-brand shrink-0 text-xl leading-none font-bold tracking-tight sm:text-2xl">
              DNA
            </span>
            <span className="font-heading min-w-0 text-sm font-semibold whitespace-nowrap sm:text-base">
              - Security Assistant
            </span>
          </Link>
          <Link
            href="/"
            className="hover:bg-muted inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors duration-150"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Home
          </Link>
        </div>
      </header>
      <main id="main" className="flex flex-1 justify-center px-4 py-10 sm:py-14">
        {children}
      </main>
    </div>
  );
}
