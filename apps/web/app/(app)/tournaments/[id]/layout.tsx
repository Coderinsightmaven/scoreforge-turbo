import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tournament Details",
  description: "View tournament brackets, matches, participants, standings, and manage scoring.",
};

export default function TournamentDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
