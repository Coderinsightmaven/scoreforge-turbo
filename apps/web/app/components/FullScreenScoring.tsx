"use client";

import { useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useState, useCallback } from "react";
import Link from "next/link";

// Check if name is a doubles format (contains " / ")
function isDoublesName(name: string): boolean {
  return name.includes(" / ");
}

// Split doubles name into two player names
function splitDoublesName(name: string): [string, string] {
  const parts = name.split(" / ");
  return [parts[0] ?? "", parts[1] ?? ""];
}

type TennisState = {
  sets: number[][];
  currentSetGames: number[];
  currentGamePoints: number[];
  servingParticipant: number;
  firstServerOfSet: number;
  isAdScoring: boolean;
  setsToWin: number;
  isTiebreak: boolean;
  tiebreakPoints: number[];
  isMatchComplete: boolean;
};

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
  tournamentId: string;
  participant1?: Participant;
  participant2?: Participant;
  sport: "tennis" | "volleyball";
  tennisState?: TennisState;
  volleyballState?: VolleyballState;
  canScore: boolean;
};

/**
 * Convert numeric point to tennis terminology
 */
function getTennisPointDisplay(
  points: number[],
  playerIndex: 0 | 1,
  isAdScoring: boolean,
  isTiebreak: boolean
): string {
  if (isTiebreak) {
    return (points[playerIndex] ?? 0).toString();
  }

  const p1 = points[0] ?? 0;
  const p2 = points[1] ?? 0;
  const myPoints = points[playerIndex] ?? 0;
  const oppPoints = points[1 - playerIndex] ?? 0;

  if (p1 >= 3 && p2 >= 3) {
    if (p1 === p2) return "40";
    if (isAdScoring) {
      if (myPoints > oppPoints) return "Ad";
      return "40";
    }
    return "40";
  }

  const pointNames = ["0", "15", "30", "40"];
  return pointNames[Math.min(myPoints, 3)] || "40";
}

/**
 * Scoring tap zone with flash animation
 */
