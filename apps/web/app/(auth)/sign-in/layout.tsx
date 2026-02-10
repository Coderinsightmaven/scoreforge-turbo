import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your ScoreForge account to manage tournaments and track scores.",
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
