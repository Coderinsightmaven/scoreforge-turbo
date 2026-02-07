"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, CheckCircle, AlertCircle } from "lucide-react";
import { getDisplayMessage } from "@/lib/errors";
import { toast } from "sonner";
import { ApiKeysSection } from "./components/ApiKeysSection";
import { SettingsSkeleton } from "./components/SettingsSkeleton";

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
          <h1 className="text-title text-foreground mb-2 font-[family-name:var(--font-display)]">
            Settings
          </h1>
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
                    <p className="text-small text-muted-foreground">Email cannot be changed</p>
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
            <DialogDescription>This will permanently delete:</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ul className="text-small text-muted-foreground list-disc list-inside space-y-1">
              <li>All tournaments you own</li>
              <li>All matches and scoring history</li>
              <li>Your API keys</li>
              <li>Your preferences and settings</li>
            </ul>
            <p className="text-body text-foreground">
              Type{" "}
              <span className="font-mono text-red-600 dark:text-red-400 font-medium">DELETE</span>{" "}
              to confirm:
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
