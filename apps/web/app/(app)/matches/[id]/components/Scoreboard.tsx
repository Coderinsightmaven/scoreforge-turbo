"use client";

import { useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useState } from "react";
import { getDisplayMessage } from "@/lib/errors";
import { toast } from "sonner";
import type { Id } from "@repo/convex/dataModel";

export function Scoreboard({
  match,
  canScore,
}: {
  match: {
    _id: string;
    participant1?: {
      _id: string;
      displayName: string;
      seed?: number;
      wins: number;
      losses: number;
    };
    participant2?: {
      _id: string;
      displayName: string;
      seed?: number;
      wins: number;
      losses: number;
    };
    participant1Score: number;
    participant2Score: number;
    winnerId?: string;
    status: string;
  };
  canScore: boolean;
}) {
  const updateScore = useMutation(api.matches.updateScore);
  const [p1Score, setP1Score] = useState(match.participant1Score);
  const [p2Score, setP2Score] = useState(match.participant2Score);
  const [saving, setSaving] = useState(false);

  const handleScoreChange = async (participant: 1 | 2, delta: number) => {
    const newP1 = participant === 1 ? Math.max(0, p1Score + delta) : p1Score;
    const newP2 = participant === 2 ? Math.max(0, p2Score + delta) : p2Score;

    setP1Score(newP1);
    setP2Score(newP2);

    setSaving(true);
    try {
      await updateScore({
        matchId: match._id as Id<"matches">,
        participant1Score: newP1,
        participant2Score: newP2,
      });
    } catch (err) {
      toast.error(getDisplayMessage(err) || "Failed to update score");
      setP1Score(match.participant1Score);
      setP2Score(match.participant2Score);
    }
    setSaving(false);
  };

  return (
    <div className="flex items-center justify-center gap-4 p-8">
      {/* Participant 1 */}
      <div
        className={`flex-1 flex flex-col items-center gap-4 p-6 rounded-lg border transition-all ${
          match.winnerId === match.participant1?._id
            ? "bg-brand/10 border-brand"
            : "bg-bg-secondary border-border"
        }`}
      >
        <div className="text-center">
          {match.participant1?.seed && (
            <span className="block text-xs font-semibold text-brand mb-1">
              #{match.participant1.seed}
            </span>
          )}
          <span className="block text-xl font-bold text-text-primary mb-1 font-[family-name:var(--font-display)]">
            {match.participant1?.displayName || "TBD"}
          </span>
          {match.participant1 && (
            <span className="block text-xs text-text-muted">
              {match.participant1.wins}W - {match.participant1.losses}L
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canScore && (
            <button
              onClick={() => handleScoreChange(1, -1)}
              disabled={saving || p1Score === 0}
              className="w-10 h-10 flex items-center justify-center text-xl font-bold text-text-secondary bg-bg-secondary border border-border rounded-lg hover:bg-bg-card hover:text-text-primary transition-all disabled:opacity-30"
            >
              −
            </button>
          )}
          <span
            className={`text-5xl font-bold ${
              p1Score > p2Score ? "text-brand" : "text-text-primary"
            }`}
          >
            {p1Score}
          </span>
          {canScore && (
            <button
              onClick={() => handleScoreChange(1, 1)}
              disabled={saving}
              className="w-10 h-10 flex items-center justify-center text-xl font-bold text-text-secondary bg-bg-secondary border border-border rounded-lg hover:bg-brand hover:text-text-inverse transition-all"
            >
              +
            </button>
          )}
        </div>
      </div>

      {/* VS */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <span className="text-2xl font-bold text-text-muted">VS</span>
        {match.status === "live" && (
          <span className="px-2 py-1 text-[10px] font-bold tracking-wider text-white bg-success rounded animate-pulse">
            LIVE
          </span>
        )}
      </div>

      {/* Participant 2 */}
      <div
        className={`flex-1 flex flex-col items-center gap-4 p-6 rounded-lg border transition-all ${
          match.winnerId === match.participant2?._id
            ? "bg-brand/10 border-brand"
            : "bg-bg-secondary border-border"
        }`}
      >
        <div className="text-center">
          {match.participant2?.seed && (
            <span className="block text-xs font-semibold text-brand mb-1">
              #{match.participant2.seed}
            </span>
          )}
          <span className="block text-xl font-bold text-text-primary mb-1 font-[family-name:var(--font-display)]">
            {match.participant2?.displayName || "TBD"}
          </span>
          {match.participant2 && (
            <span className="block text-xs text-text-muted">
              {match.participant2.wins}W - {match.participant2.losses}L
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canScore && (
            <button
              onClick={() => handleScoreChange(2, -1)}
              disabled={saving || p2Score === 0}
              className="w-10 h-10 flex items-center justify-center text-xl font-bold text-text-secondary bg-bg-secondary border border-border rounded-lg hover:bg-bg-card hover:text-text-primary transition-all disabled:opacity-30"
            >
              −
            </button>
          )}
          <span
            className={`text-5xl font-bold ${
              p2Score > p1Score ? "text-brand" : "text-text-primary"
            }`}
          >
            {p2Score}
          </span>
          {canScore && (
            <button
              onClick={() => handleScoreChange(2, 1)}
              disabled={saving}
              className="w-10 h-10 flex items-center justify-center text-xl font-bold text-text-secondary bg-bg-secondary border border-border rounded-lg hover:bg-brand hover:text-text-inverse transition-all"
            >
              +
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
