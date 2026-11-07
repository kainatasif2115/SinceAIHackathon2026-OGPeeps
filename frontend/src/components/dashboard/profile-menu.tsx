"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Building2, ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import { useAccount } from "./account-context";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")
  ).toUpperCase();
}

/** The profile button at the top right; opens who you are, Account and Log out. */
export function ProfileMenu() {
  const { account, signOut } = useAccount();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    wrapper.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    function onPointer(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item =
    "hover:bg-muted focus-visible:bg-muted flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-semibold outline-none transition-colors duration-150";

  return (
    <div ref={wrapper} className="relative">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="hover:bg-muted flex h-10 items-center gap-1 rounded-full pr-2 pl-1 transition-colors duration-150"
      >
        <span className="bg-brand text-brand-foreground flex size-8 items-center justify-center rounded-full text-xs font-bold">
          {initials(account.name)}
        </span>
        <ChevronDown aria-hidden className="size-4" />
        <span className="sr-only">Your profile, {account.name}</span>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Your profile"
          className="border-border absolute top-12 right-0 z-40 w-64 rounded-2xl border bg-white p-2 shadow-[0_12px_32px_rgb(0_0_0/0.12)]"
        >
          <div className="px-3 pt-2 pb-3">
            <p className="truncate font-semibold">{account.name}</p>
            <p className="text-muted-foreground truncate text-xs">{account.email}</p>
            <p className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-xs">
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
          <div className="border-border border-t pt-2">
            <Link
              href="/dashboard/account"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={item}
            >
              <Settings aria-hidden className="size-4" />
              Account settings
            </Link>
            <button type="button" role="menuitem" onClick={() => void signOut()} className={item}>
              <LogOut aria-hidden className="size-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
