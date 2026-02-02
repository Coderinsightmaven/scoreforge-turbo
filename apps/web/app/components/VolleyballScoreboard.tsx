"use client";

import { useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useState } from "react";

type VolleyballState = {
  sets: number[][];
  currentSetPoints: number[];
  servingTeam: number;
  setsToWin: number;
  pointsPerSet: number;
  pointsPerDecidingSet: number;
  minLeadToWin: number;
  currentSetNumber: number;
  isMatchComplete: boolean;
};

type Participant = {
  _id: string;
  displayName: string;
  seed?: number;
};

type Props = {
  matchId: string;
  participant1?: Participant;
  participant2?: Participant;
  volleyballState: VolleyballState;
  canScore: boolean;
  status: string;
};

/**
 * Check if this is the deciding set
 */
function isDecidingSet(sets: number[][], setsToWin: number): boolean {
  let p1Sets = 0;
  let p2Sets = 0;
  for (const set of sets) {
    if ((set[0] ?? 0) > (set[1] ?? 0)) p1Sets++;
    else if ((set[1] ?? 0) > (set[0] ?? 0)) p2Sets++;
  }
  return p1Sets === setsToWin - 1 && p2Sets === setsToWin - 1;
}

export function VolleyballScoreboard({
  matchId,
  participant1,
  participant2,
  volleyballState,
  canScore,
  status,
}: Props): React.ReactNode {
  const scorePoint = useMutation(api.volleyball.scoreVolleyballPoint);
  const setServer = useMutation(api.volleyball.setVolleyballServer);
  const adjustScore = useMutation(api.volleyball.adjustVolleyballScore);
  const [loading, setLoading] = useState(false);

  const isLive = status === "live";
  const canAct = canScore && isLive && !volleyballState.isMatchComplete;

  const handleScorePoint = async (winner: 1 | 2) => {
    setLoading(true);
    try {
      await scorePoint({
        matchId: matchId as any,
        winnerTeam: winner,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to score point");
    }
    setLoading(false);
  };

  const handleSetServer = async (server: 1 | 2) => {
    try {
      await setServer({
        matchId: matchId as any,
        servingTeam: server,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to set server");
    }
  };

  const handleAdjustScore = async (team: 1 | 2, adjustment: number) => {
    try {
      await adjustScore({
        matchId: matchId as any,
        team,
        adjustment,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to adjust score");
    }
  };

  const p1Name = participant1?.displayName || "Team 1";
  const p2Name = participant2?.displayName || "Team 2";

  // Count sets won
  const p1SetsWon = volleyballState.sets.filter((s) => (s[0] ?? 0) > (s[1] ?? 0)).length;
  const p2SetsWon = volleyballState.sets.filter((s) => (s[1] ?? 0) > (s[0] ?? 0)).length;

  // Determine target points for current set
  const isDeciding = isDecidingSet(volleyballState.sets, volleyballState.setsToWin);
  const targetPoints = isDeciding
    ? volleyballState.pointsPerDecidingSet
    : volleyballState.pointsPerSet;

  return (
    <div className="p-6 space-y-6">
      {/* Match Format Badge */}
      <div className="flex justify-center gap-2">
        <span className="px-3 py-1 text-xs font-semibold text-brand bg-brand/10 rounded-full">
          Best of {volleyballState.setsToWin * 2 - 1}
        </span>
        <span className="px-3 py-1 text-xs font-semibold text-text-muted bg-bg-secondary rounded-full">
          First to {targetPoints}
        </span>
        {isDeciding && !volleyballState.isMatchComplete && (
          <span className="px-3 py-1 text-xs font-semibold text-gold bg-gold/10 rounded-full">
            Deciding Set
          </span>
        )}
      </div>

      {/* Main Scoreboard */}
      {(() => {
        // Determine which sets to display - only show current set if points have been scored
        const hasCurrentSetPoints = (volleyballState.currentSetPoints[0] ?? 0) > 0 || (volleyballState.currentSetPoints[1] ?? 0) > 0;
        const showCurrentSet = !volleyballState.isMatchComplete && hasCurrentSetPoints;
        const totalSetColumns = volleyballState.sets.length + (showCurrentSet ? 1 : 0);

        // Dynamic grid: 1fr for name, 48px per set column, 80px for points
        const gridCols = `1fr repeat(${totalSetColumns}, 48px) 80px`;

        return (
          <div className="bg-bg-secondary rounded-xl overflow-hidden border border-border">
            {/* Header Row */}
            <div
              className="gap-1 p-2 bg-bg-secondary text-xs font-semibold text-text-muted"
              style={{ display: 'grid', gridTemplateColumns: gridCols }}
            >
              <div className="px-3">Team</div>
              {volleyballState.sets.map((_, idx) => (
                <div key={idx} className="text-center">
                  Set {idx + 1}
                </div>
              ))}
              {showCurrentSet && (
                <div className="text-center text-brand">
                  Set {volleyballState.sets.length + 1}
                </div>
              )}
              <div className="text-center">Points</div>
            </div>

            {/* Team 1 Row */}
            <div
              className={`gap-1 p-2 items-center border-b border-border ${
                volleyballState.isMatchComplete && p1SetsWon > p2SetsWon
                  ? "bg-brand/10"
                  : ""
              }`}
              style={{ display: 'grid', gridTemplateColumns: gridCols }}
            >
              <div className="flex items-center gap-2 px-3">
                {volleyballState.servingTeam === 1 && (
                  <span className="w-2 h-2 bg-success rounded-full animate-pulse" title="Serving" />
                )}
                <span className="font-semibold text-text-primary truncate">{p1Name}</span>
                {participant1?.seed && (
                  <span className="text-xs text-brand">#{participant1.seed}</span>
                )}
              </div>
              {/* Completed Sets */}
              {volleyballState.sets.map((set, idx) => (
                <div
                  key={idx}
                  className={`text-center text-lg font-bold ${
                    (set[0] ?? 0) > (set[1] ?? 0) ? "text-brand" : "text-text-primary"
                  }`}
                >
                  {set[0] ?? 0}
                </div>
              ))}
              {/* Current Set - only if points have been scored */}
              {showCurrentSet && (
                <div className="text-center text-lg font-bold text-brand">
                  -
                </div>
              )}
              {/* Current Points */}
              <div className="text-center text-2xl font-bold text-brand">
                {volleyballState.currentSetPoints[0]}
              </div>
            </div>

            {/* Team 2 Row */}
            <div
              className={`gap-1 p-2 items-center ${
                volleyballState.isMatchComplete && p2SetsWon > p1SetsWon
                  ? "bg-brand/10"
                  : ""
              }`}
              style={{ display: 'grid', gridTemplateColumns: gridCols }}
            >
              <div className="flex items-center gap-2 px-3">
                {volleyballState.servingTeam === 2 && (
                  <span className="w-2 h-2 bg-success rounded-full animate-pulse" title="Serving" />
                )}
                <span className="font-semibold text-text-primary truncate">{p2Name}</span>
                {participant2?.seed && (
                  <span className="text-xs text-brand">#{participant2.seed}</span>
                )}
              </div>
              {/* Completed Sets */}
              {volleyballState.sets.map((set, idx) => (
                <div
                  key={idx}
                  className={`text-center text-lg font-bold ${
                    (set[1] ?? 0) > (set[0] ?? 0) ? "text-brand" : "text-text-primary"
                  }`}
                >
                  {set[1] ?? 0}
                </div>
              ))}
              {/* Current Set - only if points have been scored */}
              {showCurrentSet && (
                <div className="text-center text-lg font-bold text-brand">
                  -
                </div>
              )}
              {/* Current Points */}
              <div className="text-center text-2xl font-bold text-brand">
                {volleyballState.currentSetPoints[1]}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Set Score Summary */}
      <div className="flex justify-center gap-4 text-lg">
        <span className={`font-bold ${p1SetsWon > p2SetsWon ? "text-brand" : "text-text-primary"}`}>
          {p1SetsWon}
        </span>
        <span className="text-text-muted">-</span>
        <span className={`font-bold ${p2SetsWon > p1SetsWon ? "text-brand" : "text-text-primary"}`}>
          {p2SetsWon}
        </span>
      </div>

      {/* Match Complete */}
      {volleyballState.isMatchComplete && (
        <div className="text-center">
          <span className="px-4 py-2 text-lg font-bold text-brand bg-brand/10 rounded-lg">
            Match Complete - {p1SetsWon > p2SetsWon ? p1Name : p2Name} Wins!
          </span>
        </div>
      )}

      {/* Scoring Controls */}
      {canAct && (
        <div className="space-y-4">
          <div className="text-center text-xs text-text-muted uppercase tracking-wide">
            Point Scored By
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => handleScorePoint(1)}
              disabled={loading}
              className="flex-1 py-4 text-lg font-bold text-text-inverse bg-brand rounded-xl hover:bg-brand-hover transition-all disabled:opacity-50"
            >
              {p1Name.split(" ")[0]}
            </button>
            <button
              onClick={() => handleScorePoint(2)}
              disabled={loading}
              className="flex-1 py-4 text-lg font-bold text-text-inverse bg-brand rounded-xl hover:bg-brand-hover transition-all disabled:opacity-50"
            >
              {p2Name.split(" ")[0]}
            </button>
          </div>

          {/* Server Toggle */}
          <div className="flex items-center justify-center gap-4 pt-4 border-t border-border">
            <span className="text-xs text-text-muted">Server:</span>
            <button
              onClick={() => handleSetServer(1)}
              className={`px-3 py-1 text-sm rounded-lg transition-all ${
                volleyballState.servingTeam === 1
                  ? "bg-success text-white"
                  : "bg-bg-secondary text-text-secondary hover:bg-bg-card"
              }`}
            >
              {p1Name.split(" ")[0]}
            </button>
            <button
              onClick={() => handleSetServer(2)}
              className={`px-3 py-1 text-sm rounded-lg transition-all ${
                volleyballState.servingTeam === 2
                  ? "bg-success text-white"
                  : "bg-bg-secondary text-text-secondary hover:bg-bg-card"
              }`}
            >
              {p2Name.split(" ")[0]}
            </button>
          </div>

          {/* Score Adjustment (for corrections) */}
          <div className="flex items-center justify-center gap-2 pt-2 text-xs text-text-muted">
            <span>Adjust:</span>
            <button
              onClick={() => handleAdjustScore(1, -1)}
              className="px-2 py-1 bg-bg-secondary rounded hover:bg-bg-card"
            >
              {p1Name.split(" ")[0]} -1
            </button>
            <button
              onClick={() => handleAdjustScore(2, -1)}
              className="px-2 py-1 bg-bg-secondary rounded hover:bg-bg-card"
            >
              {p2Name.split(" ")[0]} -1
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Volleyball Match Setup Form
 * Only asks for first server - scoring rules come from tournament config
 */
export function VolleyballMatchSetup({
  matchId,
  participant1Name,
  participant2Name,
  onSetupComplete,
  matchStatus,
  volleyballConfig,
  tournamentStatus,
}: {
  matchId: string;
  participant1Name: string;
  participant2Name: string;
  onSetupComplete: () => void;
  matchStatus?: string;
  volleyballConfig?: {
    setsToWin: number;
    pointsPerSet: number;
    pointsPerDecidingSet: number;
    minLeadToWin: number;
  };
  tournamentStatus?: string;
}): React.ReactNode {
  const initVolleyballMatch = useMutation(api.volleyball.initVolleyballMatch);
  const startMatch = useMutation(api.matches.startMatch);
  const [firstServer, setFirstServer] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Initialize volleyball state (pulls config from tournament)
      await initVolleyballMatch({
        matchId: matchId as any,
        firstServer,
      });
      // Start the match if it's not already live
      if (matchStatus === "pending" || matchStatus === "scheduled") {
        await startMatch({ matchId: matchId as any });
      }
      onSetupComplete();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to initialize match");
    }
    setLoading(false);
  };

  // Don't show setup form if tournament is not active
  if (tournamentStatus && tournamentStatus !== "active") {
    return (
      <div className="p-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-3 bg-gold/10 text-gold rounded-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-medium">Tournament must be started before matches can begin</span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-text-primary mb-2">
          Start Volleyball Match
        </h3>
        <p className="text-sm text-text-secondary">
          Select who will serve first
        </p>
      </div>

      {/* Tournament Rules Display */}
      {volleyballConfig && (
        <div className="flex justify-center gap-3">
          <span className="px-3 py-1 text-xs font-semibold text-brand bg-brand/10 rounded-full">
            Best of {volleyballConfig.setsToWin * 2 - 1}
          </span>
          <span className="px-3 py-1 text-xs font-semibold text-text-muted bg-bg-secondary rounded-full">
            Sets to {volleyballConfig.pointsPerSet}
          </span>
          <span className="px-3 py-1 text-xs font-semibold text-text-muted bg-bg-secondary rounded-full">
            Deciding: {volleyballConfig.pointsPerDecidingSet}
          </span>
        </div>
      )}

      {/* First Server */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-primary text-center">
          Who will serve first?
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setFirstServer(1)}
            className={`flex-1 py-4 rounded-lg border font-semibold transition-all ${
              firstServer === 1
                ? "bg-success/10 border-success text-success"
                : "bg-bg-secondary border-border text-text-secondary hover:border-text-muted"
            }`}
          >
            {participant1Name}
          </button>
          <button
            type="button"
            onClick={() => setFirstServer(2)}
            className={`flex-1 py-4 rounded-lg border font-semibold transition-all ${
              firstServer === 2
                ? "bg-success/10 border-success text-success"
                : "bg-bg-secondary border-border text-text-secondary hover:border-text-muted"
            }`}
          >
            {participant2Name}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 font-semibold text-text-inverse bg-brand rounded-xl hover:bg-brand-hover transition-all disabled:opacity-50"
      >
        {loading ? "Starting..." : "Start Match"}
      </button>
    </form>
  );
}
