"use client";

import React from "react";

interface TempScorer {
  _id: string;
  displayName: string;
  username: string;
  isActive: boolean;
  createdAt: number;
}

interface TemporaryScorrersSectionProps {
  tempScorers: TempScorer[];
  onCreateClick: () => void;
  onResetPin: (scorerId: string) => void;
  onDeactivate: (scorerId: string) => void;
  onReactivate: (scorerId: string) => void;
  onDelete: (scorerId: string) => void;
}

export function TemporaryScorersSection({
  tempScorers,
  onCreateClick,
  onResetPin,
  onDeactivate,
  onReactivate,
  onDelete,
}: TemporaryScorrersSectionProps): React.ReactNode {
  return (
    <div className="surface-panel surface-panel-rail p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-heading text-foreground font-[family-name:var(--font-display)]">
          Temporary Scorers ({tempScorers?.length || 0})
        </h2>
        <button
          onClick={onCreateClick}
          className="inline-flex items-center gap-1.5 rounded-xl border border-brand/30 bg-brand/10 px-4 py-2 text-sm font-medium text-brand transition-all hover:bg-brand hover:text-text-inverse"
        >
          <span>+</span> Create Temporary Scorer
        </button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Temporary scorers can log in with a code + username + PIN on the mobile app without needing
        an account.
      </p>

      {tempScorers && tempScorers.length > 0 ? (
        <div className="flex flex-col gap-2 mb-8">
          {tempScorers.map((scorer, index) => (
            <div
              key={scorer._id}
              className={`flex items-center gap-4 rounded-xl border border-border/70 bg-bg-secondary p-4 animate-fadeInUp ${!scorer.isActive ? "opacity-60" : ""}`}
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold flex-shrink-0 ${scorer.isActive ? "text-brand bg-brand/10" : "text-muted-foreground bg-bg-secondary"}`}
              >
                {scorer.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <span className="block font-medium text-foreground">{scorer.displayName}</span>
                <span className="block text-sm text-muted-foreground">
                  Username: {scorer.username}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!scorer.isActive && (
                  <span className="rounded-md bg-error/10 px-2 py-1 text-xs font-semibold text-error">
                    Inactive
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  Created {new Date(scorer.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onResetPin(scorer._id)}
                  className="rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:border-brand/30 hover:text-foreground"
                  title="Reset PIN"
                >
                  Reset PIN
                </button>
                {scorer.isActive ? (
                  <button
                    onClick={() => onDeactivate(scorer._id)}
                    className="rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:border-error/35 hover:text-error"
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => onReactivate(scorer._id)}
                    className="rounded-lg border border-success/35 bg-success-light px-3 py-1.5 text-xs font-semibold text-success transition-all hover:bg-success/20"
                  >
                    Reactivate
                  </button>
                )}
                <button
                  onClick={() => onDelete(scorer._id)}
                  className="rounded-lg border border-error/30 bg-error/10 px-3 py-1.5 text-xs font-semibold text-error transition-all hover:bg-error hover:text-text-inverse"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-bg-secondary py-12 text-center mb-8">
          <span className="text-4xl text-muted-foreground mb-3 opacity-50">🔑</span>
          <p className="text-sm text-muted-foreground">
            No temporary scorers yet. Create one to allow scoring without an account.
          </p>
        </div>
      )}
    </div>
  );
}
