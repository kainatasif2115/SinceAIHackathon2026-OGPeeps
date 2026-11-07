"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { getAccount, type Account } from "@/lib/account-api";

/** Header link: "Log in" when signed out, the first name when signed in. */
export function AccountLink() {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);

  useEffect(() => {
    getAccount()
      .then(setAccount)
      .catch(() => setAccount(null));
  }, []);

  if (account === undefined) return <span className="w-10 shrink-0" aria-hidden />;
  return (
    <Link
      href={account ? "/account" : "/login"}
      className="hover:bg-muted inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap transition-colors duration-150"
    >
      <UserRound aria-hidden className="size-4" />
      <span className="sr-only sm:not-sr-only">
        {account ? account.name.split(" ")[0] : "Log in"}
      </span>
      {account && <span className="sr-only">: your account</span>}
    </Link>
  );
}
