"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex/dataModel";
import { getDisplayMessage } from "@/lib/errors";

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
      <div className="w-full max-w-lg bg-card border border-border rounded-lg shadow-2xl animate-scaleIn">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-heading text-foreground font-[family-name:var(--font-display)]">
            Assign scorer by email
          </h3>
          <button
            onClick={handleClose}
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
            Enter the email address of a user to assign them as a scorer. They must already have an
            account.
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
            onClick={handleClose}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!email.trim() || loading}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all bg-brand text-white hover:bg-brand-hover shadow-sm h-9 px-4 py-2"
          >
            {loading ? "Assigning..." : "Assign Scorer"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
