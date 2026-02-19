"use client";

import { useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useState } from "react";
import { getDisplayMessage } from "@/lib/errors";
import { toast } from "sonner";
import type { Id } from "@repo/convex/dataModel";

export function MatchActions({
  match,
  tournamentStatus,
  startDisabledReason,
}: {
  match: {
    _id: string;
    status: string;
    participant1?: { _id: string };
    participant2?: { _id: string };
    participant1Score: number;
    participant2Score: number;
  };
  tournamentStatus: string;
  startDisabledReason?: string;
}) {
  const startMatch = useMutation(api.matches.startMatch);
  const completeMatch = useMutation(api.matches.completeMatch);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      await startMatch({ matchId: match._id as Id<"matches"> });
    } catch (err) {
      toast.error(getDisplayMessage(err) || "Failed to start match");
    }
    setLoading(false);
  };

  const handleComplete = async () => {
    if (match.participant1Score === match.participant2Score) {
      toast.error("Cannot complete match with tied score in elimination format");
      return;
    }
    setLoading(true);
    try {
      await completeMatch({ matchId: match._id as Id<"matches"> });
    } catch (err) {
      toast.error(getDisplayMessage(err) || "Failed to complete match");
    }
    setLoading(false);
  };

  const canStart =
    (match.status === "pending" || match.status === "scheduled") &&
    match.participant1 &&
    match.participant2 &&
    tournamentStatus === "active";
  const isStartDisabled = loading || !!startDisabledReason;

  const canComplete = match.status === "live";

  return (
    <div className="flex justify-center gap-4 px-6 pb-6">
      {canStart && (
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleStart}
            disabled={isStartDisabled}
            className="px-6 py-3 font-semibold text-text-inverse bg-success rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Starting..." : "Start Match"}
          </button>
          {startDisabledReason && <p className="text-xs text-warning">{startDisabledReason}</p>}
        </div>
      )}
      {canComplete && (
        <button
          onClick={handleComplete}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all bg-brand text-white hover:bg-brand-hover shadow-sm h-9 px-4 py-2 px-6 py-3"
        >
          {loading ? "Completing..." : "Complete Match"}
        </button>
      )}
    </div>
  );
}
