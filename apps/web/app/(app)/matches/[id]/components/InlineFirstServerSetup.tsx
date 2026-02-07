"use client";

import { useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useState } from "react";
import { getDisplayMessage } from "@/lib/errors";
import { toast } from "sonner";
import type { Id } from "@repo/convex/dataModel";

export function InlineFirstServerSetup({
  matchId,
  participant1Name,
  participant2Name,
  tennisConfig,
  matchStatus,
}: {
  matchId: string;
  participant1Name: string;
  participant2Name: string;
  tennisConfig?: { isAdScoring: boolean; setsToWin: number };
  matchStatus?: string;
}) {
  const [selectedServer, setSelectedServer] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  const initTennisMatch = useMutation(api.tennis.initTennisMatch);
  const startMatch = useMutation(api.matches.startMatch);

  const handleStart = async () => {
    setLoading(true);
    try {
      await initTennisMatch({ matchId: matchId as Id<"matches">, firstServer: selectedServer });
      if (matchStatus === "pending" || matchStatus === "scheduled") {
        await startMatch({ matchId: matchId as Id<"matches"> });
      }
    } catch (err) {
      toast.error(getDisplayMessage(err) || "Failed to start match");
    }
    setLoading(false);
  };

  return (
    <div className="p-6 border-t border-border">
      <div className="text-center mb-4">
        <h3 className="text-heading text-text-primary mb-1 font-[family-name:var(--font-display)]">
          Match Setup
        </h3>
        <p className="text-sm text-text-secondary">Configure the match before starting</p>
      </div>

      {/* Config Badges */}
      {tennisConfig && (
        <div className="flex justify-center gap-3 mb-6">
          <span className="px-3 py-1 text-xs font-semibold text-brand bg-brand/10 rounded-full">
            Best of {tennisConfig.setsToWin * 2 - 1}
          </span>
          <span className="px-3 py-1 text-xs font-semibold text-text-muted bg-bg-secondary rounded-full">
            {tennisConfig.isAdScoring ? "Ad Scoring" : "No-Ad"}
          </span>
        </div>
      )}

      {/* First Server Selection */}
      <div className="mb-6">
        <label className="block text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
          First Server
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => setSelectedServer(1)}
            className={`flex-1 flex items-center justify-center gap-3 p-3 rounded-lg border-2 transition-all ${
              selectedServer === 1
                ? "border-success bg-success/10"
                : "border-border bg-bg-secondary hover:border-border-hover"
            }`}
          >
            <div
              className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                selectedServer === 1
                  ? "bg-success/20 text-success"
                  : "bg-bg-secondary text-text-secondary"
              }`}
            >
              {participant1Name.charAt(0).toUpperCase()}
            </div>
            <span
              className={`font-semibold truncate ${selectedServer === 1 ? "text-success" : "text-text-primary"}`}
            >
              {participant1Name}
            </span>
            {selectedServer === 1 && (
              <svg
                className="w-5 h-5 text-success flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>

          <button
            onClick={() => setSelectedServer(2)}
            className={`flex-1 flex items-center justify-center gap-3 p-3 rounded-lg border-2 transition-all ${
              selectedServer === 2
                ? "border-success bg-success/10"
                : "border-border bg-bg-secondary hover:border-border-hover"
            }`}
          >
            <div
              className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                selectedServer === 2
                  ? "bg-success/20 text-success"
                  : "bg-bg-secondary text-text-secondary"
              }`}
            >
              {participant2Name.charAt(0).toUpperCase()}
            </div>
            <span
              className={`font-semibold truncate ${selectedServer === 2 ? "text-success" : "text-text-primary"}`}
            >
              {participant2Name}
            </span>
            {selectedServer === 2 && (
              <svg
                className="w-5 h-5 text-success flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Start Button */}
      <button
        onClick={handleStart}
        disabled={loading}
        className="w-full py-3 font-semibold text-text-inverse bg-success rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
      >
        {loading ? "Starting..." : "Start Tennis Match"}
      </button>
    </div>
  );
}
