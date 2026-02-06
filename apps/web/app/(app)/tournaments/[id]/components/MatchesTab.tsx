"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import Link from "next/link";
import { Id } from "@repo/convex/dataModel";
import { Skeleton } from "@/app/components/Skeleton";

function TabSkeleton() {
  return (
    <div className="animate-fadeIn">
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex flex-col p-4 bg-card border border-border rounded-lg"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <div className="ml-auto">
                <Skeleton className="h-5 w-16 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-4 w-8 flex-shrink-0" />
              <Skeleton className="h-6 w-8" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MatchesTab({
  tournamentId,
  bracketId,
}: {
  tournamentId: string;
  bracketId: string | null;
}): React.ReactNode {
  const matches = useQuery(api.matches.listMatches, {
    tournamentId: tournamentId as Id<"tournaments">,
    bracketId: bracketId ? (bracketId as Id<"tournamentBrackets">) : undefined,
  });

  if (!matches) {
    return <TabSkeleton />;
  }

  // Filter out TBD matches (missing participants)
  const readyMatches = matches.filter((match) => {
    // Keep bye matches
    if (match.status === "bye") return true;
    // Filter out matches with missing participants
    return match.participant1 && match.participant2;
  });

  if (readyMatches.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center bg-secondary border border-dashed border-border rounded-xl">
        <div className="w-14 h-14 flex items-center justify-center bg-card rounded-xl mb-4">
          <svg className="w-7 h-7 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
        </div>
        <p className="text-muted-foreground">
          Matches will appear when participants are assigned
        </p>
      </div>
    );
  }

  const statusOrder = ["live", "scheduled", "pending", "completed", "bye"];
  const sortedMatches = [...readyMatches].sort((a, b) => {
    const aOrder = statusOrder.indexOf(a.status);
    const bOrder = statusOrder.indexOf(b.status);
    if (aOrder !== bOrder) return aOrder - bOrder;
    if (a.round !== b.round) return a.round - b.round;
    return a.matchNumber - b.matchNumber;
  });

  const matchStatusStyles: Record<string, string> = {
    pending: "text-muted-foreground bg-secondary",
    scheduled: "text-info bg-info/10",
    live: "text-emerald-600 dark:text-emerald-400 bg-success/10",
    completed: "text-gold bg-gold/10",
    bye: "text-muted-foreground bg-secondary",
  };

  // Allow clicking matches in draft mode to set court
  const isClickable = true;

  return (
    <div className="animate-fadeIn">
      <div className="flex flex-col gap-2">
        {sortedMatches.map((match, index) => {
          const content = (
            <>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  Round {match.round}
                </span>
                <span className="text-xs text-muted-foreground">
                  Match {match.matchNumber}
                </span>
                {match.court && (
                  <span className="text-xs text-brand">
                    @ {match.court}
                  </span>
                )}
                <span
                  className={`flex items-center gap-1 ml-auto px-2 py-0.5 text-[10px] font-semibold uppercase rounded ${matchStatusStyles[match.status]}`}
                >
                  {match.status === "live" && (
                    <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
                  )}
                  {match.status}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div
                  className={`flex-1 flex items-center gap-2 ${
                    match.winnerId === match.participant1?._id ? "" : ""
                  }`}
                >
                  <span
                    className={`font-medium ${match.winnerId === match.participant1?._id ? "text-amber-500" : "text-foreground"}`}
                  >
                    {match.participant1?.displayName || "TBD"}
                  </span>
                  <span className="text-base font-bold text-foreground">
                    {match.participant1Score}
                  </span>
                </div>
                <span className="text-xs font-semibold text-muted-foreground flex-shrink-0">
                  vs
                </span>
                <div className="flex-1 flex items-center justify-end gap-2">
                  <span className="text-base font-bold text-foreground">
                    {match.participant2Score}
                  </span>
                  <span
                    className={`font-medium ${match.winnerId === match.participant2?._id ? "text-amber-500" : "text-foreground"}`}
                  >
                    {match.participant2?.displayName || "TBD"}
                  </span>
                </div>
              </div>
              {match.scheduledTime && (
                <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                  {new Date(match.scheduledTime).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </>
          );

          if (isClickable) {
            return (
              <Link
                key={match._id}
                href={`/matches/${match._id}`}
                className="flex flex-col p-4 bg-card border border-border rounded-xl hover:bg-card-hover hover:border-amber-500/30 transition-all animate-fadeInUp"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                {content}
              </Link>
            );
          }

          return (
            <div
              key={match._id}
              className="flex flex-col p-4 bg-card border border-border rounded-xl animate-fadeInUp"
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
