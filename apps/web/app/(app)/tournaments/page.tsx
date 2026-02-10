import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tournaments",
  description: "Browse and manage your tournaments on ScoreForge.",
};

export default function TournamentsRedirect() {
  redirect("/dashboard");
}
