"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useState } from "react";
import Link from "next/link";
import { use } from "react";
import { Skeleton, SkeletonScoreboard } from "@/app/components/Skeleton";
import { TennisScoreboard } from "@/app/components/TennisScoreboard";
import { VolleyballScoreboard } from "@/app/components/VolleyballScoreboard";
import { FullScreenScoring, FirstServerSetup, MatchCompleteScreen } from "@/app/components/FullScreenScoring";

export default function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.ReactNode {
  const { id } = use(params);
  const match = useQuery(api.matches.getMatch, { matchId: id as any });

  if (match === undefined) {
    return <LoadingSkeleton />;
  }

  if (match === null) {
    return <NotFound />;
  }

  const canScore =
    match.myRole === "owner" ||
    match.myRole === "scorer";

  // Check if this is a bye match (only one participant)
  const isByeMatch =
    (match.participant1 && !match.participant2) ||
    (!match.participant1 && match.participant2) ||
    match.status === "bye";

  const byeWinner = isByeMatch
    ? match.participant1 || match.participant2
    : null;

  // Sport detection for full-screen scoring
  const isTennis = match.sport === "tennis";
  const isVolleyball = match.sport === "volleyball";
  const isSportSpecific = isTennis || isVolleyball;
  const needsSetup = isSportSpecific && !match.tennisState && !match.volleyballState;
  const isLive = match.status === "live";
  const isMatchComplete = match.tennisState?.isMatchComplete || match.volleyballState?.isMatchComplete;

  // Full-screen scoring for live tennis/volleyball matches
  if (isLive && !isMatchComplete && (match.tennisState || match.volleyballState) && canScore) {
    return (
      <FullScreenScoring
        matchId={match._id}
        tournamentId={match.tournamentId}
        participant1={match.participant1}
        participant2={match.participant2}
        sport={match.sport as "tennis" | "volleyball"}
        tennisState={match.tennisState}
        volleyballState={match.volleyballState}
        canScore={canScore}
      />
    );
  }

  // Note: First server setup is now shown inline in the match detail view below
  // to allow court editing before starting the match

  // Match complete screen for tennis/volleyball
  if (isMatchComplete && (match.tennisState || match.volleyballState)) {
    const winnerName = match.winnerId === match.participant1?._id
      ? match.participant1?.displayName || "Player 1"
      : match.participant2?.displayName || "Player 2";

    return (
      <MatchCompleteScreen
        tournamentId={match.tournamentId}
        winnerName={winnerName}
        participant1Name={match.participant1?.displayName || "Player 1"}
        participant2Name={match.participant2?.displayName || "Player 2"}
        sport={match.sport as "tennis" | "volleyball"}
        tennisState={match.tennisState}
        volleyballState={match.volleyballState}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-start justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <Link
          href={`/tournaments/${match.tournamentId}`}
          className="inline-flex items-center gap-2 text-text-secondary hover:text-brand transition-colors mb-8"
        >
          <span>←</span> Back to Tournament
        </Link>

        <div className="relative bg-bg-card border border-border rounded-2xl overflow-hidden">
          {/* Match Header */}
          <div className="flex items-center justify-between p-6 bg-bg-secondary border-b border-border">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold tracking-wide text-text-muted">
                Round {match.round}
              </span>
              <span className="text-text-muted">|</span>
              <span className="text-sm text-text-muted">
                Match {match.matchNumber}
              </span>
              {match.court && (
                <>
                  <span className="text-text-muted">|</span>
                  <span className="text-sm text-brand">
                    {match.court}
                  </span>
                </>
              )}
            </div>
            <MatchStatusBadge status={match.status} />
          </div>

          {/* Bye Match Display */}
          {isByeMatch ? (
            <div className="p-12 text-center">
              <div className="mb-6">
                <span className="text-6xl">🎫</span>
              </div>
              <h2 className="text-heading text-text-primary mb-2">
                Bye Match
              </h2>
              <p className="text-text-secondary mb-6">
                {byeWinner?.displayName || "Unknown"} automatically advances to the next round.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-success/10 rounded-lg">
                <span className="w-2 h-2 bg-success rounded-full" />
                <span className="font-semibold text-success">
                  {byeWinner?.displayName} advances
                </span>
              </div>
            </div>
          ) : match.sport === "tennis" ? (
            match.tennisState ? (
              <TennisScoreboard
                matchId={match._id}
                participant1={match.participant1}
                participant2={match.participant2}
                tennisState={match.tennisState}
                canScore={canScore}
                status={match.status}
              />
            ) : (
              <MatchPreview
                participant1={match.participant1}
                participant2={match.participant2}
              />
            )
          ) : match.sport === "volleyball" ? (
            match.volleyballState ? (
              <VolleyballScoreboard
                matchId={match._id}
                participant1={match.participant1}
                participant2={match.participant2}
                volleyballState={match.volleyballState}
                canScore={canScore}
                status={match.status}
              />
            ) : (
              <MatchPreview
                participant1={match.participant1}
                participant2={match.participant2}
              />
            )
          ) : (
            <Scoreboard
              match={match}
              canScore={
                canScore &&
                (match.status === "live" ||
                  match.status === "pending" ||
                  match.status === "scheduled")
              }
            />
          )}

          {/* First Server Setup - For tennis/volleyball matches that need setup */}
          {needsSetup && canScore && !isByeMatch && match.participant1 && match.participant2 &&
            (match.status === "pending" || match.status === "scheduled") &&
            match.tournamentStatus === "active" && (
            <InlineFirstServerSetup
              matchId={match._id}
              participant1Name={match.participant1.displayName}
              participant2Name={match.participant2.displayName}
              sport={match.sport as "tennis" | "volleyball"}
              tennisConfig={match.tennisConfig}
              volleyballConfig={match.volleyballConfig}
              matchStatus={match.status}
            />
          )}

          {/* Draft mode notice */}
          {match.tournamentStatus === "draft" && canScore && !isByeMatch &&
            match.participant1 && match.participant2 &&
            (match.status === "pending" || match.status === "scheduled") && (
            <div className="bg-bg-card border border-border rounded-2xl p-6 text-center">
              <div className="w-12 h-12 mx-auto flex items-center justify-center bg-warning/10 rounded-xl mb-4">
                <svg className="w-6 h-6 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="text-heading text-text-primary mb-2">Tournament Not Started</h3>
              <p className="text-text-secondary text-sm">
                This tournament is still in draft mode. Start the tournament to begin scoring matches.
              </p>
            </div>
          )}

          {/* Match Actions - For generic sports (not tennis or volleyball with state) */}
          {canScore &&
            !isByeMatch &&
            (match.sport !== "tennis" || !match.tennisState) &&
            (match.sport !== "volleyball" || !match.volleyballState) &&
            !needsSetup && (
            <MatchActions match={match} tournamentStatus={match.tournamentStatus} />
          )}

          {/* Match Info */}
          <div className="flex flex-wrap gap-6 p-6 border-t border-border">
            {match.scheduledTime && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Scheduled
                </span>
                <span className="text-sm text-text-primary">
                  {new Date(match.scheduledTime).toLocaleString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
            <CourtInfo
              matchId={match._id}
              court={match.court}
              canEdit={match.myRole === "owner" && match.status !== "completed" && match.status !== "bye"}
              availableCourts={match.availableCourts}
            />
            {match.startedAt && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Started
                </span>
                <span className="text-sm text-text-primary">
                  {new Date(match.startedAt).toLocaleString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
            {match.completedAt && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Completed
                </span>
                <span className="text-sm text-text-primary">
                  {new Date(match.completedAt).toLocaleString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Accent bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand" />
        </div>
      </div>
    </div>
  );
}

function MatchStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string; pulse: boolean }> = {
    pending: { label: "Pending", className: "text-text-muted bg-bg-secondary", pulse: false },
    scheduled: { label: "Scheduled", className: "text-info bg-info/10", pulse: false },
    live: { label: "Live", className: "text-success bg-success/10", pulse: true },
    completed: { label: "Completed", className: "text-gold bg-gold/10", pulse: false },
    bye: { label: "Bye", className: "text-text-muted bg-bg-secondary", pulse: false },
  };

  const config = statusConfig[status] ?? { label: "Pending", className: "text-text-muted bg-bg-secondary", pulse: false };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase rounded ${config.className}`}
    >
      {config.pulse && (
        <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
      )}
      {config.label}
    </span>
  );
}

function Scoreboard({
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
        matchId: match._id as any,
        participant1Score: newP1,
        participant2Score: newP2,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update score");
      setP1Score(match.participant1Score);
      setP2Score(match.participant2Score);
    }
    setSaving(false);
  };

  return (
    <div className="flex items-center justify-center gap-4 p-8">
      {/* Participant 1 */}
      <div
        className={`flex-1 flex flex-col items-center gap-4 p-6 rounded-xl border transition-all ${
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
          <span className="block text-xl font-bold text-text-primary mb-1">
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
        className={`flex-1 flex flex-col items-center gap-4 p-6 rounded-xl border transition-all ${
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
          <span className="block text-xl font-bold text-text-primary mb-1">
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

function MatchActions({
  match,
  tournamentStatus,
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
}) {
  const startMatch = useMutation(api.matches.startMatch);
  const completeMatch = useMutation(api.matches.completeMatch);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      await startMatch({ matchId: match._id as any });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start match");
    }
    setLoading(false);
  };

  const handleComplete = async () => {
    if (match.participant1Score === match.participant2Score) {
      alert("Cannot complete match with tied score in elimination format");
      return;
    }
    setLoading(true);
    try {
      await completeMatch({ matchId: match._id as any });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to complete match");
    }
    setLoading(false);
  };

  const canStart =
    (match.status === "pending" || match.status === "scheduled") &&
    match.participant1 &&
    match.participant2 &&
    tournamentStatus === "active";

  const canComplete = match.status === "live";

  return (
    <div className="flex justify-center gap-4 px-6 pb-6">
      {canStart && (
        <button
          onClick={handleStart}
          disabled={loading}
          className="px-6 py-3 font-semibold text-text-inverse bg-success rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
        >
          {loading ? "Starting..." : "Start Match"}
        </button>
      )}
      {canComplete && (
        <button
          onClick={handleComplete}
          disabled={loading}
          className="btn-primary px-6 py-3"
        >
          {loading ? "Completing..." : "Complete Match"}
        </button>
      )}
    </div>
  );
}

function MatchPreview({
  participant1,
  participant2,
}: {
  participant1?: {
    _id: string;
    displayName: string;
    seed?: number;
  };
  participant2?: {
    _id: string;
    displayName: string;
    seed?: number;
  };
}) {
  return (
    <div className="flex items-center justify-center gap-6 p-8">
      {/* Participant 1 */}
      <div className="flex-1 flex flex-col items-center gap-2 p-6 rounded-xl bg-bg-secondary border border-border">
        {participant1?.seed && (
          <span className="text-xs font-semibold text-brand">
            #{participant1.seed}
          </span>
        )}
        <span className="text-xl font-bold text-text-primary text-center">
          {participant1?.displayName || "TBD"}
        </span>
      </div>

      {/* VS */}
      <div className="flex-shrink-0">
        <span className="text-2xl font-bold text-text-muted">VS</span>
      </div>

      {/* Participant 2 */}
      <div className="flex-1 flex flex-col items-center gap-2 p-6 rounded-xl bg-bg-secondary border border-border">
        {participant2?.seed && (
          <span className="text-xs font-semibold text-brand">
            #{participant2.seed}
          </span>
        )}
        <span className="text-xl font-bold text-text-primary text-center">
          {participant2?.displayName || "TBD"}
        </span>
      </div>
    </div>
  );
}

function InlineFirstServerSetup({
  matchId,
  participant1Name,
  participant2Name,
  sport,
  tennisConfig,
  volleyballConfig,
  matchStatus,
}: {
  matchId: string;
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
}) {
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
      alert(err instanceof Error ? err.message : "Failed to start match");
    }
    setLoading(false);
  };

  return (
    <div className="p-6 border-t border-border">
      <div className="text-center mb-4">
        <h3 className="text-heading text-text-primary mb-1">
          Match Setup
        </h3>
        <p className="text-sm text-text-secondary">
          Configure the match before starting
        </p>
      </div>

      {/* Config Badges */}
      <div className="flex justify-center gap-3 mb-6">
        {isTennis && tennisConfig && (
          <>
            <span className="px-3 py-1 text-xs font-semibold text-brand bg-brand/10 rounded-full">
              Best of {tennisConfig.setsToWin * 2 - 1}
            </span>
            <span className="px-3 py-1 text-xs font-semibold text-text-muted bg-bg-secondary rounded-full">
              {tennisConfig.isAdScoring ? "Ad Scoring" : "No-Ad"}
            </span>
          </>
        )}
        {!isTennis && volleyballConfig && (
          <>
            <span className="px-3 py-1 text-xs font-semibold text-brand bg-brand/10 rounded-full">
              Best of {volleyballConfig.setsToWin * 2 - 1}
            </span>
            <span className="px-3 py-1 text-xs font-semibold text-text-muted bg-bg-secondary rounded-full">
              Sets to {volleyballConfig.pointsPerSet}
            </span>
          </>
        )}
      </div>

      {/* First Server Selection */}
      <div className="mb-6">
        <label className="block text-xs font-medium uppercase tracking-wide text-text-muted mb-2">
          First Server
        </label>
        <div className="flex gap-3">
          <button
            onClick={() => setSelectedServer(1)}
            className={`flex-1 flex items-center justify-center gap-3 p-3 rounded-xl border-2 transition-all ${
              selectedServer === 1
                ? "border-success bg-success/10"
                : "border-border bg-bg-secondary hover:border-border-hover"
            }`}
          >
            <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
              selectedServer === 1 ? "bg-success/20 text-success" : "bg-bg-secondary text-text-secondary"
            }`}>
              {participant1Name.charAt(0).toUpperCase()}
            </div>
            <span className={`font-semibold truncate ${selectedServer === 1 ? "text-success" : "text-text-primary"}`}>
              {participant1Name}
            </span>
            {selectedServer === 1 && (
              <svg className="w-5 h-5 text-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          <button
            onClick={() => setSelectedServer(2)}
            className={`flex-1 flex items-center justify-center gap-3 p-3 rounded-xl border-2 transition-all ${
              selectedServer === 2
                ? "border-success bg-success/10"
                : "border-border bg-bg-secondary hover:border-border-hover"
            }`}
          >
            <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
              selectedServer === 2 ? "bg-success/20 text-success" : "bg-bg-secondary text-text-secondary"
            }`}>
              {participant2Name.charAt(0).toUpperCase()}
            </div>
            <span className={`font-semibold truncate ${selectedServer === 2 ? "text-success" : "text-text-primary"}`}>
              {participant2Name}
            </span>
            {selectedServer === 2 && (
              <svg className="w-5 h-5 text-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Start Button */}
      <button
        onClick={handleStart}
        disabled={loading}
        className="w-full py-3 font-semibold text-text-inverse bg-success rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
      >
        {loading ? "Starting..." : `Start ${isTennis ? "Tennis" : "Volleyball"} Match`}
      </button>
    </div>
  );
}

function CourtInfo({
  matchId,
  court,
  canEdit,
  availableCourts,
}: {
  matchId: string;
  court?: string;
  canEdit: boolean;
  availableCourts?: string[];
}) {
  const updateMatchCourt = useMutation(api.matches.updateMatchCourt);
  const [isEditing, setIsEditing] = useState(false);
  const [courtValue, setCourtValue] = useState(court || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async (value?: string) => {
    const newValue = value !== undefined ? value : courtValue;
    setSaving(true);
    try {
      await updateMatchCourt({
        matchId: matchId as any,
        court: newValue.trim() || undefined,
      });
      setCourtValue(newValue);
      setIsEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update court");
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setCourtValue(court || "");
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Court
        </span>
        {availableCourts && availableCourts.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {availableCourts.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleSave(c)}
                disabled={saving}
                className={`px-2 py-1 text-xs rounded border transition-all ${
                  courtValue === c
                    ? "border-brand bg-brand text-white font-semibold"
                    : "border-border bg-bg-secondary text-text-secondary hover:border-text-muted"
                }`}
              >
                {c}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleSave("")}
              disabled={saving}
              className={`px-2 py-1 text-xs rounded border transition-all ${
                courtValue === ""
                  ? "border-brand bg-brand text-white font-semibold"
                  : "border-border bg-bg-secondary text-text-secondary hover:border-text-muted"
              }`}
            >
              None
            </button>
            <button
              onClick={handleCancel}
              className="px-2 py-1 text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={courtValue}
              onChange={(e) => setCourtValue(e.target.value)}
              placeholder="e.g. Court 1"
              className="w-32 px-2 py-1 text-sm bg-bg-secondary border border-border rounded focus:border-brand focus:outline-none text-text-primary"
              autoFocus
            />
            <button
              onClick={() => handleSave()}
              disabled={saving}
              className="px-2 py-1 text-xs font-medium text-text-inverse bg-brand rounded hover:bg-brand-hover transition-colors disabled:opacity-50"
            >
              {saving ? "..." : "Save"}
            </button>
            <button
              onClick={handleCancel}
              className="px-2 py-1 text-xs font-medium text-text-muted hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
        Court
      </span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-primary">
          {court || "Not assigned"}
        </span>
        {canEdit && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-brand hover:text-brand-hover transition-colors"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-start justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <Skeleton className="w-40 h-5 mb-8" />
        <div className="relative bg-bg-card border border-border rounded-2xl overflow-hidden">
          {/* Match Header */}
          <div className="flex items-center justify-between p-6 bg-bg-secondary border-b border-border">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-2" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-7 w-24 rounded" />
          </div>

          {/* Scoreboard */}
          <SkeletonScoreboard />

          {/* Match Actions */}
          <div className="flex justify-center gap-4 px-6 pb-6">
            <Skeleton className="h-12 w-32 rounded-lg" />
          </div>

          {/* Match Info */}
          <div className="flex flex-wrap gap-6 p-6 border-t border-border">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-32 mt-1" />
            </div>
            <div className="flex flex-col gap-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-20 mt-1" />
            </div>
          </div>

          {/* Accent bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand" />
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="w-16 h-16 flex items-center justify-center bg-bg-card rounded-2xl mb-6">
        <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      </div>
      <h1 className="text-title text-text-primary mb-3">
        Match Not Found
      </h1>
      <p className="text-text-secondary mb-8">
        This match doesn&apos;t exist or you don&apos;t have access.
      </p>
      <Link
        href="/tournaments"
        className="text-brand hover:text-brand-hover transition-colors"
      >
        ← Back to Tournaments
      </Link>
    </div>
  );
}
