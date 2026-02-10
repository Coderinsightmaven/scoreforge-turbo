"use client";

import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { useState } from "react";
import Link from "next/link";
import { AdminsSection } from "./components/AdminsSection";
import { SettingsSection } from "./components/SettingsSection";
import { UsersSection } from "./components/UsersSection";
import { AdminSkeleton } from "./components/AdminSkeleton";
import { ArrowLeft, ShieldAlert } from "lucide-react";

type Tab = "users" | "admins" | "settings";

export default function AdminPage(): React.ReactNode {
  const isSiteAdmin = useQuery(api.siteAdmin.checkIsSiteAdmin);
  const [activeTab, setActiveTab] = useState<Tab>("users");

  if (isSiteAdmin === undefined) {
    return <AdminSkeleton />;
  }

  if (!isSiteAdmin) {
    return <UnauthorizedState />;
  }

  return (
    <div className="container space-y-6">
      <section className="surface-panel surface-panel-rail p-6 sm:p-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h1 className="text-hero">Site Administration</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Manage users, administrator access, and global platform controls.
        </p>
      </section>

      <section className="surface-panel p-4">
        <nav className="flex flex-wrap gap-2" aria-label="Admin sections">
          {[
            { id: "users" as Tab, label: "Users" },
            { id: "admins" as Tab, label: "Admins" },
            { id: "settings" as Tab, label: "Settings" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? "border-brand/45 bg-brand/10 text-brand"
                  : "border-transparent bg-bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </section>

      <section>
        {activeTab === "users" && <UsersSection />}
        {activeTab === "admins" && <AdminsSection />}
        {activeTab === "settings" && <SettingsSection />}
      </section>
    </div>
  );
}

function UnauthorizedState() {
  return (
    <div className="container flex min-h-[70vh] items-center justify-center px-4">
      <div className="surface-panel surface-panel-rail w-full max-w-lg p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-error/30 bg-error-light">
          <ShieldAlert className="h-7 w-7 text-error" />
        </div>
        <h1 className="text-title mb-2">Access Denied</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          You do not have permission to access site administration.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-lg border border-brand/30 bg-brand px-4 py-2 text-sm font-semibold text-text-inverse shadow-[var(--shadow-sm)] transition-colors hover:bg-brand-hover"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
