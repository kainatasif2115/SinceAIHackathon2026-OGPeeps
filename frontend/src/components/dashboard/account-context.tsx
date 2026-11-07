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
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; account: Account; signedOut: boolean };

type AccountContextValue = {
  account: Account;
  /** The session ended while the dashboard was open (logout elsewhere, expiry). */
  signedOut: boolean;
  reload: () => void;
  /** Re-checks the session, e.g. after the service answered "not signed in". */
  checkSession: () => void;
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
        account
          ? setState({ status: "ready", account, signedOut: false })
          : // No valid login: clear any stale cookie too, or the homepage would keep
            // sending this visitor back here instead of showing the landing page.
            void logOut()
              .catch(() => undefined)
              .then(() => router.replace("/login")),
      )
      .catch(() => setState({ status: "error" }));
  }, [router]);

  useLayoutEffect(() => () => setState({ status: "loading" }), []);
  useEffect(reload, [reload]);

  // While the dashboard is open the session can end (logout in another tab, expiry) or
  // change to someone else. Don't pull the page away mid-chat: flag it, so the dashboard
  // can say new chats aren't saved. A different person means a fresh page.
  const checkSession = useCallback(() => {
    getAccount()
      .then((now) =>
        setState((prev) => {
          if (prev.status !== "ready") return prev;
          if (!now) return { ...prev, signedOut: true };
          if (now.email !== prev.account.email) {
            window.location.reload();
            return prev;
          }
          return { status: "ready", account: now, signedOut: false };
        }),
      )
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && checkSession();
    window.addEventListener("focus", checkSession);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", checkSession);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [checkSession]);

  const signOut = useCallback(async () => {
    await logOut().catch(() => undefined);
    router.push("/");
  }, [router]);

  if (state.status !== "ready") return fallback(state.status);
  return (
    <AccountContext
      value={{
        account: state.account,
        signedOut: state.signedOut,
        reload,
        checkSession,
        signOut,
      }}
    >
      {children}
    </AccountContext>
  );
}
