import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create a ScoreForge account to start managing tournaments and tracking scores.",
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
