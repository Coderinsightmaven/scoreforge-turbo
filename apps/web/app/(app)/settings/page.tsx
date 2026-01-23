"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Skeleton, SkeletonForm } from "@/app/components/Skeleton";

export default function SettingsPage() {
  const user = useQuery(api.users.currentUser);
  const updateProfile = useMutation(api.users.updateProfile);
  const { signOut } = useAuthActions();

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      await updateProfile({ name: name.trim() || undefined });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "?";

  if (user === undefined) {
    return <LoadingSkeleton />;
  }

  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-secondary">Please sign in to access settings.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <header className="relative py-12 px-6 bg-bg-secondary overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-[100px] left-[30%] w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,var(--accent-glow)_0%,transparent_60%)] opacity-30" />
          <div className="absolute inset-0 grid-bg opacity-50" />
        </div>
        <div className="relative max-w-[var(--content-max)] mx-auto">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-accent transition-colors mb-6"
          >
            <span>←</span> Dashboard
          </Link>
          <h1 className="font-display text-4xl tracking-wide text-text-primary">
            SETTINGS
          </h1>
          <p className="text-text-secondary mt-2">
            Manage your profile and account preferences
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="py-8 px-6 max-w-[var(--content-max)] mx-auto">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Profile Card */}
          <div className="lg:col-span-2">
            <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="font-display text-lg font-semibold tracking-wide text-text-primary">
                  PROFILE INFORMATION
                </h2>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 flex items-center justify-center font-display text-2xl font-bold text-bg-void bg-gradient-to-br from-accent to-gold rounded-full shadow-[0_8px_32px_var(--accent-glow)]">
                    {initials}
                  </div>
                  <div>
                    <p className="font-medium text-text-primary mb-1">Profile Picture</p>
                    <p className="text-sm text-text-muted">
                      Avatar is generated from your initials
                    </p>
                  </div>
                </div>

                {/* Name */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="name"
                    className="text-sm font-medium text-text-secondary"
                  >
                    Display Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="px-4 py-3 text-base text-text-primary bg-bg-elevated border border-border rounded-lg placeholder:text-text-muted focus:outline-none focus:border-accent focus:bg-bg-secondary transition-all"
                  />
                </div>

                {/* Email (read-only) */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-text-secondary"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={user.email || ""}
                    disabled
                    className="px-4 py-3 text-base text-text-muted bg-bg-elevated/50 border border-border rounded-lg cursor-not-allowed"
                  />
                  <p className="text-xs text-text-muted">
                    Email cannot be changed
                  </p>
                </div>

                {/* Status Messages */}
                {error && (
                  <div className="flex items-center gap-2 p-3 text-sm text-red bg-red/10 border border-red/20 rounded-lg">
                    <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red rounded-full flex-shrink-0">
                      !
                    </span>
                    {error}
                  </div>
                )}

                {success && (
                  <div className="flex items-center gap-2 p-3 text-sm text-success bg-success/10 border border-success/20 rounded-lg">
                    <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-success rounded-full flex-shrink-0">
                      ✓
                    </span>
                    Profile updated successfully!
                  </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-border">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 font-display text-sm font-semibold tracking-widest uppercase text-bg-void bg-accent rounded-lg hover:bg-accent-bright hover:-translate-y-0.5 hover:shadow-glow transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Info Card */}
            <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="font-display text-lg font-semibold tracking-wide text-text-primary">
                  ACCOUNT
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                    Member Since
                  </span>
                  <p className="text-text-primary mt-1">
                    {new Date(user._creationTime).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                {user.emailVerificationTime && (
                  <div>
                    <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                      Email Verified
                    </span>
                    <p className="flex items-center gap-2 text-success mt-1">
                      <span>✓</span> Verified
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Danger Zone */}
            <section className="bg-bg-card border border-red/20 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-red/20">
                <h2 className="font-display text-lg font-semibold tracking-wide text-red">
                  DANGER ZONE
                </h2>
              </div>
              <div className="p-6">
                <p className="text-sm text-text-secondary mb-4">
                  Sign out of your account on this device.
                </p>
                <button
                  onClick={() => signOut()}
                  className="w-full px-4 py-3 text-sm font-semibold text-red bg-red/10 border border-red/20 rounded-lg hover:bg-red/20 transition-all"
                >
                  Sign Out
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen">
      <header className="relative py-12 px-6 bg-bg-secondary overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-[100px] left-[30%] w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_center,var(--accent-glow)_0%,transparent_60%)] opacity-30" />
          <div className="absolute inset-0 grid-bg opacity-50" />
        </div>
        <div className="relative max-w-[var(--content-max)] mx-auto">
          <Skeleton className="w-28 h-5 mb-6" />
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
      </header>
      <main className="py-8 px-6 max-w-[var(--content-max)] mx-auto">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Profile Card */}
          <div className="lg:col-span-2">
            <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-border">
                <Skeleton className="h-6 w-48" />
              </div>
              <div className="p-6 space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-6">
                  <Skeleton className="w-20 h-20 rounded-full" />
                  <div>
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
                {/* Form fields */}
                <SkeletonForm fields={2} />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Info Card */}
            <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-border">
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <Skeleton className="h-3 w-24 mb-2" />
                  <Skeleton className="h-5 w-40" />
                </div>
                <div>
                  <Skeleton className="h-3 w-28 mb-2" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-bg-card border border-red/20 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-red/20">
                <Skeleton className="h-6 w-32" />
              </div>
              <div className="p-6">
                <Skeleton className="h-4 w-full mb-4" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
