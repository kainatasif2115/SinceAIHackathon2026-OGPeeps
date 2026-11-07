import type { Metadata } from "next";
import { AccountView } from "@/components/account/account-view";

export const metadata: Metadata = { title: "Your account · DNA - Security Assistant" };

export default function AccountPage() {
  return <AccountView />;
}
