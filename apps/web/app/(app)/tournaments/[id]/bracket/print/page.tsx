"use client";

import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex/dataModel";
import { use, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function PrintBracketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.ReactNode {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const bracketIdParam = searchParams.get("bracketId");

  const tournament = useQuery(api.tournaments.getTournament, {
    tournamentId: id as Id<"tournaments">,
  });

  // Get all brackets for this tournament
  const brackets = useQuery(api.tournamentBrackets.listBrackets, {
    tournamentId: id as Id<"tournaments">,
  });

  // Determine which bracket to display
  const selectedBracketId = bracketIdParam || brackets?.[0]?._id;

  // Get bracket details if we have a selected bracket
  const bracketDetails = useQuery(
    api.tournamentBrackets.getBracket,
    selectedBracketId ? { bracketId: selectedBracketId as Id<"tournamentBrackets"> } : "skip"
  );

  // Get bracket matches
  const bracket = useQuery(
    api.tournamentBrackets.getBracketMatches,
    selectedBracketId ? { bracketId: selectedBracketId as Id<"tournamentBrackets"> } : "skip"
  );

  // Auto-print when loaded (optional - user can trigger manually)
  useEffect(() => {
    if (tournament && bracket && bracket.matches.length > 0) {
      // Small delay to ensure rendering is complete
      const timer = setTimeout(() => {
        // Only auto-print if user hasn't interacted
        // window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [tournament, bracket]);

  if (tournament === undefined || brackets === undefined || (selectedBracketId && (bracket === undefined || bracketDetails === undefined))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Loading bracket...</p>
        </div>
      </div>
    );
  }

  if (tournament === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">
            Tournament Not Found
          </h1>
          <Link href="/tournaments" className="text-brand hover:underline">
            Back to Tournaments
          </Link>
        </div>
      </div>
    );
  }

  if (!bracket || bracket.matches.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">
            No Bracket Generated
          </h1>
          <p className="text-text-secondary mb-4">
            {bracketDetails ? `"${bracketDetails.name}" does not have matches yet.` : "This tournament does not have a bracket yet."}
          </p>
          <Link
            href={`/tournaments/${id}`}
            className="text-brand hover:underline"
          >
            Back to Tournament
          </Link>
        </div>
      </div>
    );
  }

  // Group matches by round
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
    if (bracket.format === "round_robin") return `Round ${round}`;
    const remaining = total - round + 1;
    if (remaining === 1) return "Finals";
    if (remaining === 2) return "Semifinals";
    if (remaining === 3) return "Quarterfinals";
    return `Round ${round}`;
  };

  const formatLabels: Record<string, string> = {
    single_elimination: "Single Elimination",
    double_elimination: "Double Elimination",
    round_robin: "Round Robin",
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Print Controls - hidden when printing */}
      <div className="no-print bg-bg-secondary border-b border-border py-4 px-6 sticky top-0 z-50">
        <div className="max-w-[var(--content-max)] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/tournaments/${id}`}
              className="text-sm text-text-secondary hover:text-brand transition-colors"
            >
              &larr; Back to Tournament
            </Link>
            <span className="text-text-muted">|</span>
            <span className="text-sm text-text-primary font-medium">
              {tournament.name}
              {bracketDetails && (
                <span className="text-text-muted"> &bull; {bracketDetails.name}</span>
              )}
            </span>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-text-inverse bg-brand rounded-lg hover:bg-brand-hover transition-all print-button"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z"
              />
            </svg>
            Print Bracket
          </button>
        </div>
      </div>

      {/* Printable Content */}
      <div className="bracket-print-container p-8 print:p-0">
        {/* Header */}
        <div className="text-center mb-8 print:mb-6">
          <h1 className="text-3xl font-bold text-black print:text-2xl">
            {tournament.name}
          </h1>
          {bracketDetails && (
            <h2 className="text-xl font-semibold text-gray-700 mt-1 print:text-lg">
              {bracketDetails.name}
            </h2>
          )}
          <p className="text-gray-600 mt-1 print:text-sm">
            {formatLabels[bracket.format] || bracket.format} &bull;{" "}
            {bracket.matches.length} matches
          </p>
        </div>

        {/* Bracket */}
        <div className="overflow-x-auto print:overflow-visible">
          <div className="flex gap-6 min-w-max justify-center print:gap-3">
            {roundNumbers.map((round) => (
              <div
                key={round}
                className="flex flex-col gap-3 min-w-[200px] print:min-w-[150px]"
              >
                <div className="text-sm font-semibold text-gray-700 pb-2 border-b border-gray-300 text-center print:text-xs print:pb-1">
                  {getRoundName(round, roundNumbers.length)}
                </div>
                <div className="flex flex-col gap-4 flex-1 justify-around print:gap-2">
                  {(rounds[round] || []).map((match) => {
                    // Only show as bye if it's an actual bye match (status === "bye")
                    // Not just because a participant is missing from an incomplete previous round
                    const isByeMatch = match.status === "bye";

                    return (
                      <div
                        key={match._id}
                        className={`flex flex-col bg-white border border-gray-300 rounded overflow-hidden print:break-inside-avoid ${
                          isByeMatch ? "opacity-60" : ""
                        }`}
                      >
                        {/* Participant 1 */}
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 print:py-1.5 print:px-2">
                          <span className="w-5 text-xs text-center text-gray-500 print:text-[10px]">
                            {match.participant1?.seed || "-"}
                          </span>
                          {match.participant1?.isPlaceholder || !match.participant1 ? (
                            <span className="flex-1 bracket-slot-empty print:min-w-[80px]" />
                          ) : (
                            <span
                              className={`flex-1 text-sm truncate print:text-xs ${
                                match.winnerId === match.participant1?._id
                                  ? "font-semibold"
                                  : ""
                              }`}
                            >
                              {match.participant1.displayName}
                            </span>
                          )}
                          {!isByeMatch && match.status === "completed" && (
                            <span className="text-sm font-medium text-gray-700 print:text-xs">
                              {match.participant1Score}
                            </span>
                          )}
                        </div>

                        {/* Participant 2 */}
                        <div className="flex items-center gap-2 px-3 py-2 print:py-1.5 print:px-2">
                          <span className="w-5 text-xs text-center text-gray-500 print:text-[10px]">
                            {match.participant2?.seed || "-"}
                          </span>
                          {match.participant2?.isPlaceholder || !match.participant2 ? (
                            <span className="flex-1 bracket-slot-empty print:min-w-[80px]" />
                          ) : (
                            <span
                              className={`flex-1 text-sm truncate print:text-xs ${
                                match.winnerId === match.participant2?._id
                                  ? "font-semibold"
                                  : ""
                              }`}
                            >
                              {match.participant2.displayName}
                            </span>
                          )}
                          {!isByeMatch && match.status === "completed" && (
                            <span className="text-sm font-medium text-gray-700 print:text-xs">
                              {match.participant2Score}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400 print:mt-4">
          Generated by ScoreForge &bull;{" "}
          {new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>
    </div>
  );
}
