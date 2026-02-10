"use client";

import React from "react";

interface AccountScorer {
  _id: string;
  userId: string;
  userName: string | undefined;
  userEmail: string | undefined;
  assignedAt: number;
}

interface AccountScorersSectionProps {
  scorers: AccountScorer[];
  removingId: string | null;
  onAddClick: () => void;
  onRemove: (userId: string) => void;
}

export function AccountScorersSection({
  scorers,
  removingId,
  onAddClick,
  onRemove,
}: AccountScorersSectionProps): React.ReactNode {
  return (
    <div className="surface-panel surface-panel-rail p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-heading text-foreground font-[family-name:var(--font-display)]">
          Account Scorers ({scorers.length})
        </h2>
        <button
          onClick={onAddClick}
          className="inline-flex items-center gap-1.5 rounded-xl border border-brand/30 bg-brand/10 px-4 py-2 text-sm font-medium text-brand transition-all hover:bg-brand hover:text-text-inverse"
        >
          <span>+</span> Assign by Email
        </button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Users with accounts who can score this tournament.
      </p>

      {scorers.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-bg-secondary py-12 text-center">
          <span className="text-4xl text-muted-foreground mb-3 opacity-50">👤</span>
          <p className="text-sm text-muted-foreground">No account scorers assigned yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {scorers.map((scorer, index) => (
            <div
              key={scorer._id}
              className="flex items-center gap-4 rounded-xl border border-border/70 bg-bg-secondary p-4 animate-fadeInUp"
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-brand bg-brand/10 flex-shrink-0">
                {(scorer.userName || scorer.userEmail || "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <span className="block font-medium text-foreground">
                  {scorer.userName || "Unknown"}
                </span>
                <span className="block text-sm text-muted-foreground">{scorer.userEmail}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Added {new Date(scorer.assignedAt).toLocaleDateString()}
              </div>
              <button
                onClick={() => onRemove(scorer.userId)}
                disabled={removingId === scorer.userId}
                className="rounded-lg border border-red/20 bg-red/10 px-3 py-1.5 text-xs font-semibold text-red transition-all hover:bg-red hover:text-text-inverse disabled:opacity-50"
              >
                {removingId === scorer.userId ? "..." : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
