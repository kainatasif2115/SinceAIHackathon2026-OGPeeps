"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getAccount, logOut, type Account } from "@/lib/account-api";

type AccountState =
  { status: "loading" } | { status: "error" } | { status: "ready"; account: Account };

type AccountContextValue = {
  account: Account;
  reload: () => void;
  signOut: () => Promise<void>;
};

const AccountContext = createContext<AccountContextValue | null>(null);

/** The signed-in account for every dashboard section. */
export function useAccount(): AccountContextValue {
  const value = useContext(AccountContext);
  if (!value) throw new Error("useAccount must be used inside the dashboard");
  return value;
}

/**
 * Loads the account and sends signed-out visitors to the login page. Next keeps the
 * dashboard's state when you leave it, so the account is dropped on the way out and
 * fetched again on return: after logging out and in as someone else, nobody sees the
 * previous person's data.
 */
export function AccountProvider({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: (state: "loading" | "error") => ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<AccountState>({ status: "loading" });

  const reload = useCallback(() => {
    getAccount()
      .then((account) =>
        account ? setState({ status: "ready", account }) : router.replace("/login"),
      )
      .catch(() => setState({ status: "error" }));
  }, [router]);

  useLayoutEffect(() => () => setState({ status: "loading" }), []);
  useEffect(reload, [reload]);

  const signOut = useCallback(async () => {
    await logOut().catch(() => undefined);
    router.push("/");
  }, [router]);

  if (state.status !== "ready") return fallback(state.status);
  return (
    <AccountContext value={{ account: state.account, reload, signOut }}>{children}</AccountContext>
  );
}
