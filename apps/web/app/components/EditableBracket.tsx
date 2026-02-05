"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex/dataModel";
import { getDisplayMessage } from "@/lib/errors";
import { toast } from "sonner";

type Participant = {
  _id: string;
  displayName: string;
  seed?: number;
  isPlaceholder?: boolean;
};

type TennisState = {
  sets: [number, number][];
  currentSetGames: [number, number];
  currentGamePoints: [number, number];
  isMatchComplete: boolean;
  isTiebreak?: boolean;
  tiebreakPoints?: [number, number];
};

type Match = {
  _id: string;
  round: number;
  matchNumber: number;
  bracket?: string;
  bracketPosition?: number;
  participant1?: Participant;
  participant2?: Participant;
  participant1Score: number;
  participant2Score: number;
  winnerId?: string;
  status: string;
  scheduledTime?: number;
  court?: string;
  nextMatchId?: string;
  tennisState?: TennisState;
};

type EditableBracketProps = {
  matches: Match[];
  format: string;
  canEdit: boolean;
  onParticipantUpdate?: (participantId: string, newName: string) => void;
};

export type { Match };

export function EditableBracket({
  matches,
  format,
  canEdit,
  onParticipantUpdate,
}: EditableBracketProps): React.ReactNode {
  const updatePlaceholderName = useMutation(api.tournamentParticipants.updatePlaceholderName);
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingSlot && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingSlot]);

  const handleSlotClick = (participant: Participant) => {
    if (!canEdit) return;
    setEditingSlot(participant._id);
    setEditValue(participant.isPlaceholder ? "" : participant.displayName);
  };

  const handleSave = async () => {
    if (!editingSlot || !editValue.trim()) {
      setEditingSlot(null);
      return;
    }

    setSaving(true);
    try {
      await updatePlaceholderName({
        participantId: editingSlot as Id<"tournamentParticipants">,
        displayName: editValue.trim(),
      });
      onParticipantUpdate?.(editingSlot, editValue.trim());
    } catch (err) {
      toast.error(getDisplayMessage(err) || "Failed to update participant name");
    }
    setSaving(false);
    setEditingSlot(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditingSlot(null);
    }
  };

  // Group matches by round
  const rounds = matches.reduce(
    (acc, match) => {
      const round = match.round;
      if (!acc[round]) acc[round] = [];
      acc[round].push(match);
      return acc;
    },
    {} as Record<number, Match[]>
  );

  const roundNumbers = Object.keys(rounds)
    .map(Number)
    .sort((a, b) => a - b);

  const getRoundName = (round: number, total: number) => {
    if (format === "round_robin") return `Round ${round}`;
    const remaining = total - round + 1;
    if (remaining === 1) return "Finals";
    if (remaining === 2) return "Semifinals";
    if (remaining === 3) return "Quarterfinals";
    return `Round ${round}`;
  };

  // Get scores for a participant (tennis)
  const getParticipantScores = (match: Match, participantIndex: 0 | 1) => {
    if (match.tennisState) {
      const { sets, currentSetGames, isMatchComplete } = match.tennisState;
      const scores: { games: number; isCurrentSet: boolean }[] = [];

      // Add completed sets
      sets.forEach((set) => {
        scores.push({ games: set[participantIndex], isCurrentSet: false });
      });

      // Add current set if match is in progress (not complete and has games played)
      if (!isMatchComplete && (currentSetGames[0] > 0 || currentSetGames[1] > 0)) {
        scores.push({ games: currentSetGames[participantIndex], isCurrentSet: true });
      }

      return scores;
    }

    return [];
  };

  const renderParticipantSlot = (participant: Participant | undefined, slotNumber: 1 | 2, match: Match) => {
    if (!participant) {
      return (
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="w-6 text-xs text-center text-text-muted">-</span>
          <span className="flex-1 text-sm text-text-muted italic">TBD</span>
        </div>
      );
    }

    const isEditing = editingSlot === participant._id;
    const isWinner = match.winnerId === participant._id;
    const isPlaceholder = participant.isPlaceholder;
    const participantIndex = slotNumber === 1 ? 0 : 1;
    const scores = getParticipantScores(match, participantIndex as 0 | 1);
    const hasScores = scores.length > 0;

    if (isEditing) {
      return (
        <div className={`flex items-center gap-2 px-3 py-2 ${slotNumber === 1 ? "border-b border-border" : ""}`}>
          <span className="w-6 text-xs text-center text-text-muted">
            {participant.seed || "-"}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            placeholder="Enter name..."
            disabled={saving}
            className="flex-1 text-sm font-medium bg-bg-secondary border border-brand/30 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      );
    }

    return (
      <div
        onClick={() => canEdit && isPlaceholder && handleSlotClick(participant)}
        className={`flex items-center gap-2 px-3 py-2 ${
          slotNumber === 1 ? "border-b border-border" : ""
        } ${isWinner ? "bg-brand/10" : ""} ${
          canEdit && isPlaceholder
            ? "cursor-pointer hover:bg-brand/5 transition-colors"
            : ""
        }`}
      >
        <span className="w-6 text-xs text-center text-text-muted">
          {participant.seed || "-"}
        </span>
        <span
          className={`flex-1 text-sm font-medium truncate ${
            isWinner
              ? "text-brand"
              : isPlaceholder
                ? "text-text-muted italic"
                : "text-text-primary"
          }`}
        >
          {participant.displayName}
          {canEdit && isPlaceholder && (
            <span className="ml-2 text-xs text-brand opacity-0 group-hover:opacity-100 transition-opacity">
              (click to edit)
            </span>
          )}
        </span>
        {hasScores && (
          <div className="flex items-center gap-1">
            {scores.map((score, idx) => (
              <span
                key={idx}
                className={`w-5 text-center text-xs font-semibold ${
                  score.isCurrentSet
                    ? "text-brand"
                    : isWinner
                      ? "text-brand"
                      : "text-text-secondary"
                }`}
              >
                {score.games}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center bg-bg-secondary border border-dashed border-border rounded-2xl">
        <div className="w-14 h-14 flex items-center justify-center bg-bg-card rounded-2xl mb-4">
          <svg className="w-7 h-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
          </svg>
        </div>
        <p className="text-text-secondary">
          No bracket generated yet
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn print:animate-none">
      <div className="overflow-x-auto pb-4 print:overflow-visible">
        <div className="flex gap-8 min-w-max print:gap-4">
          {roundNumbers.map((round) => (
            <div key={round} className="flex flex-col gap-3 min-w-[260px] print:min-w-[200px]">
              <div className="text-sm font-medium text-text-muted pb-2 border-b border-border print:text-xs">
                {getRoundName(round, roundNumbers.length)}
              </div>
              <div className="flex flex-col gap-3 flex-1 justify-around print:gap-2">
                {(rounds[round] || []).map((match) => {
                  // Only show as bye if it's an actual bye match (status === "bye")
                  // Not just because a participant is missing from an incomplete previous round
                  const isByeMatch = match.status === "bye";

                  return (
                    <div
                      key={match._id}
                      className={`group relative flex flex-col bg-bg-card border border-border rounded-lg overflow-hidden print:break-inside-avoid ${
                        isByeMatch ? "opacity-60" : ""
                      }`}
                    >
                      {match.court && (
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 text-[9px] font-medium text-brand bg-brand/10 rounded z-10 print:hidden">
                          {match.court}
                        </div>
                      )}
                      {renderParticipantSlot(match.participant1, 1, match)}
                      {renderParticipantSlot(match.participant2, 2, match)}
                      {isByeMatch && (
                        <span className="absolute top-1 right-1 px-1.5 py-0.5 text-[9px] font-medium text-text-muted bg-bg-secondary rounded print:hidden">
                          BYE
                        </span>
                      )}
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

/**
 * PrintableBracket - A print-optimized version of the bracket
 * Shows empty slots with lines for handwriting
 */
export function PrintableBracket({
  matches,
  format,
  title,
}: {
  matches: Match[];
  format: string;
  title?: string;
}): React.ReactNode {
  // Group matches by round
  const rounds = matches.reduce(
    (acc, match) => {
      const round = match.round;
      if (!acc[round]) acc[round] = [];
      acc[round].push(match);
      return acc;
    },
    {} as Record<number, Match[]>
  );

  const roundNumbers = Object.keys(rounds)
    .map(Number)
    .sort((a, b) => a - b);

  const getRoundName = (round: number, total: number) => {
    if (format === "round_robin") return `Round ${round}`;
    const remaining = total - round + 1;
    if (remaining === 1) return "Finals";
    if (remaining === 2) return "Semifinals";
    if (remaining === 3) return "Quarterfinals";
    return `Round ${round}`;
  };

  const renderSlot = (participant: Participant | undefined, slotNumber: 1 | 2) => {
    const isPlaceholder = !participant || participant.isPlaceholder;

    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 ${
          slotNumber === 1 ? "border-b border-border" : ""
        }`}
      >
        <span className="w-6 text-xs text-center text-text-muted print:text-[10px]">
          {participant?.seed || slotNumber}
        </span>
        <span
          className={`flex-1 text-sm truncate print:text-xs ${
            isPlaceholder
              ? "bracket-slot-empty"
              : "text-text-primary font-medium"
          }`}
        >
          {isPlaceholder ? "" : participant?.displayName}
        </span>
      </div>
    );
  };

  return (
    <div className="bracket-print-container bg-white p-8">
      {title && (
        <h1 className="text-2xl font-bold text-center mb-8 print:text-xl">
          {title}
        </h1>
      )}
      <div className="flex gap-6 justify-center print:gap-3">
        {roundNumbers.map((round) => (
          <div key={round} className="flex flex-col gap-3 min-w-[180px] print:min-w-[140px]">
            <div className="text-sm font-medium text-text-muted pb-2 border-b border-border text-center print:text-xs">
              {getRoundName(round, roundNumbers.length)}
            </div>
            <div className="flex flex-col gap-4 flex-1 justify-around print:gap-2">
              {(rounds[round] || []).map((match) => (
                <div
                  key={match._id}
                  className="flex flex-col bg-white border border-gray-300 rounded overflow-hidden print:break-inside-avoid"
                >
                  {renderSlot(match.participant1, 1)}
                  {renderSlot(match.participant2, 2)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