function ScoringZone({
  playerName,
  onPress,
  disabled,
  isLeft,
}: {
  playerName: string;
  onPress: () => void;
  disabled: boolean;
  isLeft: boolean;
}) {
  const [isFlashing, setIsFlashing] = useState(false);

  const handleClick = useCallback(() => {
    if (disabled) return;
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 300);
    onPress();
  }, [disabled, onPress]);

  // Check if this is a doubles name that needs stacking
  const isDoubles = isDoublesName(playerName);
  const [player1, player2] = isDoubles ? splitDoublesName(playerName) : ["", ""];

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        flex-1 flex items-center justify-center relative overflow-hidden transition-all
        ${isLeft ? "border-r border-border" : "border-l border-border"}
        ${disabled ? "cursor-default" : "cursor-pointer hover:bg-accent/5 active:bg-accent/10"}
      `}
    >
      {/* Flash overlay */}
      <div
        className={`
          absolute inset-0 bg-gold/30 pointer-events-none transition-opacity duration-300
          ${isFlashing ? "opacity-100" : "opacity-0"}
        `}
      />

      <div className="relative flex flex-col items-center gap-2">
        {isDoubles ? (
          // Stacked layout for doubles names
          <div className="flex flex-col items-center gap-1">
            <span className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary">
              {player1}
            </span>
            <span className="text-2xl text-text-muted">/</span>
            <span className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-text-primary">
              {player2}
            </span>
          </div>
        ) : (
          // Single line layout for singles/teams
          <span className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-text-primary">
            {playerName}
          </span>
        )}
        <span className="text-sm uppercase tracking-widest text-text-muted">
          Tap to score
        </span>
      </div>
    </button>
  );
}

export function FullScreenScoring({
  matchId,
  tournamentId,
  participant1,
  participant2,
  sport,
  tennisState,
  volleyballState,
  canScore,
}: Props): React.ReactNode {
  const [isUpdating, setIsUpdating] = useState(false);

  // Mutations
  const scoreTennisPoint = useMutation(api.tennis.scoreTennisPoint);
  const undoTennisPoint = useMutation(api.tennis.undoTennisPoint);
  const scoreVolleyballPoint = useMutation(api.volleyball.scoreVolleyballPoint);
  const undoVolleyballPoint = useMutation(api.volleyball.undoVolleyballPoint);

  const isTennis = sport === "tennis";
  const isVolleyball = sport === "volleyball";
  const isMatchComplete = tennisState?.isMatchComplete || volleyballState?.isMatchComplete;

  // Serving status
  const serving1 = isTennis
    ? tennisState?.servingParticipant === 1
    : volleyballState?.servingTeam === 1;
  const serving2 = isTennis
    ? tennisState?.servingParticipant === 2
    : volleyballState?.servingTeam === 2;

  const handleScorePoint = async (winner: 1 | 2) => {
    if (!canScore || isMatchComplete) return;

    setIsUpdating(true);
    try {
      if (isTennis) {
        await scoreTennisPoint({ matchId: matchId as any, winnerParticipant: winner });
      } else if (isVolleyball) {
        await scoreVolleyballPoint({ matchId: matchId as any, winnerTeam: winner });
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to score point");
    }
    setIsUpdating(false);
  };

  const handleUndo = async () => {
    if (!canScore || isMatchComplete) return;

    const confirmed = window.confirm("Undo last point? This will revert to the previous state.");
    if (!confirmed) return;

    setIsUpdating(true);
    try {
      if (isTennis) {
        await undoTennisPoint({ matchId: matchId as any });
      } else if (isVolleyball) {
        await undoVolleyballPoint({ matchId: matchId as any });
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to undo");
    }
    setIsUpdating(false);
  };

  const p1Name = participant1?.displayName || "Player 1";
  const p2Name = participant2?.displayName || "Player 2";

  // Check if this is a doubles match
  const isDoubles = isDoublesName(p1Name) || isDoublesName(p2Name);

  return (
    <div className="fixed inset-0 flex flex-row bg-bg-primary z-50">
      {/* Player 1 Scoring Zone (Left) */}
      <ScoringZone
        playerName={p1Name}
        onPress={() => handleScorePoint(1)}
        disabled={isUpdating || !canScore || isMatchComplete === true}
        isLeft={true}
      />

      {/* Back Button - Top Left */}
      <Link
        href={`/tournaments/${tournamentId}`}
        className="absolute top-4 left-4 z-20 w-12 h-12 flex items-center justify-center bg-bg-card border border-border rounded-full hover:bg-bg-secondary transition-colors"
      >
        <svg className="w-6 h-6 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </Link>

      {/* Center Scoreboard Overlay */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 px-4 pointer-events-none">
        <div className="w-[400px] max-w-[90vw] pointer-events-auto">

          {/* Tennis Scoreboard - Unified layout for all match types */}
          {isTennis && tennisState && (
            <div className="bg-bg-card border border-border rounded-2xl p-4 shadow-lg">
              {/* Tiebreak indicator */}
              {tennisState.isTiebreak && (
                <div className="flex justify-center mb-3">
                  <span className="px-3 py-1 text-xs font-semibold text-warning bg-warning/20 rounded-full">
                    Tiebreak
                  </span>
                </div>
              )}

              {/* Large Game Points Display */}
              <div className="flex items-center justify-between py-4">
                {/* Player 1 Score */}
                <div className="w-[100px] flex items-center justify-center">
                  <div className="flex items-center">
                    <div className="w-[18px] flex items-center justify-center">
                      {serving1 && <span className="w-3 h-3 bg-success rounded-full" />}
                    </div>
                    <span className="font-display text-6xl font-bold text-accent min-w-[60px] text-center">
                      {getTennisPointDisplay(
                        tennisState.isTiebreak ? tennisState.tiebreakPoints : tennisState.currentGamePoints,
                        0,
                        tennisState.isAdScoring,
                        tennisState.isTiebreak
                      )}
                    </span>
                  </div>
                </div>

                {/* Divider with current games */}
                <div className="px-4 py-2 bg-bg-tertiary rounded-lg">
                  <span className="font-display text-xl font-bold text-text-primary">
                    {tennisState.currentSetGames[0]} - {tennisState.currentSetGames[1]}
                  </span>
                </div>

                {/* Player 2 Score */}
                <div className="w-[100px] flex items-center justify-center">
                  <div className="flex items-center">
                    <div className="w-[18px] flex items-center justify-center">
                      {serving2 && <span className="w-3 h-3 bg-success rounded-full" />}
                    </div>
                    <span className="font-display text-6xl font-bold text-accent min-w-[60px] text-center">
                      {getTennisPointDisplay(
                        tennisState.isTiebreak ? tennisState.tiebreakPoints : tennisState.currentGamePoints,
                        1,
                        tennisState.isAdScoring,
                        tennisState.isTiebreak
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Set scores - simple inline */}
              {tennisState.sets.length > 0 && (
                <p className="text-center text-sm text-text-muted mt-2 tracking-wider">
                  {tennisState.sets.map((set) => `${set[0]}-${set[1]}`).join("  ")}
                </p>
              )}
            </div>
          )}

          {/* Volleyball Scoreboard - Unified layout for all match types */}
          {isVolleyball && volleyballState && (
            <div className="bg-bg-card border border-border rounded-2xl p-4 shadow-lg">
              {/* Large Points Display */}
              <div className="flex items-center justify-between py-4">
                {/* Team 1 Score */}
                <div className="w-[100px] flex items-center justify-center">
                  <div className="flex items-center">
                    <div className="w-[18px] flex items-center justify-center">
                      {serving1 && <span className="w-3 h-3 bg-success rounded-full" />}
                    </div>
                    <span className="font-display text-6xl font-bold text-accent min-w-[60px] text-center">
                      {volleyballState.currentSetPoints[0]}
                    </span>
                  </div>
                </div>

                {/* Divider with set count */}
                <div className="px-4 py-2 bg-bg-tertiary rounded-lg">
                  <span className="font-display text-xl font-bold text-text-primary">
                    Set {volleyballState.sets.length + 1}
                  </span>
                </div>

                {/* Team 2 Score */}
                <div className="w-[100px] flex items-center justify-center">
                  <div className="flex items-center">
                    <div className="w-[18px] flex items-center justify-center">
                      {serving2 && <span className="w-3 h-3 bg-success rounded-full" />}
                    </div>
                    <span className="font-display text-6xl font-bold text-accent min-w-[60px] text-center">
                      {volleyballState.currentSetPoints[1]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Set scores - simple inline */}
              {volleyballState.sets.length > 0 && (
                <p className="text-center text-sm text-text-muted mt-2 tracking-wider">
                  {volleyballState.sets.map((set) => `${set[0]}-${set[1]}`).join("  ")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Player 2 Scoring Zone (Right) */}
      <ScoringZone
        playerName={p2Name}
        onPress={() => handleScorePoint(2)}
        disabled={isUpdating || !canScore || isMatchComplete === true}
        isLeft={false}
      />

      {/* Undo Button - Bottom Center */}
      {canScore && !isMatchComplete && (
        <button
          onClick={handleUndo}
          disabled={isUpdating}
          className="absolute left-1/2 -translate-x-1/2 bottom-4 sm:bottom-6 md:bottom-8 flex items-center gap-2 sm:gap-3 px-4 py-2 sm:px-5 sm:py-3 md:px-6 md:py-4 bg-bg-card border border-border rounded-xl sm:rounded-2xl shadow-md hover:bg-bg-secondary transition-colors disabled:opacity-50 z-20"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
          <span className="font-semibold text-text-primary text-sm sm:text-base md:text-lg">Undo</span>
        </button>
      )}
    </div>
  );
}

/**
 * First Server Selection Screen
 */
export function FirstServerSetup({
  matchId,
  tournamentId,
  participant1Name,
  participant2Name,
  sport,
  tennisConfig,
  volleyballConfig,
  matchStatus,
}: {
  matchId: string;
  tournamentId: string;
  participant1Name: string;
  participant2Name: string;
  sport: "tennis" | "volleyball";
  tennisConfig?: { isAdScoring: boolean; setsToWin: number };
  volleyballConfig?: {
    setsToWin: number;
    pointsPerSet: number;
    pointsPerDecidingSet: number;
  };
  matchStatus?: string;
}): React.ReactNode {
  const [selectedServer, setSelectedServer] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  const initTennisMatch = useMutation(api.tennis.initTennisMatch);
  const initVolleyballMatch = useMutation(api.volleyball.initVolleyballMatch);
  const startMatch = useMutation(api.matches.startMatch);

  const isTennis = sport === "tennis";

  const handleStart = async () => {
    setLoading(true);
    try {
      if (isTennis) {
        await initTennisMatch({ matchId: matchId as any, firstServer: selectedServer });
      } else {
        await initVolleyballMatch({ matchId: matchId as any, firstServer: selectedServer });
      }
      if (matchStatus === "pending" || matchStatus === "scheduled") {
        await startMatch({ matchId: matchId as any });
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to start match");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-bg-primary z-50 p-6">
      {/* Back Button */}
      <Link
        href={`/tournaments/${tournamentId}`}
        className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center bg-bg-card border border-border rounded-full hover:bg-bg-secondary transition-colors"
      >
        <svg className="w-5 h-5 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </Link>

      <div className="max-w-md w-full bg-bg-card border border-border rounded-2xl p-8">
        <div className="text-center mb-6">
          <h2 className="font-display text-2xl font-bold text-text-primary mb-2">
            Select First Server
          </h2>
          <p className="text-sm text-text-secondary">
            Who will serve first in this {isTennis ? "tennis" : "volleyball"} match?
          </p>
        </div>

        {/* Config Badges */}
        {isTennis && tennisConfig && (
          <div className="flex justify-center gap-3 mb-6">
            <span className="px-3 py-1 text-xs font-semibold text-accent bg-accent/10 rounded-full">
              Best of {tennisConfig.setsToWin * 2 - 1}
            </span>
            <span className="px-3 py-1 text-xs font-semibold text-text-muted bg-bg-elevated rounded-full">
              {tennisConfig.isAdScoring ? "Ad Scoring" : "No-Ad"}
            </span>
          </div>
        )}
        {!isTennis && volleyballConfig && (
          <div className="flex justify-center gap-3 mb-6">
            <span className="px-3 py-1 text-xs font-semibold text-accent bg-accent/10 rounded-full">
              Best of {volleyballConfig.setsToWin * 2 - 1}
            </span>
            <span className="px-3 py-1 text-xs font-semibold text-text-muted bg-bg-elevated rounded-full">
              Sets to {volleyballConfig.pointsPerSet}
            </span>
          </div>
        )}

        {/* Server Options */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => setSelectedServer(1)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
              selectedServer === 1
                ? "border-success bg-success/10"
                : "border-border bg-bg-secondary hover:border-text-muted"
            }`}
          >
            <div className={`w-12 h-12 flex items-center justify-center rounded-full ${
              selectedServer === 1 ? "bg-success/20" : "bg-bg-tertiary"
            }`}>
              <span className="text-lg font-bold text-text-secondary">
                {participant1Name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className={`flex-1 text-left font-semibold ${
              selectedServer === 1 ? "text-success" : "text-text-primary"
            }`}>
              {participant1Name}
            </span>
            {selectedServer === 1 && (
              <svg className="w-6 h-6 text-success" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          <button
            onClick={() => setSelectedServer(2)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
              selectedServer === 2
                ? "border-success bg-success/10"
                : "border-border bg-bg-secondary hover:border-text-muted"
            }`}
          >
            <div className={`w-12 h-12 flex items-center justify-center rounded-full ${
              selectedServer === 2 ? "bg-success/20" : "bg-bg-tertiary"
            }`}>
              <span className="text-lg font-bold text-text-secondary">
                {participant2Name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className={`flex-1 text-left font-semibold ${
              selectedServer === 2 ? "text-success" : "text-text-primary"
            }`}>
              {participant2Name}
            </span>
            {selectedServer === 2 && (
              <svg className="w-6 h-6 text-success" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full py-4 font-semibold text-text-inverse bg-success rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
        >
          {loading ? "Starting..." : `Start ${isTennis ? "Tennis" : "Volleyball"} Match`}
        </button>
      </div>
    </div>
  );
}

/**
 * Match Complete Screen
 */
export function MatchCompleteScreen({
  tournamentId,
  winnerName,
  participant1Name,
  participant2Name,
  sport,
  tennisState,
  volleyballState,
}: {
  tournamentId: string;
  winnerName: string;
  participant1Name: string;
  participant2Name: string;
  sport: "tennis" | "volleyball";
  tennisState?: TennisState;
  volleyballState?: VolleyballState;
}): React.ReactNode {
  const isTennis = sport === "tennis";

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-bg-primary z-50 p-6">
      <div className="max-w-md w-full bg-bg-card border border-border-accent rounded-2xl p-8">
        {/* Winner Banner */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <svg className="w-10 h-10 text-accent" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M5.166 2.621v.858c-1.035.148-2.059.33-3.071.543a.75.75 0 00-.584.859 6.753 6.753 0 006.138 5.6 6.73 6.73 0 002.743 1.346A6.707 6.707 0 019.279 15H8.54c-1.036 0-1.875.84-1.875 1.875V19.5h-.75a2.25 2.25 0 00-2.25 2.25c0 .414.336.75.75.75h15.19a.75.75 0 00.75-.75 2.25 2.25 0 00-2.25-2.25h-.75v-2.625c0-1.036-.84-1.875-1.875-1.875h-.739a6.706 6.706 0 00-1.112-3.173 6.73 6.73 0 002.743-1.347 6.753 6.753 0 006.139-5.6.75.75 0 00-.585-.858 47.077 47.077 0 00-3.07-.543V2.62a.75.75 0 00-.658-.744 49.22 49.22 0 00-6.093-.377c-2.063 0-4.096.128-6.093.377a.75.75 0 00-.657.744zm0 2.629c0 1.196.312 2.32.857 3.294A5.266 5.266 0 013.16 5.337a45.6 45.6 0 012.006-.343v.256zm13.5 0v-.256c.674.1 1.343.214 2.006.343a5.265 5.265 0 01-2.863 3.207 6.72 6.72 0 00.857-3.294z" clipRule="evenodd" />
          </svg>
          <span className="font-display text-2xl font-bold text-accent">
            {winnerName} Wins!
          </span>
        </div>

        {/* Final Score Table */}
        <div className="bg-bg-secondary rounded-xl overflow-hidden mb-6">
          {/* Player 1 */}
          <div className="flex items-center px-4 py-3 border-b border-border">
            <span className="flex-1 font-semibold text-text-primary truncate">{participant1Name}</span>
            {isTennis && tennisState?.sets.map((set, idx) => (
              <div key={idx} className="w-10 text-center">
                <span className={`font-display text-lg font-bold ${(set[0] ?? 0) > (set[1] ?? 0) ? "text-accent" : "text-text-muted"}`}>
                  {set[0]}
                </span>
              </div>
            ))}
            {!isTennis && volleyballState?.sets.map((set, idx) => (
              <div key={idx} className="w-10 text-center">
                <span className={`font-display text-lg font-bold ${(set[0] ?? 0) > (set[1] ?? 0) ? "text-accent" : "text-text-muted"}`}>
                  {set[0]}
                </span>
              </div>
            ))}
          </div>
          {/* Player 2 */}
          <div className="flex items-center px-4 py-3">
            <span className="flex-1 font-semibold text-text-primary truncate">{participant2Name}</span>
            {isTennis && tennisState?.sets.map((set, idx) => (
              <div key={idx} className="w-10 text-center">
                <span className={`font-display text-lg font-bold ${(set[1] ?? 0) > (set[0] ?? 0) ? "text-accent" : "text-text-muted"}`}>
                  {set[1]}
                </span>
              </div>
            ))}
            {!isTennis && volleyballState?.sets.map((set, idx) => (
              <div key={idx} className="w-10 text-center">
                <span className={`font-display text-lg font-bold ${(set[1] ?? 0) > (set[0] ?? 0) ? "text-accent" : "text-text-muted"}`}>
                  {set[1]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Back to Tournament Button */}
        <Link
          href={`/tournaments/${tournamentId}`}
          className="block w-full py-4 text-center font-semibold text-text-inverse bg-accent rounded-xl hover:bg-accent-bright transition-all"
        >
          Back to Tournament
        </Link>
      </div>
    </div>
  );
}
