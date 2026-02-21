"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Id } from "@repo/convex/dataModel";
import { getDisplayMessage } from "@/lib/errors";
import { EditableBracket, type Match } from "@/app/components/EditableBracket";
import { TabSkeleton } from "@/app/components/TabSkeleton";
import { getRoundName as getRoundNameUtil } from "@/lib/bracket";
import { formatElapsedTime } from "@/lib/tennis";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

function MatchTimer({ startTimestamp }: { startTimestamp: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <span className="text-[10px] text-muted-foreground font-mono">
      {formatElapsedTime(now - startTimestamp)}
    </span>
  );
}

// Tennis score formatter for bracket display
function formatTennisScoreForBracket(
  tennisState: {
    sets: number[][];
    currentSetGames: number[];
    currentGamePoints: number[];
    isTiebreak: boolean;
    isAdScoring: boolean;
  },
  playerIndex: 0 | 1
): string {
  const parts: string[] = [];
  for (const set of tennisState.sets) {
    parts.push((set[playerIndex] ?? 0).toString());
  }
  parts.push((tennisState.currentSetGames[playerIndex] ?? 0).toString());
  return parts.join(" ");
}

const STARTS_IN_UPDATE_MS = 60_000;
const MINUTE_MS = 60_000;

function formatStartsInLabel(scheduledTime: number, now: number): string {
  const diffMs = scheduledTime - now;
  if (diffMs <= 0) return "Starts now";

  const totalMinutes = Math.ceil(diffMs / MINUTE_MS);
  if (totalMinutes < 60) return `Starts in ${totalMinutes}m`;

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  if (totalHours < 24) {
    return `Starts in ${totalHours}h${remainingMinutes ? ` ${remainingMinutes}m` : ""}`;
  }

  const totalDays = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  return `Starts in ${totalDays}d${remainingHours ? ` ${remainingHours}h` : ""}`;
}

