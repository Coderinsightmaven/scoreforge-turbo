import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Tournament",
  description: "Create a new tournament with custom formats, rules, and participant settings.",
};

export default function NewTournamentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
