"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex/dataModel";
import { getDisplayMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";

interface AddScorerModalProps {
  tournamentId: string;
  onClose: () => void;
}

export function AddScorerModal({ tournamentId, onClose }: AddScorerModalProps): React.ReactNode {
  const assignScorer = useMutation(api.tournamentScorers.assignScorer);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAssign = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await assignScorer({
        tournamentId: tournamentId as Id<"tournaments">,
        email: email.trim(),
      });
      onClose();
    } catch (err) {
      setError(getDisplayMessage(err) || "Failed to assign scorer");
    } finally {
      setLoading(false);
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
            Assign scorer by email
          </h3>
          <button
            onClick={handleClose}
            className="rounded-full border border-border/60 px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red/20 bg-red/10 p-3 text-sm text-red">
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-red rounded-full text-white text-xs font-bold">
                !
              </span>
              {error}
            </div>
          )}

          <p className="text-sm text-muted-foreground mb-4">
            Enter the email address of a user to assign them as a scorer. They must already have an
            account.
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address..."
            className="input"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && email.trim()) {
                handleAssign();
              }
            }}
          />
        </div>
        <div className="flex justify-end gap-3 border-t border-border/70 p-6">
          <Button onClick={handleClose} variant="outline" size="sm">
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!email.trim() || loading}
            variant="brand"
            size="sm"
          >
            {loading ? "Assigning..." : "Assign Scorer"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
