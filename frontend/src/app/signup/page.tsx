import type { Metadata } from "next";
import { AuthForm } from "@/components/account/auth-form";

export const metadata: Metadata = { title: "Create an account · DNA - Security Assistant" };

export default function SignUpPage() {
  return <AuthForm mode="signup" />;
}
