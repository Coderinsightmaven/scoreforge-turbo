"use client";

import { useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex/dataModel";
import type { TennisState } from "@repo/convex/types/tennis";
import { useState } from "react";
import { getDisplayMessage } from "@/lib/errors";
import { getPointDisplay, getGameStatus } from "@/lib/tennis";
import { toast } from "sonner";

type Participant = {
  _id: string;
  displayName: string;
  seed?: number;
};

type Props = {
  matchId: string;
  participant1?: Participant;
  participant2?: Participant;
  tennisState: TennisState;
  canScore: boolean;
  status: string;
};

export function TennisScoreboard({
  matchId,
  participant1,
  participant2,
  tennisState,
  canScore,
  status,
}: Props): React.ReactNode {
  const scorePoint = useMutation(api.tennis.scoreTennisPoint);
  const setServer = useMutation(api.tennis.setTennisServer);
  const [loading, setLoading] = useState(false);

  const isLive = status === "live";
  const canAct = canScore && isLive && !tennisState.isMatchComplete;

  const handleScorePoint = async (winner: 1 | 2) => {
    setLoading(true);
    try {
      await scorePoint({
        matchId: matchId as Id<"matches">,
        winnerParticipant: winner,
      });
    } catch (err) {
      toast.error(getDisplayMessage(err) || "Failed to score point");
    }
    setLoading(false);
  };

  const handleSetServer = async (server: 1 | 2) => {
    try {
      await setServer({
        matchId: matchId as Id<"matches">,
        servingParticipant: server,
      });
    } catch (err) {
      toast.error(getDisplayMessage(err) || "Failed to set server");
    }
  };

  const p1Name = participant1?.displayName || "Player 1";
  const p2Name = participant2?.displayName || "Player 2";

  const gameStatus = getGameStatus(
    tennisState.isTiebreak ? tennisState.tiebreakPoints : tennisState.currentGamePoints,
    tennisState.isAdScoring,
    tennisState.isTiebreak,
    p1Name,
    p2Name,
    tennisState.servingParticipant
  );

  // Count sets won
  const p1SetsWon = tennisState.sets.filter((s) => (s[0] ?? 0) > (s[1] ?? 0)).length;
  const p2SetsWon = tennisState.sets.filter((s) => (s[1] ?? 0) > (s[0] ?? 0)).length;

  return (
    <div className="p-6 space-y-6">
      {/* Match Format Badge */}
      <div className="flex justify-center gap-2">
        <span className="px-3 py-1 text-xs font-semibold text-brand bg-brand/10 rounded-full">
          Best of {tennisState.setsToWin * 2 - 1}
        </span>
        <span className="px-3 py-1 text-xs font-semibold text-text-muted bg-bg-secondary rounded-full">
          {tennisState.isAdScoring ? "Ad Scoring" : "No-Ad"}
        </span>
      </div>

      {/* Main Scoreboard */}
      {(() => {
        // Determine which sets to display
        const hasCurrentSetGames =
          (tennisState.currentSetGames[0] ?? 0) > 0 || (tennisState.currentSetGames[1] ?? 0) > 0;
        const showCurrentSet = !tennisState.isMatchComplete && hasCurrentSetGames;
        const totalSetColumns = tennisState.sets.length + (showCurrentSet ? 1 : 0);

        // Dynamic grid: 1fr for name, 48px per set column, 64px for game points
        const gridCols = `1fr repeat(${totalSetColumns}, 48px) 64px`;

        return (
          <div className="bg-bg-secondary rounded-lg overflow-hidden border border-border">
            {/* Header Row */}
            <div
              className="gap-1 p-2 bg-bg-secondary text-xs font-semibold text-text-muted"
              style={{ display: "grid", gridTemplateColumns: gridCols }}
            >
              <div className="px-3">Player</div>
              {tennisState.sets.map((_, idx) => (
                <div key={idx} className="text-center">
                  Set {idx + 1}
                </div>
              ))}
              {showCurrentSet && (
                <div className="text-center text-brand">Set {tennisState.sets.length + 1}</div>
              )}
              <div className="text-center">{tennisState.isTiebreak ? "TB" : "Game"}</div>
            </div>

            {/* Player 1 Row */}
            <div
              className={`gap-1 p-2 items-center border-b border-border ${
                tennisState.isMatchComplete && p1SetsWon > p2SetsWon ? "bg-brand/10" : ""
              }`}
              style={{ display: "grid", gridTemplateColumns: gridCols }}
            >
              <div className="flex items-center gap-2 px-3">
                {tennisState.servingParticipant === 1 && (
                  <span className="w-2 h-2 bg-success rounded-full animate-pulse" title="Serving" />
                )}
                <span className="font-semibold text-text-primary truncate">{p1Name}</span>
                {participant1?.seed && (
                  <span className="text-xs text-brand">#{participant1.seed}</span>
                )}
              </div>
              {/* Completed Sets */}
              {tennisState.sets.map((set, idx) => (
                <div
                  key={idx}
                  className={`text-center text-lg font-bold ${
                    (set[0] ?? 0) > (set[1] ?? 0) ? "text-brand" : "text-text-primary"
                  }`}
                >
                  {set[0] ?? 0}
                </div>
              ))}
              {/* Current Set - only if games have been played */}
              {showCurrentSet && (
                <div className="text-center text-lg font-bold text-brand">
                  {tennisState.currentSetGames[0]}
                </div>
              )}
              {/* Current Game/Tiebreak Points */}
              <div className="text-center text-xl font-bold text-brand">
                {getPointDisplay(
                  tennisState.isTiebreak
                    ? tennisState.tiebreakPoints
                    : tennisState.currentGamePoints,
                  0,
                  tennisState.isAdScoring,
                  tennisState.isTiebreak
                )}
              </div>
            </div>

            {/* Player 2 Row */}
            <div
              className={`gap-1 p-2 items-center ${
                tennisState.isMatchComplete && p2SetsWon > p1SetsWon ? "bg-brand/10" : ""
              }`}
              style={{ display: "grid", gridTemplateColumns: gridCols }}
            >
              <div className="flex items-center gap-2 px-3">
                {tennisState.servingParticipant === 2 && (
                  <span className="w-2 h-2 bg-success rounded-full animate-pulse" title="Serving" />
                )}
                <span className="font-semibold text-text-primary truncate">{p2Name}</span>
                {participant2?.seed && (
                  <span className="text-xs text-brand">#{participant2.seed}</span>
                )}
              </div>
              {/* Completed Sets */}
              {tennisState.sets.map((set, idx) => (
                <div
                  key={idx}
                  className={`text-center text-lg font-bold ${
                    (set[1] ?? 0) > (set[0] ?? 0) ? "text-brand" : "text-text-primary"
                  }`}
                >
                  {set[1] ?? 0}
                </div>
              ))}
              {/* Current Set - only if games have been played */}
              {showCurrentSet && (
                <div className="text-center text-lg font-bold text-brand">
                  {tennisState.currentSetGames[1]}
                </div>
              )}
              {/* Current Game/Tiebreak Points */}
              <div className="text-center text-xl font-bold text-brand">
                {getPointDisplay(
                  tennisState.isTiebreak
                    ? tennisState.tiebreakPoints
                    : tennisState.currentGamePoints,
                  1,
                  tennisState.isAdScoring,
                  tennisState.isTiebreak
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Game Status */}
      {gameStatus && !tennisState.isMatchComplete && (
        <div className="text-center">
          <span className="px-4 py-2 text-sm font-semibold text-gold bg-gold/10 rounded-lg">
            {gameStatus}
          </span>
        </div>
      )}

      {/* Match Complete */}
      {tennisState.isMatchComplete && (
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
            Point Won By
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => handleScorePoint(1)}
              disabled={loading}
              className="flex-1 py-4 text-lg font-bold text-text-inverse bg-brand rounded-lg hover:bg-brand-hover transition-all disabled:opacity-50"
            >
              {p1Name.split(" ")[0]}
            </button>
            <button
              onClick={() => handleScorePoint(2)}
              disabled={loading}
              className="flex-1 py-4 text-lg font-bold text-text-inverse bg-brand rounded-lg hover:bg-brand-hover transition-all disabled:opacity-50"
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
                tennisState.servingParticipant === 1
                  ? "bg-success text-white"
                  : "bg-bg-secondary text-text-secondary hover:bg-bg-card"
              }`}
            >
              {p1Name.split(" ")[0]}
            </button>
            <button
              onClick={() => handleSetServer(2)}
              className={`px-3 py-1 text-sm rounded-lg transition-all ${
                tennisState.servingParticipant === 2
                  ? "bg-success text-white"
                  : "bg-bg-secondary text-text-secondary hover:bg-bg-card"
              }`}
            >
              {p2Name.split(" ")[0]}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Tennis Match Setup Form
 * Only asks for first server - scoring rules come from tournament config
 */
export function TennisMatchSetup({
  matchId,
  participant1Name,
  participant2Name,
  onSetupComplete,
  matchStatus,
  tennisConfig,
  tournamentStatus,
}: {
  matchId: string;
  participant1Name: string;
  participant2Name: string;
  onSetupComplete: () => void;
  matchStatus?: string;
  tennisConfig?: {
    isAdScoring: boolean;
    setsToWin: number;
  };
  tournamentStatus?: string;
}): React.ReactNode {
  const initTennisMatch = useMutation(api.tennis.initTennisMatch);
  const startMatch = useMutation(api.matches.startMatch);
  const [firstServer, setFirstServer] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Initialize tennis state (pulls config from tournament)
      await initTennisMatch({
        matchId: matchId as Id<"matches">,
        firstServer,
      });
      // Start the match if it's not already live
      if (matchStatus === "pending" || matchStatus === "scheduled") {
        await startMatch({ matchId: matchId as Id<"matches"> });
      }
      onSetupComplete();
    } catch (err) {
      toast.error(getDisplayMessage(err) || "Failed to initialize match");
    }
    setLoading(false);
  };

  // Don't show setup form if tournament is not active
  if (tournamentStatus && tournamentStatus !== "active") {
    return (
      <div className="p-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-3 bg-gold/10 text-gold rounded-lg">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="font-medium">Tournament must be started before matches can begin</span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-text-primary mb-2">Start Tennis Match</h3>
        <p className="text-sm text-text-secondary">Select who will serve first</p>
      </div>

      {/* Tournament Rules Display */}
      {tennisConfig && (
        <div className="flex justify-center gap-3">
          <span className="px-3 py-1 text-xs font-semibold text-brand bg-brand/10 rounded-full">
            Best of {tennisConfig.setsToWin * 2 - 1}
          </span>
          <span className="px-3 py-1 text-xs font-semibold text-text-muted bg-bg-secondary rounded-full">
            {tennisConfig.isAdScoring ? "Ad Scoring" : "No-Ad"}
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
        className="w-full py-4 font-semibold text-text-inverse bg-brand rounded-lg hover:bg-brand-hover transition-all disabled:opacity-50"
      >
        {loading ? "Starting..." : "Start Match"}
      </button>
    </form>
  );
}