export function BracketTab({
  tournamentId,
  bracketId,
  format,
  status,
  canManage,
}: {
  tournamentId: string;
  bracketId: string | null;
  format: string;
  status: string;
  canManage: boolean;
}): React.ReactNode {
  const [generating, setGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const generateBracketMatches = useMutation(
    api.tournamentBrackets.generateBracketMatchesForBracket
  );
  const generateTournamentBracket = useMutation(api.tournaments.generateBracket);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), STARTS_IN_UPDATE_MS);
    return () => clearInterval(interval);
  }, []);

  // Use bracket-specific query if a bracket is selected, otherwise tournament-level
  const tournamentBracket = useQuery(api.tournaments.getBracket, {
    tournamentId: tournamentId as Id<"tournaments">,
  });
  const selectedBracket = useQuery(
    api.tournamentBrackets.getBracketMatches,
    bracketId ? { bracketId: bracketId as Id<"tournamentBrackets"> } : "skip"
  );

  // Get bracket details for participant count
  const bracketDetails = useQuery(
    api.tournamentBrackets.getBracket,
    bracketId ? { bracketId: bracketId as Id<"tournamentBrackets"> } : "skip"
  );

  // Use selected bracket data if available, otherwise use tournament bracket
  const bracket = bracketId && selectedBracket ? selectedBracket : tournamentBracket;

  const handleGenerateMatches = async () => {
    setGenerating(true);
    setErrorMessage(null);
    try {
      if (bracketId) {
        await generateBracketMatches({ bracketId: bracketId as Id<"tournamentBrackets"> });
      } else {
        await generateTournamentBracket({ tournamentId: tournamentId as Id<"tournaments"> });
      }
    } catch (err) {
      const message = getDisplayMessage(err) || "Failed to generate matches";
      // Make the error message more user-friendly
      if (message.includes("Need at least 2 participants")) {
        setErrorMessage(
          "This bracket needs at least 2 participants to generate matches. Please add more participants first."
        );
      } else {
        setErrorMessage(message);
      }
    }
    setGenerating(false);
  };

  if (!bracket) {
    return <TabSkeleton />;
  }

  if (bracket.matches.length === 0) {
    const participantCount = bracketId && bracketDetails ? bracketDetails.participantCount : 0;
    const canGenerate = canManage && status === "draft" && participantCount >= 2;

    return (
      <div className="surface-panel surface-panel-rail flex flex-col items-center py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-bg-secondary">
          <svg
            className="w-7 h-7 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
            />
          </svg>
        </div>
        {bracketId ? (
          <>
            <p className="text-muted-foreground">
              {participantCount < 2
                ? `Add at least 2 participants to generate matches (${participantCount} added)`
                : "No matches generated yet"}
            </p>
            {canGenerate && (
              <Button
                onClick={handleGenerateMatches}
                disabled={generating}
                variant="brand"
                size="sm"
                className="mt-4"
              >
                {generating ? "Generating..." : "Generate Matches"}
              </Button>
            )}
            <Dialog
              open={Boolean(errorMessage)}
              onOpenChange={(isOpen) => {
                if (!isOpen) {
                  setErrorMessage(null);
                }
              }}
            >
              <DialogContent
                showCloseButton={false}
                className="max-w-md p-0 overflow-hidden text-center"
              >
                <div className="p-6">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
                    <svg
                      className="w-7 h-7 text-error"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                      />
                    </svg>
                  </div>
                  <DialogTitle className="mb-2 text-center">Unable to Generate Matches</DialogTitle>
                  <DialogDescription className="mb-6 text-center">{errorMessage}</DialogDescription>
                  <Button onClick={() => setErrorMessage(null)} variant="brand" className="w-full">
                    Got it
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">
              Bracket will be generated when the tournament starts
            </p>
            {canManage &&
              status === "draft" &&
              (format === "single_elimination" || format === "double_elimination") && (
                <p className="text-sm text-muted-foreground mt-2">
                  Use the &quot;Blank Bracket&quot; button to create a bracket with placeholder
                  slots.
                </p>
              )}
          </>
        )}
      </div>
    );
  }

  // Check if this bracket has placeholder participants (for editable mode)
  const hasPlaceholders = bracket.matches.some(
    (m) => m.participant1?.isPlaceholder || m.participant2?.isPlaceholder
  );

  // Use EditableBracket for draft tournaments with placeholders
  if (status === "draft" && hasPlaceholders && canManage) {
    return (
      <div className="animate-fadeIn">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Click on placeholder slots to fill in participant names.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild className="no-print">
              <Link
                href={`/tournaments/${tournamentId}/bracket/print${bracketId ? `?bracketId=${bracketId}` : ""}`}
              >
                Print
              </Link>
            </Button>
          </div>
        </div>
        <EditableBracket matches={bracket.matches as Match[]} format={format} canEdit={true} />
      </div>
    );
  }

  const rounds = bracket.matches.reduce(
    (acc, match) => {
      const round = match.round;
      if (!acc[round]) acc[round] = [];
      acc[round].push(match);
      return acc;
    },
    {} as Record<number, typeof bracket.matches>
  );

  const roundNumbers = Object.keys(rounds)
    .map(Number)
    .sort((a, b) => a - b);

  const getRoundName = (round: number, total: number) => {
    if (format === "round_robin") return `Round ${round}`;
    return getRoundNameUtil(round, total);
  };

  const getScoreDisplay = (match: (typeof bracket.matches)[0], playerIndex: 0 | 1) => {
    if (bracket.sport === "tennis" && match.tennisState) {
      return formatTennisScoreForBracket(match.tennisState, playerIndex);
    }
    return playerIndex === 0 ? match.participant1Score : match.participant2Score;
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-end mb-4 no-print">
        <Button variant="outline" size="sm" asChild>
          <Link
            href={`/tournaments/${tournamentId}/bracket/print${bracketId ? `?bracketId=${bracketId}` : ""}`}
          >
            Print Bracket
          </Link>
        </Button>
      </div>
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-8 min-w-max">
          {roundNumbers.map((round) => (
            <div key={round} className="flex flex-col gap-3 min-w-[260px]">
              <div className="text-sm font-medium text-muted-foreground pb-2 border-b border-border">
                {getRoundName(round, roundNumbers.length)}
              </div>
              <div className="flex flex-col gap-3 flex-1 justify-around">
                {(rounds[round] || []).map((match) => {
                  // Only show as bye if it's an actual bye match (status === "bye")
                  // Not just because a participant is missing from an incomplete previous round
                  const isByeMatch = match.status === "bye";
                  const isCompletedMatch = match.status === "completed";
                  const isScoreable =
                    !isByeMatch &&
                    match.participant1 &&
                    match.participant2 &&
                    match.status !== "completed";
                  const scheduledTime = match.scheduledTime;
                  const showStartsIn =
                    match.status === "scheduled" && typeof scheduledTime === "number";
                  const startsInLabel = showStartsIn
                    ? formatStartsInLabel(scheduledTime, now)
                    : null;
                  const showCompletedBadge = isCompletedMatch && !isByeMatch;
                  const showLiveTimer =
                    match.status === "live" &&
                    typeof match.tennisState?.matchStartedTimestamp === "number";
                  const showCompletedDuration =
                    isCompletedMatch &&
                    typeof match.tennisState?.matchStartedTimestamp === "number" &&
                    typeof match.completedAt === "number";
                  const showMetaRow = showStartsIn || showCompletedBadge || showLiveTimer;

                  const matchContent = (
                    <>
                      <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-brand/40" />
                      {/* Court badge - top-left */}
                      {match.court && (
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 text-[9px] font-medium text-brand bg-brand/10 rounded z-10">
                          {match.court}
                        </div>
                      )}
                      <div
                        className={`flex items-center gap-2 px-3 py-2 border-b border-border ${
                          match.winnerId === match.participant1?._id ? "bg-brand/10" : ""
                        } ${match.court ? "pt-5" : ""}`}
                      >
                        <span className="w-6 text-xs text-center text-muted-foreground">
                          {match.participant1?.seed || "-"}
                        </span>
                        <span
                          className={`flex-1 text-sm font-medium truncate ${
                            match.winnerId === match.participant1?._id
                              ? "text-brand"
                              : isByeMatch && match.participant1
                                ? "text-brand"
                                : "text-foreground"
                          }`}
                        >
                          {match.participant1?.displayName || (isByeMatch ? "BYE" : "TBD")}
                        </span>
                        {!isByeMatch && (
                          <span className="text-sm font-bold text-foreground min-w-[40px] text-right tracking-wider">
                            {getScoreDisplay(match, 0)}
                          </span>
                        )}
                        {isByeMatch && match.participant1 && (
                          <span className="text-xs font-medium text-success">Advances</span>
                        )}
                      </div>
                      <div
                        className={`flex items-center gap-2 px-3 py-2 ${
                          match.winnerId === match.participant2?._id ? "bg-brand/10" : ""
                        }`}
                      >
                        <span className="w-6 text-xs text-center text-muted-foreground">
                          {match.participant2?.seed || "-"}
                        </span>
                        <span
                          className={`flex-1 text-sm font-medium truncate ${
                            match.winnerId === match.participant2?._id
                              ? "text-brand"
                              : isByeMatch && match.participant2
                                ? "text-brand"
                                : "text-foreground"
                          }`}
                        >
                          {match.participant2?.displayName || (isByeMatch ? "BYE" : "TBD")}
                        </span>
                        {!isByeMatch && (
                          <span className="text-sm font-bold text-foreground min-w-[40px] text-right tracking-wider">
                            {getScoreDisplay(match, 1)}
                          </span>
                        )}
                        {isByeMatch && match.participant2 && (
                          <span className="text-xs font-medium text-success">Advances</span>
                        )}
                      </div>
                      {showMetaRow && (
                        <div className="flex items-center justify-between px-3 pb-2 pt-1">
                          <div>
                            {showStartsIn && (
                              <span className="text-[11px] font-medium text-muted-foreground">
                                {startsInLabel}
                              </span>
                            )}
                            {showLiveTimer && (
                              <MatchTimer
                                startTimestamp={match.tennisState!.matchStartedTimestamp!}
                              />
                            )}
                          </div>
                          <div>
                            {showCompletedBadge && (
                              <span className="rounded bg-success/10 px-1.5 py-0.5 text-[9px] font-medium text-success">
                                Completed
                                {showCompletedDuration && (
                                  <>
                                    {" "}
                                    <span className="font-mono">
                                      {formatElapsedTime(
                                        match.completedAt! -
                                          match.tennisState!.matchStartedTimestamp!
                                      )}
                                    </span>
                                  </>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {isByeMatch && (
                        <span className="absolute top-1 right-1 rounded bg-bg-secondary px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                          BYE
                        </span>
                      )}
                    </>
                  );

                  // Allow clicking matches in draft mode for admin/owner to set court, or when tournament is active
                  const isClickable =
                    isScoreable ||
                    match.status === "live" ||
                    match.status === "completed" ||
                    (status === "draft" && !isByeMatch);

                  if (isClickable) {
                    return (
                      <Link
                        key={match._id}
                        href={`/matches/${match._id}`}
                        className={`relative flex flex-col bg-card border border-border/70 rounded-2xl shadow-card overflow-hidden transition-all hover:border-brand/40 hover:-translate-y-0.5 hover:shadow-md ${
                          match.status === "live"
                            ? "border-success shadow-[0_0_20px_var(--success-glow)]"
                            : match.status === "completed"
                              ? "opacity-80"
                              : ""
                        }`}
                      >
                        {matchContent}
                      </Link>
                    );
                  }

                  // Not clickable (draft mode or bye match)
                  return (
                    <div
                      key={match._id}
                      className={`relative flex flex-col bg-card border border-border/70 rounded-2xl shadow-card overflow-hidden ${
                        isByeMatch ? "opacity-60" : ""
                      }`}
                    >
                      {matchContent}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
