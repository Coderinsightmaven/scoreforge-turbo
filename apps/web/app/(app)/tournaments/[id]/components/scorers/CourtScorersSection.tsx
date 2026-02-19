"use client";

import React from "react";

interface CourtScorer {
  _id: string;
  court: string;
  username: string;
  isActive: boolean;
  createdAt: number;
}

interface CourtScorersSectionProps {
  courtScorers: CourtScorer[];
  courtPins: Map<string, string>;
  scorerCode: string | null;
  onShowQR: (scorer: CourtScorer) => void;
  onResetPin: (scorerId: string) => void;
  onDeactivate: (scorerId: string) => void;
  onReactivate: (scorerId: string) => void;
}

export function CourtScorersSection({
  courtScorers,
  courtPins,
  scorerCode,
  onShowQR,
  onResetPin,
  onDeactivate,
  onReactivate,
}: CourtScorersSectionProps): React.ReactNode {
  return (
    <div className="surface-panel surface-panel-rail p-5">
      <div className="mb-4">
        <h2 className="text-heading text-foreground font-[family-name:var(--font-display)]">
          Court Scorers ({courtScorers.length})
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Each court has an auto-generated scorer. Share the QR code or PIN with the person scoring
          that court.
        </p>
      </div>

      {courtScorers.length > 0 ? (
        <div className="flex flex-col gap-2">
          {courtScorers.map((scorer, index) => {
            const pin = courtPins.get(scorer.court);
            return (
              <div
                key={scorer._id}
                className={`flex items-center gap-4 rounded-xl border border-border/70 bg-bg-secondary p-4 animate-fadeInUp ${!scorer.isActive ? "opacity-60" : ""}`}
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                {/* Court icon */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${scorer.isActive ? "bg-brand/10 text-brand" : "bg-bg-secondary text-muted-foreground"}`}
                >
                  {scorer.court.charAt(0).toUpperCase()}
                </div>

                {/* Court info */}
                <div className="flex-1">
                  <span className="block font-medium text-foreground">{scorer.court}</span>
                  <span className="block text-sm text-muted-foreground">
                    Username: {scorer.username}
                  </span>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  {scorer.isActive ? (
                    <span className="rounded-md bg-success-light px-2 py-1 text-xs font-semibold text-success">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-md bg-error/10 px-2 py-1 text-xs font-semibold text-error">
                      Inactive
                    </span>
                  )}
                </div>

                {/* PIN (if available after reset) */}
                {pin && (
                  <span className="font-mono text-sm font-bold tracking-wider text-foreground">
                    {pin}
                  </span>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {scorer.isActive && scorerCode && (
                    <button
                      onClick={() => onShowQR(scorer)}
                      className="rounded-lg border border-brand/30 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand transition-all hover:bg-brand hover:text-text-inverse"
                    >
                      QR Code
                    </button>
                  )}
                  <button
                    onClick={() => onResetPin(scorer._id)}
                    className="rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:border-brand/30 hover:text-foreground"
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
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-bg-secondary py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No courts configured. Add courts in tournament settings to auto-generate court scorers.
          </p>
        </div>
      )}
    </div>
  );
}
