"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import React, { useState, useEffect } from "react";
import { Id } from "@repo/convex/dataModel";
import { toast } from "sonner";
import { getDisplayMessage } from "@/lib/errors";

type SeedAssignment = {
  participantId: string;
  seed: number;
};

export function BlankBracketModal({
  tournamentId,
  onClose,
}: {
  tournamentId: string;
  onClose: () => void;
}): React.ReactNode {
  const generateBlankBracket = useMutation(api.tournaments.generateBlankBracket);
  const participants = useQuery(api.tournamentParticipants.listParticipants, {
    tournamentId: tournamentId as Id<"tournaments">,
  });

  const [bracketSize, setBracketSize] = useState(8);
  const [seedAssignments, setSeedAssignments] = useState<SeedAssignment[]>([]);
  const [generatingBlank, setGeneratingBlank] = useState(false);

  // Filter out placeholder participants (only show real ones)
  const realParticipants = participants?.filter(p => !p.isPlaceholder) || [];

  // Auto-adjust bracket size based on participant count
  useEffect(() => {
    if (realParticipants.length > 0) {
      // Find the smallest bracket size that fits all participants
      const sizes = [4, 8, 16, 32, 64];
      const minSize = sizes.find(s => s >= realParticipants.length) || 64;
      if (minSize > bracketSize) {
        setBracketSize(minSize);
      }
    }
  }, [realParticipants.length, bracketSize]);

  // Get list of participants not yet assigned to a seed
  const unassignedParticipants = realParticipants.filter(
    p => !seedAssignments.some(a => a.participantId === p._id)
  );

  // Get the participant assigned to a specific seed
  const getAssignedParticipant = (seed: number) => {
    const assignment = seedAssignments.find(a => a.seed === seed);
    if (!assignment) return null;
    return realParticipants.find(p => p._id === assignment.participantId);
  };

  const assignToSeed = (participantId: string, seed: number) => {
    // Remove any existing assignment for this participant
    const filtered = seedAssignments.filter(a => a.participantId !== participantId);
    // Remove any existing assignment for this seed
    const withoutSeed = filtered.filter(a => a.seed !== seed);
    // Add new assignment
    setSeedAssignments([...withoutSeed, { participantId, seed }]);
  };

  const removeFromSeed = (seed: number) => {
    setSeedAssignments(seedAssignments.filter(a => a.seed !== seed));
  };

  const handleGenerate = async () => {
    setGeneratingBlank(true);
    try {
      await generateBlankBracket({
        tournamentId: tournamentId as Id<"tournaments">,
        bracketSize,
        seedAssignments: seedAssignments.length > 0
          ? seedAssignments.map(a => ({
              participantId: a.participantId as Id<"tournamentParticipants">,
              seed: a.seed,
            }))
          : undefined,
      });
      onClose();
    } catch (err) {
      toast.error(getDisplayMessage(err) || "Failed to generate blank bracket");
    }
    setGeneratingBlank(false);
  };

  const slots = Array.from({ length: bracketSize }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl animate-scaleIn flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <h3 className="text-heading text-foreground">
            Generate Blank Bracket
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            X
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-sm text-muted-foreground mb-4">
            Create a bracket with placeholder slots.
            {realParticipants.length > 0 && " Assign existing participants to seeds or leave slots empty to fill in later."}
          </p>

          {/* Bracket Size Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Bracket Size
            </label>
            <select
              value={bracketSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                setBracketSize(newSize);
                // Remove assignments for seeds beyond new size
                setSeedAssignments(seedAssignments.filter(a => a.seed <= newSize));
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value={4} disabled={realParticipants.length > 4}>4 participants</option>
              <option value={8} disabled={realParticipants.length > 8}>8 participants</option>
              <option value={16} disabled={realParticipants.length > 16}>16 participants</option>
              <option value={32} disabled={realParticipants.length > 32}>32 participants</option>
              <option value={64} disabled={realParticipants.length > 64}>64 participants</option>
            </select>
          </div>

          {/* Existing Participants Section */}
          {realParticipants.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-foreground mb-3">
                Existing Participants ({realParticipants.length})
              </h4>

              {unassignedParticipants.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Unassigned - click a slot below to assign:</p>
                  <div className="flex flex-wrap gap-2">
                    {unassignedParticipants.map(p => (
                      <div
                        key={p._id}
                        className="px-3 py-1.5 text-sm bg-brand/10 text-brand border border-brand/30 rounded-lg"
                      >
                        {p.displayName}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {seedAssignments.length > 0 && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-2">
                  {seedAssignments.length} participant{seedAssignments.length !== 1 ? 's' : ''} assigned to seeds
                </p>
              )}
            </div>
          )}

          {/* Seed Slots */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">
              Bracket Slots
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto">
              {slots.map(seed => {
                const assigned = getAssignedParticipant(seed);
                return (
                  <div
                    key={seed}
                    className={`relative p-3 border rounded-lg transition-all ${
                      assigned
                        ? "bg-brand/10 border-brand/30"
                        : "bg-secondary border-border hover:border-brand/30"
                    }`}
                  >
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Seed {seed}
                    </div>
                    {assigned ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground truncate">
                          {assigned.displayName}
                        </span>
                        <button
                          onClick={() => removeFromSeed(seed)}
                          className="text-xs text-red hover:text-red-dim flex-shrink-0"
                          title="Remove"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <div>
                        {unassignedParticipants.length > 0 ? (
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                assignToSeed(e.target.value, seed);
                              }
                            }}
                            className="w-full text-sm bg-transparent border-none text-muted-foreground focus:outline-none cursor-pointer"
                          >
                            <option value="">Empty slot</option>
                            {unassignedParticipants.map(p => (
                              <option key={p._id} value={p._id}>
                                {p.displayName}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">
                            Empty slot
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center gap-3 p-6 border-t border-border flex-shrink-0">
          <p className="text-xs text-muted-foreground">
            {seedAssignments.length} of {bracketSize} slots filled
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={generatingBlank}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all bg-brand text-white hover:bg-brand-hover shadow-sm h-9 px-4 py-2"
            >
              {generatingBlank ? "Generating..." : "Generate Bracket"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
