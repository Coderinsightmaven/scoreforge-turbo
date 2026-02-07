"use client";

import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { useState } from "react";
import Link from "next/link";
import { UsersSection } from "./components/UsersSection";
import { AdminsSection } from "./components/AdminsSection";
import { SettingsSection } from "./components/SettingsSection";
import { AdminSkeleton } from "./components/AdminSkeleton";

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container py-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-small text-muted-foreground hover:text-muted-foreground transition-colors mb-4"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to dashboard
          </Link>
          <h1 className="text-title text-foreground mb-2 font-[family-name:var(--font-display)]">
            Site Administration
          </h1>
          <p className="text-body text-muted-foreground">
            Manage users, admins, and system settings
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border bg-card sticky top-16 z-10">
        <div className="container">
          <nav className="flex gap-6">
            {[
              { id: "users" as Tab, label: "Users" },
              { id: "admins" as Tab, label: "Admins" },
              { id: "settings" as Tab, label: "Settings" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 text-body font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-brand text-brand"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        {activeTab === "users" && <UsersSection />}
        {activeTab === "admins" && <AdminsSection />}
        {activeTab === "settings" && <SettingsSection />}
      </div>
    </div>
  );
}

function UnauthorizedState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center bg-error-light rounded-full">
          <svg
            className="w-8 h-8 text-error"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>
        <h1 className="text-title text-foreground mb-2 font-[family-name:var(--font-display)]">
          Access Denied
        </h1>
        <p className="text-body text-muted-foreground mb-6">
          You don&apos;t have permission to access the site administration panel.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all bg-brand text-white hover:bg-brand-hover shadow-sm h-9 px-4 py-2"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
