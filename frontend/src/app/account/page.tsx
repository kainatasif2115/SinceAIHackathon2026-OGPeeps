import { redirect } from "next/navigation";

/** The account page moved into the dashboard. */
export default function AccountPage() {
  redirect("/dashboard/account");
}
