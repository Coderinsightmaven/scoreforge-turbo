"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex/dataModel";
import { toast } from "sonner";
import { getDisplayMessage } from "@/lib/errors";

interface CreateTempScorerModalProps {
  tournamentId: string;
  onClose: () => void;
}

export function CreateTempScorerModal({
  tournamentId,
  onClose,
}: CreateTempScorerModalProps): React.ReactNode {
  const createTempScorer = useMutation(api.temporaryScorers.createTemporaryScorer);
  const [tempUsername, setTempUsername] = useState("");
  const [tempDisplayName, setTempDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    pin: string;
    scorerCode: string;
    username: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

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
      setCreatedCredentials({
        pin: result.pin,
        scorerCode: result.scorerCode,
        username: tempUsername.trim(),
      });
      setTempUsername("");
      setTempDisplayName("");
    } catch (err) {
      setError(getDisplayMessage(err) || "Failed to create temporary scorer");
    } finally {
      setLoading(false);
    }
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

  const handleClose = () => {
    onClose();
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-card border border-border rounded-lg shadow-2xl animate-scaleIn">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-heading text-foreground font-[family-name:var(--font-display)]">
            {createdCredentials ? "Scorer Created" : "Create Temporary Scorer"}
          </h3>
          <button
            onClick={handleClose}
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
                    <code className="flex-1 px-3 py-2 text-lg font-mono font-bold text-brand bg-secondary border border-border rounded-lg tracking-widest">
                      {createdCredentials.scorerCode}
                    </code>
                    <button
                      onClick={() => copyToClipboard(createdCredentials.scorerCode, "code")}
                      className="p-2 text-muted-foreground hover:text-brand rounded transition-all"
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
                      className="p-2 text-muted-foreground hover:text-brand rounded transition-all"
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
                Create a temporary scorer account. They can log in on the mobile app using the
                tournament code, their username, and PIN.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Username</label>
                  <input
                    type="text"
                    value={tempUsername}
                    onChange={(e) =>
                      setTempUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
                    }
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
              onClick={handleClose}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all bg-brand text-white hover:bg-brand-hover shadow-sm h-9 px-4 py-2"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={handleClose}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTempScorer}
                disabled={!tempUsername.trim() || loading}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all bg-brand text-white hover:bg-brand-hover shadow-sm h-9 px-4 py-2"
              >
                {loading ? "Creating..." : "Create Scorer"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
