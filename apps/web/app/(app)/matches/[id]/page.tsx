"use client";

import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import Link from "next/link";
import { use } from "react";
import { TennisScoreboard } from "@/app/components/TennisScoreboard";
import dynamic from "next/dynamic";
const FullScreenScoring = dynamic(() =>
  import("@/app/components/FullScreenScoring").then((m) => ({ default: m.FullScreenScoring }))
);
const MatchCompleteScreen = dynamic(() =>
  import("@/app/components/FullScreenScoring").then((m) => ({ default: m.MatchCompleteScreen }))
);
import type { Id } from "@repo/convex/dataModel";

import { MatchStatusBadge } from "./components/MatchStatusBadge";
import { Scoreboard } from "./components/Scoreboard";
import { MatchActions } from "./components/MatchActions";
import { MatchPreview } from "./components/MatchPreview";
import { InlineFirstServerSetup } from "./components/InlineFirstServerSetup";
import { CourtInfo } from "./components/CourtInfo";
import { ScheduledTimeInfo } from "./components/ScheduledTimeInfo";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import { NotFound } from "./components/NotFound";

export default function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.ReactNode {
  const { id } = use(params);
  const match = useQuery(api.matches.getMatch, { matchId: id as Id<"matches"> });
  const liveMatches = useQuery(
    api.matches.listMatches,
    match
      ? {
          tournamentId: match.tournamentId as Id<"tournaments">,
          status: "live",
        }
      : "skip"
  );

  if (match === undefined) {
    return <LoadingSkeleton />;
  }

  if (match === null) {
    return <NotFound />;
  }

  const canScore =
    match.myRole === "owner" || match.myRole === "scorer" || match.myRole === "temp_scorer";

  // Check if this is a bye match (only one participant)
  const isByeMatch =
    (match.participant1 && !match.participant2) ||
    (!match.participant1 && match.participant2) ||
    match.status === "bye";
  const isOneOffMatch = match.bracketType === "one_off";

  const byeWinner = isByeMatch ? match.participant1 || match.participant2 : null;

  // Sport detection for full-screen scoring
  const isTennis = match.sport === "tennis";
  const needsSetup = isTennis && !match.tennisState;
  const isLive = match.status === "live";
  const isMatchComplete = match.tennisState?.isMatchComplete;
  const shouldCheckCourt =
    (match.status === "pending" || match.status === "scheduled") && !!match.court;
  const isCourtAvailabilityLoading = shouldCheckCourt && liveMatches === undefined;
  const hasCourtConflict =
    shouldCheckCourt &&
    (liveMatches ?? []).some(
      (liveMatch) => liveMatch._id !== match._id && liveMatch.court === match.court
    );
  const startDisabledReason = isCourtAvailabilityLoading
    ? "Checking court availability..."
    : hasCourtConflict
      ? `Court ${match.court} already has a live match. Finish it before starting this one.`
      : undefined;

  // Full-screen scoring for live tennis matches
  if (isLive && !isMatchComplete && match.tennisState && canScore) {
    return (
      <FullScreenScoring
        matchId={match._id}
        tournamentId={match.tournamentId}
        participant1={match.participant1}
        participant2={match.participant2}
        tennisState={match.tennisState}
        canScore={canScore}
      />
    );
  }

  // Note: First server setup is now shown inline in the match detail view below
  // to allow court editing before starting the match

  // Match complete screen for tennis
  if (isMatchComplete && match.tennisState) {
    const winnerName =
      match.winnerId === match.participant1?._id
        ? match.participant1?.displayName || "Player 1"
        : match.participant2?.displayName || "Player 2";

    return (
      <MatchCompleteScreen
        tournamentId={match.tournamentId}
        winnerName={winnerName}
        participant1Name={match.participant1?.displayName || "Player 1"}
        participant2Name={match.participant2?.displayName || "Player 2"}
        tennisState={match.tennisState}
      />
    );
  }

  return (
    <div className="flex items-start justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <Link
          href={`/tournaments/${match.tournamentId}`}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-brand transition-colors"
        >
          <span>←</span> Back to Tournament
        </Link>

        <div className="surface-panel surface-panel-rail relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-brand/40" />
          <div className="flex items-center justify-between border-b border-border/70 bg-bg-secondary px-6 py-4">
            <div className="flex items-center gap-3">
              {isOneOffMatch ? (
                <span className="text-sm font-semibold tracking-wide text-muted-foreground">
                  One-Off Match
                </span>
              ) : (
                <>
                  <span className="text-sm font-semibold tracking-wide text-muted-foreground">
                    Round {match.round}
                  </span>
                  <span className="text-muted-foreground">|</span>
                </>
              )}
              <span className="text-sm text-muted-foreground">Match {match.matchNumber}</span>
              {match.court && (
                <>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-sm text-brand">{match.court}</span>
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
              <h2 className="text-heading text-text-primary mb-2 font-[family-name:var(--font-display)]">
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
              <MatchPreview participant1={match.participant1} participant2={match.participant2} />
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

          {/* First Server Setup - For tennis matches that need setup */}
          {needsSetup &&
            canScore &&
            !isByeMatch &&
            match.participant1 &&
            match.participant2 &&
            (match.status === "pending" || match.status === "scheduled") &&
            match.tournamentStatus === "active" && (
              <InlineFirstServerSetup
                matchId={match._id}
                participant1Name={match.participant1.displayName}
                participant2Name={match.participant2.displayName}
                tennisConfig={match.tennisConfig}
                matchStatus={match.status}
                startDisabledReason={startDisabledReason}
              />
            )}

          {/* Draft mode notice */}
          {match.tournamentStatus === "draft" &&
            canScore &&
            !isByeMatch &&
            match.participant1 &&
            match.participant2 &&
            (match.status === "pending" || match.status === "scheduled") && (
              <div className="surface-panel p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-warning/30 bg-warning/10">
                  <svg
                    className="w-6 h-6 text-warning"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                    />
                  </svg>
                </div>
                <h3 className="text-heading text-text-primary mb-2 font-[family-name:var(--font-display)]">
                  Tournament Not Started
                </h3>
                <p className="text-text-secondary text-sm">
                  This tournament is still in draft mode. Start the tournament to begin scoring
                  matches.
                </p>
              </div>
            )}

          {/* Match Actions - For generic sports (not tennis with state) */}
          {canScore &&
            !isByeMatch &&
            (match.sport !== "tennis" || !match.tennisState) &&
            !needsSetup && (
              <MatchActions
                match={match}
                tournamentStatus={match.tournamentStatus}
                startDisabledReason={startDisabledReason}
              />
            )}

          {/* Match Info */}
          <div className="flex flex-wrap gap-6 border-t border-border/70 p-6">
            <ScheduledTimeInfo
              matchId={match._id}
              scheduledTime={match.scheduledTime}
              court={match.court}
              canEdit={
                match.myRole === "owner" &&
                !isByeMatch &&
                (match.status === "pending" || match.status === "scheduled")
              }
            />
            <CourtInfo
              matchId={match._id}
              court={match.court}
              canEdit={
                match.myRole === "owner" && match.status !== "completed" && match.status !== "bye"
              }
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
