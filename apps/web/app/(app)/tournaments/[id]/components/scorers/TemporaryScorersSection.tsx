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
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-heading text-foreground font-[family-name:var(--font-display)]">
          Temporary Scorers ({tempScorers?.length || 0})
        </h2>
        <button
          onClick={onCreateClick}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-brand bg-brand/10 border border-brand/30 rounded-lg hover:bg-brand hover:text-text-inverse transition-all"
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
              className={`flex items-center gap-4 p-4 bg-card border border-border rounded-lg animate-fadeInUp ${!scorer.isActive ? "opacity-60" : ""}`}
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <div
                className={`w-10 h-10 flex items-center justify-center text-sm font-bold rounded-full flex-shrink-0 ${scorer.isActive ? "text-brand bg-brand/10" : "text-muted-foreground bg-secondary"}`}
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
                  onClick={() => onResetPin(scorer._id)}
                  className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-secondary border border-border rounded-lg hover:text-foreground hover:border-brand/30 transition-all"
                  title="Reset PIN"
                >
                  Reset PIN
                </button>
                {scorer.isActive ? (
                  <button
                    onClick={() => onDeactivate(scorer._id)}
                    className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-secondary border border-border rounded-lg hover:text-red hover:border-red/30 transition-all"
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => onReactivate(scorer._id)}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all"
                  >
                    Reactivate
                  </button>
                )}
                <button
                  onClick={() => onDelete(scorer._id)}
                  className="px-3 py-1.5 text-xs font-semibold text-red bg-red/10 border border-red/20 rounded-lg hover:bg-red hover:text-white transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-12 text-center bg-secondary border border-dashed border-border rounded-lg mb-8">
          <span className="text-4xl text-muted-foreground mb-3 opacity-50">🔑</span>
          <p className="text-sm text-muted-foreground">
            No temporary scorers yet. Create one to allow scoring without an account.
          </p>
        </div>
      )}
    </div>
  );
}
