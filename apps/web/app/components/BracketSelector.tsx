"use client";

import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { Skeleton } from "./Skeleton";

type Bracket = {
  _id: string;
  name: string;
  status: "draft" | "active" | "completed";
  participantCount: number;
  matchCount: number;
};

type BracketSelectorProps = {
  tournamentId: string;
  selectedBracketId: string | null;
  onSelectBracket: (bracketId: string | null) => void;
  showManageButton?: boolean;
  onManageBrackets?: () => void;
};

export function BracketSelector({
  tournamentId,
  selectedBracketId,
  onSelectBracket,
  showManageButton,
  onManageBrackets,
}: BracketSelectorProps): React.ReactNode {
  const brackets = useQuery(api.tournamentBrackets.listBrackets, {
    tournamentId: tournamentId as any,
  });

  if (brackets === undefined) {
    return (
      <div className="flex items-center gap-2 px-6 py-2 bg-bg-secondary border-b border-border">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
    );
  }

  // Don't show bracket selector if no brackets exist
  if (brackets.length === 0) {
    if (showManageButton && onManageBrackets) {
      return (
        <div className="flex items-center justify-between px-6 py-2 bg-bg-secondary border-b border-border">
          <span className="text-sm text-text-muted">No brackets configured</span>
          <button
            onClick={onManageBrackets}
            className="px-3 py-1.5 text-xs font-medium text-accent bg-accent/10 border border-accent/30 rounded-lg hover:bg-accent hover:text-text-inverse transition-all"
          >
            Add Brackets
          </button>
        </div>
      );
    }
    return null;
  }

  const statusIndicator = (status: Bracket["status"]) => {
    switch (status) {
      case "active":
        return (
          <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
        );
      case "completed":
        return <span className="w-1.5 h-1.5 bg-gold rounded-full" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center gap-2 px-6 py-2 bg-bg-secondary border-b border-border overflow-x-auto">
      {/* All Brackets option */}
      <button
        onClick={() => onSelectBracket(null)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
          selectedBracketId === null
            ? "text-accent bg-accent/10 border border-accent/30"
            : "text-text-secondary bg-bg-elevated border border-border hover:text-text-primary hover:border-text-muted"
        }`}
      >
        All Brackets
        <span className="text-xs text-text-muted">({brackets.length})</span>
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-border" />

      {/* Individual bracket tabs */}
      {brackets.map((bracket: Bracket) => (
        <button
          key={bracket._id}
          onClick={() => onSelectBracket(bracket._id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
            selectedBracketId === bracket._id
              ? "text-accent bg-accent/10 border border-accent/30"
              : "text-text-secondary bg-bg-elevated border border-border hover:text-text-primary hover:border-text-muted"
          }`}
        >
          {statusIndicator(bracket.status)}
          {bracket.name}
          <span className="text-xs text-text-muted">
            ({bracket.participantCount})
          </span>
        </button>
      ))}

      {/* Manage button */}
      {showManageButton && onManageBrackets && (
        <>
          <div className="flex-1" />
          <button
            onClick={onManageBrackets}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
              />
            </svg>
            Manage
          </button>
        </>
      )}
    </div>
  );
}
