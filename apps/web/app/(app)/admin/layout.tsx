import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  description: "Site administration panel for managing users, admins, and system settings.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
