import type { Metadata } from "next";
import { AuthForm } from "@/components/account/auth-form";

export const metadata: Metadata = { title: "Log in · DNA - Security Assistant" };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
