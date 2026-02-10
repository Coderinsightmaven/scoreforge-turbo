"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex/dataModel";
import { toast } from "sonner";
import { getDisplayMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";

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
      <div className="surface-panel surface-panel-rail w-full max-w-lg animate-scaleIn">
        <div className="flex items-center justify-between border-b border-border/70 p-6">
          <h3 className="text-heading text-foreground font-[family-name:var(--font-display)]">
            {createdCredentials ? "Scorer Created" : "Create Temporary Scorer"}
          </h3>
          <button
            onClick={handleClose}
            className="rounded-full border border-border/60 px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-6">
          {createdCredentials ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-success/35 bg-success-light p-4">
                <p className="text-sm text-success font-medium mb-2">
                  Save these credentials! The PIN will not be shown again.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Tournament Code
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 rounded-xl border border-border bg-bg-secondary px-3 py-2 text-lg font-mono font-bold text-brand tracking-widest">
                      {createdCredentials.scorerCode}
                    </code>
                    <button
                      onClick={() => copyToClipboard(createdCredentials.scorerCode, "code")}
                      className="rounded-lg p-2 text-muted-foreground hover:text-brand transition-all"
                    >
                      {copiedCode ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Username
                  </label>
                  <div className="mt-1 rounded-xl border border-border bg-bg-secondary px-3 py-2 text-sm font-medium text-foreground">
                    {createdCredentials.username}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    PIN
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 rounded-xl border border-border bg-bg-secondary px-3 py-2 text-lg font-mono font-bold text-success tracking-widest">
                      {createdCredentials.pin}
                    </code>
                    <button
                      onClick={() => copyToClipboard(createdCredentials.pin, "pin")}
                      className="rounded-lg p-2 text-muted-foreground hover:text-brand transition-all"
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
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">
                  <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-error rounded-full text-text-inverse text-xs font-bold">
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
                    className="input"
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
                    className="input"
                  />
                </div>
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-border/70 p-6">
          {createdCredentials ? (
            <Button onClick={handleClose} variant="brand" size="sm">
              Done
            </Button>
          ) : (
            <>
              <Button onClick={handleClose} variant="outline" size="sm">
                Cancel
              </Button>
              <Button
                onClick={handleCreateTempScorer}
                disabled={!tempUsername.trim() || loading}
                variant="brand"
                size="sm"
              >
                {loading ? "Creating..." : "Create Scorer"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
