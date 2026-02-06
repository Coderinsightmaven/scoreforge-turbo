"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex/dataModel";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, CheckCircle, X, Key, Copy, AlertCircle } from "lucide-react";
import { getDisplayMessage } from "@/lib/errors";
import { toast } from "sonner";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";

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
      setError(getDisplayMessage(err) || "Failed to update profile");
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
      toast.error(getDisplayMessage(err) || "Failed to delete account");
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to access settings.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-small text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
          <h1 className="text-title text-foreground mb-2 font-[family-name:var(--font-display)]">Settings</h1>
          <p className="text-body text-muted-foreground">
            Manage your profile and account preferences
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Card */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 flex items-center justify-center text-xl font-semibold text-white bg-brand rounded-full">
                      {initials}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Profile Picture</p>
                      <p className="text-small text-muted-foreground">
                        Avatar is generated from your initials
                      </p>
                    </div>
                  </div>

                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                    />
                  </div>

                  {/* Email (read-only) */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user.email || ""}
                      disabled
                      className="bg-secondary cursor-not-allowed text-muted-foreground"
                    />
                    <p className="text-small text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>

                  {/* Status Messages */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {success && (
                    <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20">
                      <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <AlertDescription className="text-emerald-700 dark:text-emerald-300">
                        Profile updated successfully!
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Save Button */}
                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button type="submit" disabled={saving} variant="brand">
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* API Keys Section */}
            <ApiKeysSection />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-small text-muted-foreground mb-1">Member Since</p>
                  <p className="text-body text-foreground">
                    {new Date(user._creationTime).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                {user.emailVerificationTime && (
                  <div>
                    <p className="text-small text-muted-foreground mb-1">Email Status</p>
                    <p className="text-body text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Verified
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-small text-muted-foreground mb-3">
                    Sign out of your account on this device.
                  </p>
                  <Button
                    onClick={() => signOut()}
                    variant="outline"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                  >
                    Sign Out
                  </Button>
                </div>

                <div className="pt-4 border-t border-red-200 dark:border-red-800">
                  <p className="text-small text-muted-foreground mb-2">
                    Permanently delete your account and all associated data.
                  </p>
                  <p className="text-small text-muted-foreground mb-3">
                    This action cannot be undone.
                  </p>
                  <Button
                    onClick={() => setShowDeleteModal(true)}
                    variant="destructive"
                    className="w-full"
                  >
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400">Delete Account</DialogTitle>
            <DialogDescription>
              This will permanently delete:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ul className="text-small text-muted-foreground list-disc list-inside space-y-1">
              <li>All tournaments you own</li>
              <li>All matches and scoring history</li>
              <li>Your API keys</li>
              <li>Your preferences and settings</li>
            </ul>
            <p className="text-body text-foreground">
              Type <span className="font-mono text-red-600 dark:text-red-400 font-medium">DELETE</span> to confirm:
            </p>
            <Input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmText("");
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== "DELETE" || deleting}
              variant="destructive"
            >
              {deleting ? "Deleting..." : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);

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
      setError(getDisplayMessage(err) || "Failed to create API key");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    try {
      await revokeApiKey({ keyId: keyId as Id<"apiKeys"> });
    } catch (err) {
      setError(getDisplayMessage(err) || "Failed to revoke API key");
    }
  };

  const handleDelete = (keyId: string) => {
    setConfirmDeleteKey(keyId);
  };

  const executeDeleteKey = async () => {
    if (!confirmDeleteKey) return;
    try {
      await deleteApiKey({ keyId: confirmDeleteKey as Id<"apiKeys"> });
    } catch (err) {
      setError(getDisplayMessage(err) || "Failed to delete API key");
    }
    setConfirmDeleteKey(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
  <>
    <Card>
      <CardHeader>
        <CardTitle>API Keys</CardTitle>
        <p className="text-small text-muted-foreground">
          Use API keys to access your tournament data programmatically
        </p>
      </CardHeader>
      <CardContent>
        {/* New key created alert */}
        {showNewKey && (
          <Alert className="mb-6 border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-emerald-700 dark:text-emerald-300">API key created!</p>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setShowNewKey(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <AlertDescription className="text-emerald-700 dark:text-emerald-300 mb-3">
              Make sure to copy your API key now. You won&apos;t be able to see it again!
            </AlertDescription>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-secondary text-foreground text-small font-mono rounded-lg overflow-x-auto">
                {showNewKey}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(showNewKey)}
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
            </div>
          </Alert>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Create new key */}
        <form onSubmit={handleCreateKey} className="flex gap-3 mb-6">
          <Input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g., Production)"
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={isCreating || !newKeyName.trim()}
            variant="brand"
          >
            {isCreating ? "Creating..." : "Create Key"}
          </Button>
        </form>

        {/* Existing keys */}
        {apiKeys === undefined ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 bg-secondary rounded-lg">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="text-center py-8">
            <Key className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No API keys yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div
                key={key._id}
                className={`p-4 bg-secondary rounded-lg ${!key.isActive ? "opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{key.name}</span>
                      {!key.isActive && (
                        <Badge variant="muted">Revoked</Badge>
                      )}
                    </div>
                    <code className="text-small text-muted-foreground font-mono">
                      {key.keyPrefix}...
                    </code>
                    <p className="text-small text-muted-foreground mt-1">
                      Created {new Date(key.createdAt).toLocaleDateString()}
                      {key.lastUsedAt && ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {key.isActive && (
                      <Button
                        onClick={() => handleRevoke(key._id)}
                        variant="outline"
                        size="sm"
                        className="text-brand-hover border-brand hover:bg-brand-light dark:text-brand dark:border-brand dark:hover:bg-brand-light"
                      >
                        Revoke
                      </Button>
                    )}
                    <Button
                      onClick={() => handleDelete(key._id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    <ConfirmDialog
      open={confirmDeleteKey !== null}
      onConfirm={executeDeleteKey}
      onCancel={() => setConfirmDeleteKey(null)}
      title="Delete API Key"
      description="Are you sure you want to delete this API key? Any applications using it will lose access."
      confirmLabel="Delete"
      variant="danger"
    />
  </>
  );
}

function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container">
        <div className="mb-8">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-40 mb-6" />
                <div className="flex items-center gap-4 mb-6">
                  <Skeleton className="w-16 h-16 rounded-full" />
                  <div>
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-24 mb-4" />
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
