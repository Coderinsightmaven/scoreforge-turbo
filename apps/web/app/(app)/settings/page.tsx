"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Skeleton, SkeletonForm } from "@/app/components/Skeleton";

export default function SettingsPage(): React.ReactNode {
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
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary">
            Settings
          </h1>
          <p className="text-text-secondary mt-2">
            Manage your profile, API keys, and account preferences
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="py-8 px-6 max-w-[var(--content-max)] mx-auto">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Profile Card */}
            <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="font-display text-lg font-medium text-text-primary">
                  Profile information
                </h2>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 flex items-center justify-center font-display text-2xl font-semibold text-text-inverse bg-gradient-to-br from-accent to-accent-dim rounded-full">
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
                    className="px-5 py-2.5 text-sm font-semibold text-text-inverse bg-accent rounded-lg hover:bg-accent-bright transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </section>

            {/* API Keys Section */}
            <ApiKeysSection />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Info Card */}
            <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="font-display text-lg font-medium text-text-primary">
                  Account
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
                <h2 className="font-display text-lg font-medium text-error">
                  Danger zone
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

function ApiKeysSection() {
  const apiKeys = useQuery(api.apiKeys.listApiKeys);
  const generateApiKey = useMutation(api.apiKeys.generateApiKey);
  const revokeApiKey = useMutation(api.apiKeys.revokeApiKey);
  const deleteApiKey = useMutation(api.apiKeys.deleteApiKey);

  const [newKeyName, setNewKeyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setError(null);
    setIsCreating(true);

    try {
      const result = await generateApiKey({ name: newKeyName.trim() });
      setShowNewKey(result.fullKey);
      setNewKeyName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    try {
      await revokeApiKey({ keyId: keyId as any });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke API key");
    }
  };

  const handleDelete = async (keyId: string) => {
    if (!confirm("Are you sure you want to delete this API key?")) return;
    try {
      await deleteApiKey({ keyId: keyId as any });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete API key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <section className="bg-bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-border">
        <h2 className="font-display text-lg font-medium text-text-primary">
          API Keys
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          Use API keys to access your tournament data programmatically
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* New key created alert */}
        {showNewKey && (
          <div className="p-4 bg-success/10 border border-success/20 rounded-xl">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 text-success font-medium">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                API key created!
              </div>
              <button
                onClick={() => setShowNewKey(null)}
                className="text-text-muted hover:text-text-secondary"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-text-secondary mb-3">
              Make sure to copy your API key now. You won't be able to see it again!
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-bg-elevated text-text-primary text-sm font-mono rounded-lg overflow-x-auto">
                {showNewKey}
              </code>
              <button
                onClick={() => copyToClipboard(showNewKey)}
                className="px-4 py-2.5 text-sm font-medium bg-bg-elevated text-text-primary rounded-lg hover:bg-bg-secondary transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 text-sm text-error bg-error/10 border border-error/20 rounded-lg">
            {error}
          </div>
        )}

        {/* Create new key */}
        <form onSubmit={handleCreateKey} className="flex gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g., Production, Development)"
            className="flex-1 px-4 py-3 bg-bg-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
          />
          <button
            type="submit"
            disabled={isCreating || !newKeyName.trim()}
            className="px-5 py-3 text-sm font-semibold text-text-inverse bg-accent rounded-lg hover:bg-accent-bright transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isCreating ? "Creating..." : "Create Key"}
          </button>
        </form>

        {/* Existing keys */}
        {apiKeys === undefined ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 bg-bg-elevated rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-8 w-16 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
            <p>No API keys yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div
                key={key._id}
                className={`p-4 bg-bg-elevated rounded-lg ${!key.isActive ? "opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">{key.name}</span>
                      {!key.isActive && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-text-muted/20 text-text-muted rounded">
                          Revoked
                        </span>
                      )}
                    </div>
                    <code className="text-sm text-text-muted font-mono">
                      {key.keyPrefix}...
                    </code>
                    <p className="text-xs text-text-muted mt-1">
                      Created {new Date(key.createdAt).toLocaleDateString()}
                      {key.lastUsedAt && ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {key.isActive && (
                      <button
                        onClick={() => handleRevoke(key._id)}
                        className="px-3 py-1.5 text-xs font-medium text-warning bg-warning/10 rounded-lg hover:bg-warning/20 transition-colors"
                      >
                        Revoke
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(key._id)}
                      className="px-3 py-1.5 text-xs font-medium text-error bg-error/10 rounded-lg hover:bg-error/20 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
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
          <div className="lg:col-span-2 space-y-8">
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

            {/* API Keys */}
            <div className="bg-bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-border">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-64 mt-2" />
              </div>
              <div className="p-6 space-y-6">
                <div className="flex gap-3">
                  <Skeleton className="flex-1 h-12 rounded-lg" />
                  <Skeleton className="w-28 h-12 rounded-lg" />
                </div>
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
