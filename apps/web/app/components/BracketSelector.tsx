"use client";

import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { useState, useRef, useEffect } from "react";
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
  onSelectBracket: (bracketId: string) => void;
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
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const brackets = useQuery(api.tournamentBrackets.listBrackets, {
    tournamentId: tournamentId as any,
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-select first bracket if none selected
  useEffect(() => {
    const firstBracket = brackets?.[0];
    if (firstBracket && !selectedBracketId) {
      onSelectBracket(firstBracket._id);
    }
  }, [brackets, selectedBracketId, onSelectBracket]);

  if (brackets === undefined) {
    return (
      <div className="bg-bg-secondary border-b border-border">
        <div className="flex items-center gap-3 px-6 py-3 max-w-[var(--content-max)] mx-auto">
          <Skeleton className="h-10 w-48" />
        </div>
      </div>
    );
  }

  // Don't show bracket selector if no brackets exist
  if (brackets.length === 0) {
    if (showManageButton && onManageBrackets) {
      return (
        <div className="bg-bg-secondary border-b border-border">
          <div className="flex items-center justify-between px-6 py-3 max-w-[var(--content-max)] mx-auto">
            <span className="text-sm text-text-muted">No brackets configured</span>
            <button
              onClick={onManageBrackets}
              className="px-3 py-1.5 text-xs font-medium text-brand bg-brand/10 border border-brand/30 rounded-lg hover:bg-brand hover:text-text-inverse transition-all"
            >
              Add Brackets
            </button>
          </div>
        </div>
      );
    }
    return null;
  }

  // Find the selected bracket, or use the first one as fallback
  const selectedBracket = selectedBracketId
    ? brackets.find((b: Bracket) => b._id === selectedBracketId)
    : brackets[0];

  // Don't show selector if only one bracket exists
  if (brackets.length === 1 && !showManageButton) {
    return null;
  }

  const statusIndicator = (status: Bracket["status"]) => {
    switch (status) {
      case "active":
        return (
          <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
        );
      case "completed":
        return <span className="w-2 h-2 bg-gold rounded-full" />;
      default:
        return <span className="w-2 h-2 bg-text-muted/30 rounded-full" />;
    }
  };

  const handleSelect = (bracketId: string) => {
    onSelectBracket(bracketId);
    setIsOpen(false);
  };

  return (
    <div className="bg-bg-secondary border-b border-border">
      <div className="flex items-center gap-3 px-6 py-3 max-w-[var(--content-max)] mx-auto">
      {/* Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2.5 bg-bg-card border border-border rounded-lg hover:border-text-muted transition-all min-w-[200px]"
        >
          <div className="flex items-center gap-2 flex-1">
            {selectedBracket && (
              <>
                {statusIndicator(selectedBracket.status)}
                <span className="text-sm font-medium text-text-primary">
                  {selectedBracket.name}
                </span>
                <span className="text-xs text-text-muted">
                  ({selectedBracket.participantCount})
                </span>
              </>
            )}
          </div>
          <svg
            className={`w-4 h-4 text-text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-full min-w-[280px] bg-bg-card border border-border rounded-lg shadow-xl z-[9999] overflow-hidden">
            {/* Brackets list */}
            {brackets.map((bracket: Bracket, index: number) => (
              <button
                key={bracket._id}
                onClick={() => handleSelect(bracket._id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                  selectedBracketId === bracket._id
                    ? "bg-brand/10 text-brand"
                    : "hover:bg-bg-secondary text-text-primary"
                } ${index < brackets.length - 1 ? "border-b border-border/50" : ""}`}
              >
                <div className="flex items-center gap-2">
                  {statusIndicator(bracket.status)}
                  <span className="text-sm font-medium">{bracket.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">
                    {bracket.participantCount} participants
                  </span>
                  {selectedBracketId === bracket._id && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Manage button */}
      {showManageButton && onManageBrackets && (
        <button
          onClick={onManageBrackets}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-text-muted hover:text-text-primary border border-transparent hover:border-border rounded-lg transition-all"
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
      )}
      </div>
    </div>
  );
}
