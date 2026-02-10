import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "View and manage your tournaments, track live matches, and create new competitions.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
