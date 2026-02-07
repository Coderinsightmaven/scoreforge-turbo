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
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-heading text-foreground font-[family-name:var(--font-display)]">
          Account Scorers ({scorers.length})
        </h2>
        <button
          onClick={onAddClick}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-brand bg-brand/10 border border-brand/30 rounded-lg hover:bg-brand hover:text-text-inverse transition-all"
        >
          <span>+</span> Assign by Email
        </button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Users with accounts who can score this tournament.
      </p>

      {scorers.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center bg-secondary border border-dashed border-border rounded-lg">
          <span className="text-4xl text-muted-foreground mb-3 opacity-50">👤</span>
          <p className="text-sm text-muted-foreground">No account scorers assigned yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {scorers.map((scorer, index) => (
            <div
              key={scorer._id}
              className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg animate-fadeInUp"
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <div className="w-10 h-10 flex items-center justify-center text-sm font-bold text-brand bg-brand/10 rounded-full flex-shrink-0">
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
                className="px-3 py-1.5 text-xs font-semibold text-red bg-red/10 border border-red/20 rounded-lg hover:bg-red hover:text-white transition-all disabled:opacity-50"
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
