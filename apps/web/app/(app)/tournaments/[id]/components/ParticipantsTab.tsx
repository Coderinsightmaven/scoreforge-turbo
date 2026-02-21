"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import Link from "next/link";
import { Id } from "@repo/convex/dataModel";
import { TabSkeleton } from "@/app/components/TabSkeleton";

export function ParticipantsTab({
  tournamentId,
  bracketId,
  canManage,
  status,
  participantType,
}: {
  tournamentId: string;
  bracketId: string | null;
  canManage: boolean;
  status: string;
  participantType: string;
}): React.ReactNode {
  const participants = useQuery(api.tournamentParticipants.listParticipants, {
    tournamentId: tournamentId as Id<"tournaments">,
    bracketId: bracketId ? (bracketId as Id<"tournamentBrackets">) : undefined,
  });

  if (!participants) {
    return <TabSkeleton />;
  }

  const canAdd = canManage && status === "draft";

  const getParticipantDisplayName = (participant: (typeof participants)[0]) => {
    // For doubles, show full names instead of abbreviated displayName
    if (participant.type === "doubles" && participant.player1Name && participant.player2Name) {
      return `${participant.player1Name} / ${participant.player2Name}`;
    }
    return participant.displayName;
  };

  const getParticipantIcon = () => {
    switch (participantType) {
      case "doubles":
        return "👥";
      case "team":
        return "🏆";
      default:
        return "👤";
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-heading text-foreground font-[family-name:var(--font-display)]">
          Participants ({participants.length})
        </h2>
        {canAdd && (
          <Link
            href={`/tournaments/${tournamentId}/participants/add${bracketId ? `?bracketId=${bracketId}` : ""}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand/30 bg-brand/10 px-4 py-2 text-sm font-medium text-brand transition-all hover:bg-brand hover:text-text-inverse"
          >
            <span>+</span> Add Participant
          </Link>
        )}
      </div>

      {participants.length === 0 ? (
        <div className="surface-panel surface-panel-rail flex flex-col items-center py-16 text-center">
          <span className="text-5xl text-muted-foreground mb-4 opacity-50">
            {getParticipantIcon()}
          </span>
          <p className="text-muted-foreground mb-6">No participants yet</p>
          {canAdd && (
            <Link
              href={`/tournaments/${tournamentId}/participants/add${bracketId ? `?bracketId=${bracketId}` : ""}`}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all bg-brand text-text-inverse hover:bg-brand-hover shadow-sm h-9 px-4 py-2"
            >
              Add Participant
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {participants.map((participant, index) => {
            return (
              <div
                key={participant._id}
                className="flex items-center gap-4 rounded-xl border border-border/70 bg-bg-secondary p-4 animate-fadeInUp"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-sm font-bold text-brand flex-shrink-0">
                  {participant.seed || "-"}
                </div>
                <div className="flex-1">
                  <span className="flex items-center font-medium text-foreground">
                    {participant.nationality && (
                      <span
                        className={`fi fi-${participant.nationality} mr-2 rounded-sm`}
                        style={{ fontSize: "1em" }}
                      />
                    )}
                    {getParticipantDisplayName(participant)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
