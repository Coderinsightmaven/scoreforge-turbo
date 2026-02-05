"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Id } from "@repo/convex/dataModel";
import { toast } from "sonner";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import { getDisplayMessage } from "@/lib/errors";
import { Skeleton } from "@/app/components/Skeleton";

function TabSkeleton() {
  return (
    <div className="animate-fadeIn">
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex flex-col p-4 bg-card border border-border rounded-xl"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <div className="ml-auto">
                <Skeleton className="h-5 w-16 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-4 w-8 flex-shrink-0" />
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScorersTab({
  tournamentId,
}: {
  tournamentId: string;
}): React.ReactNode {
  // Regular scorers
  const scorers = useQuery(api.tournamentScorers.listScorers, {
    tournamentId: tournamentId as Id<"tournaments">,
  });
  const assignScorer = useMutation(api.tournamentScorers.assignScorer);
  const removeScorer = useMutation(api.tournamentScorers.removeScorer);

  // Temporary scorers
  const tempScorers = useQuery(api.temporaryScorers.listTemporaryScorers, {
    tournamentId: tournamentId as Id<"tournaments">,
  });
  const scorerCode = useQuery(api.temporaryScorers.getScorerCode, {
    tournamentId: tournamentId as Id<"tournaments">,
  });
  const createTempScorer = useMutation(api.temporaryScorers.createTemporaryScorer);
  const deactivateTempScorer = useMutation(api.temporaryScorers.deactivateTemporaryScorer);
  const reactivateTempScorer = useMutation(api.temporaryScorers.reactivateTemporaryScorer);
  const resetTempScorerPin = useMutation(api.temporaryScorers.resetTemporaryScorerPin);
  const deleteTempScorer = useMutation(api.temporaryScorers.deleteTemporaryScorer);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showTempScorerModal, setShowTempScorerModal] = useState(false);
  const [email, setEmail] = useState("");
  const [tempUsername, setTempUsername] = useState("");
  const [tempDisplayName, setTempDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ pin: string; scorerCode: string; username: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [resetPinResult, setResetPinResult] = useState<{ scorerId: string; pin: string } | null>(null);
  const [confirmState, setConfirmState] = useState<{action: () => void, title: string, description: string, confirmLabel: string, variant: "danger" | "default"} | null>(null);

  if (!scorers || tempScorers === undefined) {
    return <TabSkeleton />;
  }

  const handleAssign = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await assignScorer({
        tournamentId: tournamentId as Id<"tournaments">,
        email: email.trim(),
      });
      setShowAddModal(false);
      setEmail("");
    } catch (err) {
      setError(getDisplayMessage(err) || "Failed to assign scorer");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (userId: string) => {
    setConfirmState({
      action: async () => {
        setRemovingId(userId);
        try {
          await removeScorer({
            tournamentId: tournamentId as Id<"tournaments">,
            userId: userId as Id<"users">,
          });
        } catch (err) {
          toast.error(getDisplayMessage(err) || "Failed to remove scorer");
        } finally {
          setRemovingId(null);
        }
      },
      title: "Remove Scorer",
      description: "Remove this scorer from the tournament?",
      confirmLabel: "Remove",
      variant: "danger",
    });
  };

  const handleCreateTempScorer = async () => {
    if (!tempUsername.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await createTempScorer({
        tournamentId: tournamentId as Id<"tournaments">,
        username: tempUsername.trim(),
        displayName: tempDisplayName.trim() || tempUsername.trim(),
      });
      setCreatedCredentials({ pin: result.pin, scorerCode: result.scorerCode, username: tempUsername.trim() });
      setTempUsername("");
      setTempDisplayName("");
    } catch (err) {
      setError(getDisplayMessage(err) || "Failed to create temporary scorer");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateTempScorer = (scorerId: string) => {
    setConfirmState({
      action: async () => {
        try {
          await deactivateTempScorer({ scorerId: scorerId as Id<"temporaryScorers"> });
        } catch (err) {
          toast.error(getDisplayMessage(err) || "Failed to deactivate scorer");
        }
      },
      title: "Deactivate Scorer",
      description: "Deactivate this scorer? They will no longer be able to log in.",
      confirmLabel: "Deactivate",
      variant: "danger",
    });
  };

  const handleReactivateTempScorer = async (scorerId: string) => {
    try {
      await reactivateTempScorer({ scorerId: scorerId as Id<"temporaryScorers"> });
    } catch (err) {
      toast.error(getDisplayMessage(err) || "Failed to reactivate scorer");
    }
  };

  const handleResetPin = (scorerId: string) => {
    setConfirmState({
      action: async () => {
        try {
          const newPin = await resetTempScorerPin({ scorerId: scorerId as Id<"temporaryScorers"> });
          setResetPinResult({ scorerId, pin: newPin });
        } catch (err) {
          toast.error(getDisplayMessage(err) || "Failed to reset PIN");
        }
      },
      title: "Reset PIN",
      description: "Reset this scorer's PIN? Their current sessions will be invalidated.",
      confirmLabel: "Reset PIN",
      variant: "danger",
    });
  };

  const handleDeleteTempScorer = (scorerId: string) => {
    setConfirmState({
      action: async () => {
        try {
          await deleteTempScorer({ scorerId: scorerId as Id<"temporaryScorers"> });
        } catch (err) {
          toast.error(getDisplayMessage(err) || "Failed to delete scorer");
        }
      },
      title: "Delete Scorer",
      description: "Permanently delete this scorer? This cannot be undone.",
      confirmLabel: "Delete Scorer",
      variant: "danger",
    });
  };

  const copyToClipboard = async (text: string, type: "code" | "pin") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "code") {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedPin(true);
        setTimeout(() => setCopiedPin(false), 2000);
      }
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <div className="animate-fadeIn space-y-8">
      {/* Tournament Scorer Code */}
      {scorerCode && (
        <div className="p-4 bg-secondary border border-border rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Tournament Scorer Code</h3>
              <p className="text-xs text-muted-foreground">
                Temporary scorers use this code to log in on the mobile app
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="px-4 py-2 text-lg font-mono font-bold text-amber-500 bg-card border border-border rounded-lg tracking-widest">
                {scorerCode}
              </code>
              <button
                onClick={() => copyToClipboard(scorerCode, "code")}
                className="p-2 text-muted-foreground hover:text-amber-500 hover:bg-brand/10 rounded transition-all"
                title="Copy code"
              >
                {copiedCode ? (
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Temporary Scorers Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading text-foreground">
            Temporary Scorers ({tempScorers?.length || 0})
          </h2>
          <button
            onClick={() => setShowTempScorerModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-amber-500 bg-brand/10 border border-amber-500/30 rounded-lg hover:bg-brand hover:text-text-inverse transition-all"
          >
            <span>+</span> Create Temporary Scorer
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Temporary scorers can log in with a code + username + PIN on the mobile app without needing an account.
        </p>

        {tempScorers && tempScorers.length > 0 ? (
          <div className="flex flex-col gap-2 mb-8">
            {tempScorers.map((scorer, index) => (
              <div
                key={scorer._id}
                className={`flex items-center gap-4 p-4 bg-card border border-border rounded-xl animate-fadeInUp ${!scorer.isActive ? "opacity-60" : ""}`}
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <div className={`w-10 h-10 flex items-center justify-center text-sm font-bold rounded-full flex-shrink-0 ${scorer.isActive ? "text-amber-500 bg-brand/10" : "text-muted-foreground bg-secondary"}`}>
                  {scorer.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <span className="block font-medium text-foreground">
                    {scorer.displayName}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    Username: {scorer.username}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!scorer.isActive && (
                    <span className="px-2 py-1 text-xs font-semibold text-red bg-red/10 rounded">
                      Inactive
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Created {new Date(scorer.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleResetPin(scorer._id)}
                    className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-secondary border border-border rounded-lg hover:text-foreground hover:border-amber-500/30 transition-all"
                    title="Reset PIN"
                  >
                    Reset PIN
                  </button>
                  {scorer.isActive ? (
                    <button
                      onClick={() => handleDeactivateTempScorer(scorer._id)}
                      className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-secondary border border-border rounded-lg hover:text-red hover:border-red/30 transition-all"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivateTempScorer(scorer._id)}
                      className="px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all"
                    >
                      Reactivate
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteTempScorer(scorer._id)}
                    className="px-3 py-1.5 text-xs font-semibold text-red bg-red/10 border border-red/20 rounded-lg hover:bg-red hover:text-white transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center py-12 text-center bg-secondary border border-dashed border-border rounded-2xl mb-8">
            <span className="text-4xl text-muted-foreground mb-3 opacity-50">🔑</span>
            <p className="text-sm text-muted-foreground">
              No temporary scorers yet. Create one to allow scoring without an account.
            </p>
          </div>
        )}
      </div>

      {/* Regular Scorers Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading text-foreground">
            Account Scorers ({scorers.length})
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-amber-500 bg-brand/10 border border-amber-500/30 rounded-lg hover:bg-brand hover:text-text-inverse transition-all"
          >
            <span>+</span> Assign by Email
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Users with accounts who can score this tournament.
        </p>

        {scorers.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center bg-secondary border border-dashed border-border rounded-2xl">
            <span className="text-4xl text-muted-foreground mb-3 opacity-50">👤</span>
            <p className="text-sm text-muted-foreground">
              No account scorers assigned yet.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {scorers.map((scorer, index) => (
              <div
                key={scorer._id}
                className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl animate-fadeInUp"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <div className="w-10 h-10 flex items-center justify-center text-sm font-bold text-amber-500 bg-brand/10 rounded-full flex-shrink-0">
                  {(scorer.userName || scorer.userEmail || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <span className="block font-medium text-foreground">
                    {scorer.userName || "Unknown"}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {scorer.userEmail}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Added {new Date(scorer.assignedAt).toLocaleDateString()}
                </div>
                <button
                  onClick={() => handleRemove(scorer.userId)}
                  disabled={removingId === scorer.userId}
                  className="px-3 py-1.5 text-xs font-semibold text-red bg-red/10 border border-red/20 rounded-lg hover:bg-red hover:text-white transition-all disabled:opacity-50"
                >
                  {removingId === scorer.userId ? "..." : "Remove"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Account Scorer Modal */}
      {showAddModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-heading text-foreground">
                Assign scorer by email
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEmail("");
                  setError(null);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              {error && (
                <div className="flex items-center gap-2 p-3 mb-4 text-sm text-red bg-red/10 border border-red/20 rounded-lg">
                  <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-red rounded-full text-white text-xs font-bold">
                    !
                  </span>
                  {error}
                </div>
              )}

              <p className="text-sm text-muted-foreground mb-4">
                Enter the email address of a user to assign them as a scorer. They must already have an account.
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address..."
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && email.trim()) {
                    handleAssign();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-border">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEmail("");
                  setError(null);
                }}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!email.trim() || loading}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all bg-amber-500 text-white hover:bg-amber-600 shadow-sm h-9 px-4 py-2"
              >
                {loading ? "Assigning..." : "Assign Scorer"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Create Temporary Scorer Modal */}
      {showTempScorerModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-heading text-foreground">
                {createdCredentials ? "Scorer Created" : "Create Temporary Scorer"}
              </h3>
              <button
                onClick={() => {
                  setShowTempScorerModal(false);
                  setTempUsername("");
                  setTempDisplayName("");
                  setError(null);
                  setCreatedCredentials(null);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              {createdCredentials ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <p className="text-sm text-emerald-800 dark:text-emerald-200 font-medium mb-2">
                      Save these credentials! The PIN will not be shown again.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Tournament Code
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 px-3 py-2 text-lg font-mono font-bold text-amber-500 bg-secondary border border-border rounded-lg tracking-widest">
                          {createdCredentials.scorerCode}
                        </code>
                        <button
                          onClick={() => copyToClipboard(createdCredentials.scorerCode, "code")}
                          className="p-2 text-muted-foreground hover:text-amber-500 rounded transition-all"
                        >
                          {copiedCode ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Username
                      </label>
                      <div className="px-3 py-2 mt-1 text-sm font-medium text-foreground bg-secondary border border-border rounded-lg">
                        {createdCredentials.username}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        PIN
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 px-3 py-2 text-lg font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-secondary border border-border rounded-lg tracking-widest">
                          {createdCredentials.pin}
                        </code>
                        <button
                          onClick={() => copyToClipboard(createdCredentials.pin, "pin")}
                          className="p-2 text-muted-foreground hover:text-amber-500 rounded transition-all"
                        >
                          {copiedPin ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="flex items-center gap-2 p-3 mb-4 text-sm text-red bg-red/10 border border-red/20 rounded-lg">
                      <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-red rounded-full text-white text-xs font-bold">
                        !
                      </span>
                      {error}
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground mb-4">
                    Create a temporary scorer account. They can log in on the mobile app using the tournament code, their username, and PIN.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        value={tempUsername}
                        onChange={(e) => setTempUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                        placeholder="e.g., court1, scorer2"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        autoFocus
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Letters, numbers, underscores, and hyphens only
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Display Name (optional)
                      </label>
                      <input
                        type="text"
                        value={tempDisplayName}
                        onChange={(e) => setTempDisplayName(e.target.value)}
                        placeholder="e.g., Court 1 Scorer"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-border">
              {createdCredentials ? (
                <button
                  onClick={() => {
                    setShowTempScorerModal(false);
                    setTempUsername("");
                    setTempDisplayName("");
                    setCreatedCredentials(null);
                  }}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all bg-amber-500 text-white hover:bg-amber-600 shadow-sm h-9 px-4 py-2"
                >
                  Done
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setShowTempScorerModal(false);
                      setTempUsername("");
                      setTempDisplayName("");
                      setError(null);
                    }}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateTempScorer}
                    disabled={!tempUsername.trim() || loading}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all bg-amber-500 text-white hover:bg-amber-600 shadow-sm h-9 px-4 py-2"
                  >
                    {loading ? "Creating..." : "Create Scorer"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Reset PIN Result Modal */}
      {resetPinResult && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl animate-scaleIn">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 text-center">
                PIN Reset
              </h3>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg mb-4">
                <p className="text-sm text-emerald-800 dark:text-emerald-200 font-medium text-center">
                  Save this PIN! It will not be shown again.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2">
                <code className="px-4 py-2 text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-secondary border border-border rounded-lg tracking-widest">
                  {resetPinResult.pin}
                </code>
                <button
                  onClick={() => copyToClipboard(resetPinResult.pin, "pin")}
                  className="p-2 text-muted-foreground hover:text-amber-500 rounded transition-all"
                >
                  {copiedPin ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <div className="flex justify-center p-6 border-t border-border">
              <button
                onClick={() => setResetPinResult(null)}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all bg-amber-500 text-white hover:bg-amber-600 shadow-sm h-9 px-6 py-2"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmDialog
        open={confirmState !== null}
        onConfirm={() => {
          confirmState?.action();
          setConfirmState(null);
        }}
        onCancel={() => setConfirmState(null)}
        title={confirmState?.title ?? ""}
        description={confirmState?.description ?? ""}
        confirmLabel={confirmState?.confirmLabel}
        variant={confirmState?.variant}
      />
    </div>
  );
}
