"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useClerk } from "@clerk/nextjs";
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
import { AlertCircle, ArrowLeft, CheckCircle, ShieldAlert } from "lucide-react";
import { getDisplayMessage } from "@/lib/errors";
import { toast } from "sonner";
import { ApiKeysSection } from "./components/ApiKeysSection";
import { SettingsSkeleton } from "./components/SettingsSkeleton";

export default function SettingsPage(): React.ReactNode {
  const user = useQuery(api.users.currentUser);
  const updateProfile = useMutation(api.users.updateProfile);
  const deleteAccount = useMutation(api.users.deleteAccount);
  const { signOut } = useClerk();

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

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
      setTimeout(() => setSuccess(false), 2600);
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
    } catch (err) {
      toast.error(getDisplayMessage(err) || "Failed to delete account");
      setDeleting(false);
      return;
    }
    try {
      await signOut();
    } catch {
      // Account was deleted successfully, sign-out failure is non-critical
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
      <div className="container flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Please sign in to access settings.</p>
      </div>
    );
  }

  return (
    <div className="container space-y-7">
      <section className="surface-panel surface-panel-rail p-6 sm:p-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <h1 className="text-hero">Settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Manage identity, API access, and security controls for your tournament workspace.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card className="rounded-2xl border">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-brand/20 bg-brand text-xl font-bold text-text-inverse shadow-[var(--shadow-sm)]">
                    {initials}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Profile avatar</p>
                    <p className="text-sm text-muted-foreground">
                      Generated automatically from your name.
                    </p>
                  </div>
                </div>

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

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email || ""}
                    disabled
                    className="cursor-not-allowed bg-bg-secondary text-muted-foreground"
                  />
                  <p className="text-sm text-muted-foreground">
                    Email address is managed by your auth provider.
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="border-success/30 bg-success-light text-success">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription className="text-success">
                      Profile updated successfully.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end border-t border-border pt-4">
                  <Button type="submit" disabled={saving} variant="brand">
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <ApiKeysSection />
        </div>

        <div className="space-y-6">
          <Card className="rounded-2xl border">
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-caption text-muted-foreground">Member Since</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {new Date(user._creationTime).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-caption text-muted-foreground">Legal</p>
                <Link
                  href="/privacy"
                  className="mt-2 inline-flex text-sm font-semibold text-foreground transition-colors hover:text-brand"
                >
                  View Privacy Policy
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-error/30">
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2 text-error">
                <ShieldAlert className="h-4 w-4" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="mb-3 text-sm text-muted-foreground">Sign out on this device.</p>
                <Button onClick={() => signOut()} variant="outline" className="w-full">
                  Sign Out
                </Button>
              </div>

              <div className="border-t border-error/30 pt-4">
                <p className="mb-3 text-sm text-muted-foreground">
                  Permanently delete your account and all tournament, scoring, and API key data.
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

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-error">Delete Account</DialogTitle>
            <DialogDescription>
              This action permanently removes your account and associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>All tournaments you own</li>
              <li>All match records and scoring logs</li>
              <li>API keys and account preferences</li>
            </ul>
            <p className="text-sm text-foreground">
              Type <span className="font-mono font-semibold text-error">DELETE</span> to continue.
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
