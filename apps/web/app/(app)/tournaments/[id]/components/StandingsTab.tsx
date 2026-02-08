"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
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

export function StandingsTab({
  tournamentId,
  bracketId,
}: {
  tournamentId: string;
  bracketId: string | null;
}): React.ReactNode {
  const standings = useQuery(api.tournaments.getStandings, {
    tournamentId: tournamentId as Id<"tournaments">,
    bracketId: bracketId ? (bracketId as Id<"tournamentBrackets">) : undefined,
  });

  if (!standings) {
    return <TabSkeleton />;
  }

  if (standings.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center bg-secondary border border-dashed border-border rounded-xl">
        <span className="text-5xl text-muted-foreground mb-4 opacity-50">📊</span>
        <p className="text-muted-foreground">Standings will appear when matches are played</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_40px_40px_40px_50px_60px] gap-2 p-4 text-xs font-semibold tracking-wide uppercase text-muted-foreground bg-secondary border-b border-border">
          <span className="text-center">#</span>
          <span>Participant</span>
          <span className="text-center">W</span>
          <span className="text-center">L</span>
          <span className="text-center">D</span>
          <span className="text-center">PTS</span>
          <span className="text-right">+/-</span>
        </div>
        {standings.map((participant, index) => (
          <div
            key={participant._id}
            className="grid grid-cols-[40px_1fr_40px_40px_40px_50px_60px] gap-2 p-4 text-sm text-foreground border-b border-border last:border-b-0 animate-fadeIn"
            style={{ animationDelay: `${index * 0.03}s` }}
          >
            <span
              className={`text-center font-bold ${
                index === 0
                  ? "text-gold"
                  : index === 1
                    ? "text-[#c0c0c0]"
                    : index === 2
                      ? "text-[#cd7f32]"
                      : ""
              }`}
            >
              {index + 1}
            </span>
            <span className="font-medium truncate">{participant.displayName}</span>
            <span className="text-center text-success">{participant.wins}</span>
            <span className="text-center text-red">{participant.losses}</span>
            <span className="text-center text-muted-foreground">{participant.draws}</span>
            <span className="text-center font-bold text-brand">{participant.points}</span>
            <span
              className={`text-right ${
                participant.pointsFor - participant.pointsAgainst > 0
                  ? "text-success"
                  : participant.pointsFor - participant.pointsAgainst < 0
                    ? "text-red"
                    : ""
              }`}
            >
              {participant.pointsFor - participant.pointsAgainst > 0 ? "+" : ""}
              {participant.pointsFor - participant.pointsAgainst}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
