"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function SettingsPage(): React.ReactNode {
  const user = useQuery(api.users.currentUser);
  const updateProfile = useMutation(api.users.updateProfile);
  const { signOut } = useAuthActions();

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const deleteAccount = useMutation(api.users.deleteAccount);

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

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;

    setDeleting(true);
    try {
      await deleteAccount();
      await signOut();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete account");
      setDeleting(false);
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
    return <SettingsSkeleton />;
  }

  if (user === null) {
    return (
      <div className="min-h-screen bg-bg-page flex items-center justify-center">
        <p className="text-text-secondary">Please sign in to access settings.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-page py-8">
      <div className="container">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-small text-text-muted hover:text-text-secondary transition-colors mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to dashboard
          </Link>
          <h1 className="text-title text-text-primary mb-2">Settings</h1>
          <p className="text-body text-text-secondary">
            Manage your profile and account preferences
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Card */}
            <div className="card">
              <h2 className="text-heading text-text-primary mb-6">Profile Information</h2>

              <form onSubmit={handleSave} className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 flex items-center justify-center text-xl font-semibold text-white bg-brand rounded-full">
                    {initials}
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Profile Picture</p>
                    <p className="text-small text-text-muted">
                      Avatar is generated from your initials
                    </p>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label htmlFor="name" className="text-label block mb-2">
                    Display Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="input"
                  />
                </div>

                {/* Email (read-only) */}
                <div>
                  <label htmlFor="email" className="text-label block mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={user.email || ""}
                    disabled
                    className="input bg-bg-secondary cursor-not-allowed text-text-muted"
                  />
                  <p className="text-small text-text-muted mt-1">
                    Email cannot be changed
                  </p>
                </div>

                {/* Status Messages */}
                {error && (
                  <div className="p-4 bg-error-light border border-error/20 rounded-lg text-error text-small">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-4 bg-success-light border border-success/20 rounded-lg text-success text-small">
                    Profile updated successfully!
                  </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-border">
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>

            {/* API Keys Section */}
            <ApiKeysSection />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Info Card */}
            <div className="card">
              <h2 className="text-heading text-text-primary mb-4">Account</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-small text-text-muted mb-1">Member Since</p>
                  <p className="text-body text-text-primary">
                    {new Date(user._creationTime).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                {user.emailVerificationTime && (
                  <div>
                    <p className="text-small text-text-muted mb-1">Email Status</p>
                    <p className="text-body text-success flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Verified
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Danger Zone */}
            <div className="card border-error/20">
              <h2 className="text-heading text-error mb-4">Danger Zone</h2>
              <div className="space-y-6">
                <div>
                  <p className="text-small text-text-secondary mb-3">
                    Sign out of your account on this device.
                  </p>
                  <button
                    onClick={() => signOut()}
                    className="w-full py-3 text-sm font-medium text-error bg-error-light rounded-lg hover:bg-error/20 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>

                <div className="pt-4 border-t border-error/20">
                  <p className="text-small text-text-secondary mb-2">
                    Permanently delete your account and all associated data.
                  </p>
                  <p className="text-small text-text-muted mb-3">
                    This action cannot be undone.
                  </p>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="w-full py-3 text-sm font-medium text-white bg-error rounded-lg hover:bg-error/90 transition-colors"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-bg-card border border-border rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-border">
              <h3 className="text-heading text-error">Delete Account</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-body text-text-secondary">
                This will permanently delete:
              </p>
              <ul className="text-small text-text-muted list-disc list-inside space-y-1">
                <li>All tournaments you own</li>
                <li>All matches and scoring history</li>
                <li>Your API keys</li>
                <li>Your preferences and settings</li>
              </ul>
              <p className="text-body text-text-secondary">
                Type <span className="font-mono text-error font-medium">DELETE</span> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="input"
                autoFocus
              />
            </div>
            <div className="p-6 border-t border-border flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                disabled={deleting}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "DELETE" || deleting}
                className="flex-1 py-3 text-sm font-semibold text-white bg-error rounded-lg hover:bg-error/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
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
    <div className="card">
      <div className="mb-6">
        <h2 className="text-heading text-text-primary">API Keys</h2>
        <p className="text-small text-text-secondary mt-1">
          Use API keys to access your tournament data programmatically
        </p>
      </div>

      {/* New key created alert */}
      {showNewKey && (
        <div className="mb-6 p-4 bg-success-light border border-success/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="font-medium text-success">API key created!</p>
            <button
              onClick={() => setShowNewKey(null)}
              className="text-text-muted hover:text-text-secondary"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-small text-text-secondary mb-3">
            Make sure to copy your API key now. You won't be able to see it again!
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-3 bg-bg-secondary text-text-primary text-small font-mono rounded-lg overflow-x-auto">
              {showNewKey}
            </code>
            <button
              onClick={() => copyToClipboard(showNewKey)}
              className="btn-secondary !py-2.5 !px-4"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-error-light border border-error/20 rounded-lg text-error text-small">
          {error}
        </div>
      )}

      {/* Create new key */}
      <form onSubmit={handleCreateKey} className="flex gap-3 mb-6">
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="Key name (e.g., Production)"
          className="input flex-1"
        />
        <button
          type="submit"
          disabled={isCreating || !newKeyName.trim()}
          className="btn-primary"
        >
          {isCreating ? "Creating..." : "Create Key"}
        </button>
      </form>

      {/* Existing keys */}
      {apiKeys === undefined ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="p-4 bg-bg-secondary rounded-lg animate-pulse">
              <div className="h-5 w-32 bg-bg-tertiary rounded mb-2" />
              <div className="h-4 w-24 bg-bg-tertiary rounded" />
            </div>
          ))}
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto mb-3 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
          <p className="text-text-muted">No API keys yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apiKeys.map((key) => (
            <div
              key={key._id}
              className={`p-4 bg-bg-secondary rounded-lg ${!key.isActive ? "opacity-60" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">{key.name}</span>
                    {!key.isActive && (
                      <span className="badge badge-muted text-small">Revoked</span>
                    )}
                  </div>
                  <code className="text-small text-text-muted font-mono">
                    {key.keyPrefix}...
                  </code>
                  <p className="text-small text-text-muted mt-1">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt && ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {key.isActive && (
                    <button
                      onClick={() => handleRevoke(key._id)}
                      className="px-3 py-1.5 text-small font-medium text-warning bg-warning-light rounded-lg hover:bg-warning/20 transition-colors"
                    >
                      Revoke
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(key._id)}
                    className="px-3 py-1.5 text-small font-medium text-error bg-error-light rounded-lg hover:bg-error/20 transition-colors"
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
  );
}

function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-bg-page py-8">
      <div className="container">
        <div className="mb-8">
          <div className="h-5 w-32 bg-bg-secondary rounded animate-pulse mb-4" />
          <div className="h-8 w-48 bg-bg-secondary rounded animate-pulse mb-2" />
          <div className="h-5 w-72 bg-bg-secondary rounded animate-pulse" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <div className="h-6 w-40 bg-bg-secondary rounded animate-pulse mb-6" />
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-bg-secondary rounded-full animate-pulse" />
                <div>
                  <div className="h-5 w-32 bg-bg-secondary rounded animate-pulse mb-2" />
                  <div className="h-4 w-48 bg-bg-secondary rounded animate-pulse" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-12 bg-bg-secondary rounded-lg animate-pulse" />
                <div className="h-12 bg-bg-secondary rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="card">
              <div className="h-6 w-24 bg-bg-secondary rounded animate-pulse mb-4" />
              <div className="space-y-4">
                <div className="h-12 bg-bg-secondary rounded animate-pulse" />
                <div className="h-12 bg-bg-secondary rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
