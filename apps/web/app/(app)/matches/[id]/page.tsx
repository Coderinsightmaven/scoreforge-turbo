"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import { useState } from "react";
import Link from "next/link";
import { use } from "react";
import { Skeleton, SkeletonScoreboard } from "@/app/components/Skeleton";
import { TennisScoreboard, TennisMatchSetup } from "@/app/components/TennisScoreboard";

export default function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
    match.myRole === "admin" ||
    match.myRole === "scorer";

  return (
    <div className="min-h-screen flex items-start justify-center px-6 py-12">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-accent/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 grid-bg opacity-50" />
      </div>

      <div className="w-full max-w-2xl">
        <Link
          href={`/tournaments/${match.tournamentId}`}
          className="inline-flex items-center gap-2 text-text-secondary hover:text-accent transition-colors mb-8"
        >
          <span>←</span> Back to Tournament
        </Link>

        <div className="relative bg-bg-card border border-border rounded-2xl overflow-hidden">
          {/* Match Header */}
          <div className="flex items-center justify-between p-6 bg-bg-secondary border-b border-border">
            <div className="flex items-center gap-3">
              <span className="font-display text-sm font-semibold tracking-wide text-text-muted">
                Round {match.round}
              </span>
              <span className="text-text-muted">|</span>
              <span className="text-sm text-text-muted">
                Match {match.matchNumber}
              </span>
            </div>
            <MatchStatusBadge status={match.status} />
          </div>

          {/* Scoreboard - Tennis or Generic */}
          {match.sport === "tennis" ? (
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
              canScore && match.status !== "completed" ? (
                <TennisMatchSetup
                  matchId={match._id}
                  participant1Name={match.participant1?.displayName || "Player 1"}
                  participant2Name={match.participant2?.displayName || "Player 2"}
                  matchStatus={match.status}
                  tennisConfig={match.tennisConfig}
                  onSetupComplete={() => {}}
                />
              ) : (
                <div className="p-8 text-center text-text-muted">
                  Tennis match not yet configured
                </div>
              )
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

          {/* Match Actions - For non-tennis or tennis without state */}
          {canScore && (match.sport !== "tennis" || !match.tennisState) && (
            <MatchActions match={match} />
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
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-gold to-accent" />
        </div>
      </div>
    </div>
  );
}

function MatchStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string; pulse: boolean }> = {
    pending: { label: "Pending", className: "text-text-muted bg-white/5", pulse: false },
    scheduled: { label: "Scheduled", className: "text-info bg-info/10", pulse: false },
    live: { label: "Live", className: "text-success bg-success/10", pulse: true },
    completed: { label: "Completed", className: "text-gold bg-gold/10", pulse: false },
    bye: { label: "Bye", className: "text-text-muted bg-white/5", pulse: false },
  };

  const config = statusConfig[status] ?? { label: "Pending", className: "text-text-muted bg-white/5", pulse: false };

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
      console.error(err);
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
            ? "bg-accent/10 border-accent"
            : "bg-bg-secondary border-border"
        }`}
      >
        <div className="text-center">
          {match.participant1?.seed && (
            <span className="block text-xs font-semibold text-accent mb-1">
              #{match.participant1.seed}
            </span>
          )}
          <span className="block font-display text-xl font-bold text-text-primary mb-1">
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
              className="w-10 h-10 flex items-center justify-center text-xl font-bold text-text-secondary bg-bg-elevated border border-border rounded-lg hover:bg-bg-card hover:text-text-primary transition-all disabled:opacity-30"
            >
              −
            </button>
          )}
          <span
            className={`font-display text-5xl font-bold ${
              p1Score > p2Score ? "text-accent" : "text-text-primary"
            }`}
          >
            {p1Score}
          </span>
          {canScore && (
            <button
              onClick={() => handleScoreChange(1, 1)}
              disabled={saving}
              className="w-10 h-10 flex items-center justify-center text-xl font-bold text-text-secondary bg-bg-elevated border border-border rounded-lg hover:bg-accent hover:text-bg-void transition-all"
            >
              +
            </button>
          )}
        </div>
      </div>

      {/* VS */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <span className="font-display text-2xl font-bold text-text-muted">VS</span>
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
            ? "bg-accent/10 border-accent"
            : "bg-bg-secondary border-border"
        }`}
      >
        <div className="text-center">
          {match.participant2?.seed && (
            <span className="block text-xs font-semibold text-accent mb-1">
              #{match.participant2.seed}
            </span>
          )}
          <span className="block font-display text-xl font-bold text-text-primary mb-1">
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
              className="w-10 h-10 flex items-center justify-center text-xl font-bold text-text-secondary bg-bg-elevated border border-border rounded-lg hover:bg-bg-card hover:text-text-primary transition-all disabled:opacity-30"
            >
              −
            </button>
          )}
          <span
            className={`font-display text-5xl font-bold ${
              p2Score > p1Score ? "text-accent" : "text-text-primary"
            }`}
          >
            {p2Score}
          </span>
          {canScore && (
            <button
              onClick={() => handleScoreChange(2, 1)}
              disabled={saving}
              className="w-10 h-10 flex items-center justify-center text-xl font-bold text-text-secondary bg-bg-elevated border border-border rounded-lg hover:bg-accent hover:text-bg-void transition-all"
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
}: {
  match: {
    _id: string;
    status: string;
    participant1?: { _id: string };
    participant2?: { _id: string };
    participant1Score: number;
    participant2Score: number;
  };
}) {
  const startMatch = useMutation(api.matches.startMatch);
  const completeMatch = useMutation(api.matches.completeMatch);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      await startMatch({ matchId: match._id as any });
    } catch (err) {
      console.error(err);
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
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to complete match");
    }
    setLoading(false);
  };

  const canStart =
    (match.status === "pending" || match.status === "scheduled") &&
    match.participant1 &&
    match.participant2;

  const canComplete = match.status === "live";

  return (
    <div className="flex justify-center gap-4 px-6 pb-6">
      {canStart && (
        <button
          onClick={handleStart}
          disabled={loading}
          className="px-6 py-3 font-semibold text-bg-void bg-success rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
        >
          {loading ? "Starting..." : "Start Match"}
        </button>
      )}
      {canComplete && (
        <button
          onClick={handleComplete}
          disabled={loading}
          className="px-6 py-3 font-semibold text-bg-void bg-accent rounded-lg hover:bg-accent-bright transition-all disabled:opacity-50"
        >
          {loading ? "Completing..." : "Complete Match"}
        </button>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex items-start justify-center px-6 py-12">
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-accent/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 grid-bg opacity-50" />
      </div>
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
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-gold to-accent" />
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="text-6xl text-text-muted mb-6 opacity-40">◎</div>
      <h1 className="font-display text-3xl font-bold text-text-primary mb-3">
        Match Not Found
      </h1>
      <p className="text-text-secondary mb-8">
        This match doesn&apos;t exist or you don&apos;t have access.
      </p>
      <Link
        href="/tournaments"
        className="text-accent hover:text-accent-bright transition-colors"
      >
        ← Back to Tournaments
      </Link>
    </div>
  );
}
