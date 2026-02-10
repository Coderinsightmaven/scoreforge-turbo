import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Match Details",
  description: "View match details, live scores, and manage scoring for tournament matches.",
};

export default function MatchDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
