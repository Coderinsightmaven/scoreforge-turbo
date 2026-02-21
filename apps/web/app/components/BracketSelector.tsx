"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex/dataModel";
import { useState, useRef, useEffect } from "react";
import { Skeleton } from "./Skeleton";
import { toast } from "sonner";
import type { TournamentFormat, ParticipantType } from "@/app/lib/constants";

type Bracket = {
  _id: string;
  name: string;
  status: "draft" | "active" | "completed";
  participantCount: number;
  matchCount: number;
};

type BracketSelectorProps = {
  tournamentId: string;
  selectedBracketId: string | null;
  onSelectBracket: (bracketId: string) => void;
  showAddButton?: boolean;
};

export function BracketSelector({
  tournamentId,
  selectedBracketId,
  onSelectBracket,
  showAddButton,
}: BracketSelectorProps): React.ReactNode {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const createFormRef = useRef<HTMLDivElement>(null);
  const createBracket = useMutation(api.tournamentBrackets.createBracket);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newFormat, setNewFormat] = useState<TournamentFormat | "">("");
  const [newParticipantType, setNewParticipantType] = useState<ParticipantType | "">("");
  const [newGender, setNewGender] = useState<"mens" | "womens" | "mixed" | "">("");
  const [newMaxParticipants, setNewMaxParticipants] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const brackets = useQuery(api.tournamentBrackets.listBrackets, {
    tournamentId: tournamentId as Id<"tournaments">,
  });

  // Close create form when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (createFormRef.current && !createFormRef.current.contains(event.target as Node)) {
        setShowCreateForm(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-select first bracket if none selected
  useEffect(() => {
    const firstBracket = brackets?.[0];
    if (firstBracket && !selectedBracketId) {
      onSelectBracket(firstBracket._id);
    }
  }, [brackets, selectedBracketId, onSelectBracket]);

  if (brackets === undefined) {
    return (
      <div className="surface-panel p-3">
        <div className="flex items-center gap-3 px-3">
          <Skeleton className="h-10 w-48" />
        </div>
      </div>
    );
  }

  const resetCreateForm = () => {
    setNewName("");
    setNewFormat("");
    setNewParticipantType("");
    setNewGender("");
    setNewMaxParticipants("");
    setShowCreateForm(false);
  };

  const handleCreateBracket = async () => {
    if (!newName.trim()) return;
    const parsedMax = parseInt(newMaxParticipants, 10);
    if (!parsedMax || parsedMax < 2 || parsedMax > 256) {
      toast.error("Participant count must be between 2 and 256");
      return;
    }
    setIsSubmitting(true);
    try {
      const id = await createBracket({
        tournamentId: tournamentId as Id<"tournaments">,
        name: newName.trim(),
        format: newFormat || undefined,
        participantType: newParticipantType || undefined,
        gender: newGender || undefined,
        maxParticipants: parsedMax,
      });
      onSelectBracket(id);
      resetCreateForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create bracket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusIndicator = (status: Bracket["status"]) => {
    switch (status) {
      case "active":
        return <span className="w-2 h-2 bg-success rounded-full animate-pulse" />;
      case "completed":
        return <span className="w-2 h-2 bg-gold rounded-full" />;
      default:
        return <span className="w-2 h-2 bg-text-muted/30 rounded-full" />;
    }
  };

  const createFormPopover = showCreateForm && (
    <div
      ref={createFormRef}
      className="absolute top-full right-0 mt-2 w-80 bg-bg-card border border-border rounded-xl shadow-xl z-50 p-4"
    >
      <h3 className="text-sm font-semibold text-text-primary mb-3">New Bracket</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Name <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g., Men's Singles"
            className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border rounded-lg focus:outline-none focus:border-brand text-text-primary placeholder:text-text-muted"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Format</label>
          <select
            value={newFormat}
            onChange={(e) => setNewFormat(e.target.value as TournamentFormat | "")}
            className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border rounded-lg focus:outline-none focus:border-brand text-text-primary"
          >
            <option value="">Use tournament default</option>
            <option value="single_elimination">Single Elimination</option>
            <option value="double_elimination">Double Elimination</option>
            <option value="round_robin">Round Robin</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Participant Type
          </label>
          <select
            value={newParticipantType}
            onChange={(e) => {
              const val = e.target.value as ParticipantType | "";
              setNewParticipantType(val);
              if (val !== "doubles" && val !== "team" && newGender === "mixed") {
                setNewGender("");
              }
            }}
            className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border rounded-lg focus:outline-none focus:border-brand text-text-primary"
          >
            <option value="">Use tournament default</option>
            <option value="individual">Individual</option>
            <option value="doubles">Doubles</option>
            <option value="team">Team</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Gender Category <span className="text-error">*</span>
          </label>
          <select
            value={newGender}
            onChange={(e) => setNewGender(e.target.value as "mens" | "womens" | "mixed" | "")}
            className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border rounded-lg focus:outline-none focus:border-brand text-text-primary"
          >
            <option value="">Select...</option>
            <option value="mens">Men&apos;s</option>
            <option value="womens">Women&apos;s</option>
            {(newParticipantType === "doubles" || newParticipantType === "team") && (
              <option value="mixed">Mixed</option>
            )}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Participant Count <span className="text-error">*</span>
          </label>
          <input
            type="number"
            min="2"
            max="256"
            value={newMaxParticipants}
            onChange={(e) => setNewMaxParticipants(e.target.value)}
            placeholder="e.g., 8, 16, 32"
            className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border rounded-lg focus:outline-none focus:border-brand text-text-primary placeholder:text-text-muted"
          />
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleCreateBracket}
          disabled={!newName.trim() || !newMaxParticipants || !newGender || isSubmitting}
          className="flex-1 px-3 py-2 text-sm font-medium bg-brand text-black rounded-lg hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Creating..." : "Create"}
        </button>
        <button
          onClick={resetCreateForm}
          className="px-3 py-2 text-sm font-medium bg-bg-secondary border border-border rounded-lg text-text-primary hover:bg-bg-tertiary transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  if (brackets.length === 0) {
    if (showAddButton) {
      return (
        <div className="surface-panel p-3">
          <div className="relative flex items-center justify-between px-3">
            <span className="text-sm text-text-muted">No brackets configured</span>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-3 py-1.5 text-xs font-medium text-brand bg-brand/10 border border-brand/30 rounded-lg hover:bg-brand hover:text-text-inverse transition-all"
            >
              Add Bracket
            </button>
            {createFormPopover}
          </div>
        </div>
      );
    }
    return null;
  }

  // Don't show selector if only one bracket exists and no add button
  if (brackets.length === 1 && !showAddButton) {
    return null;
  }

  return (
    <div className="surface-panel p-3">
      <div className="flex flex-wrap items-center gap-2 px-3">
        {brackets.map((bracket: Bracket) => (
          <button
            key={bracket._id}
            onClick={() => onSelectBracket(bracket._id)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
              selectedBracketId === bracket._id
                ? "border-brand/40 bg-brand/10 text-brand"
                : "border-transparent text-text-muted hover:bg-bg-secondary hover:text-text-primary"
            }`}
          >
            {statusIndicator(bracket.status)}
            <span>{bracket.name}</span>
            <span
              className={`text-xs font-normal ${selectedBracketId === bracket._id ? "text-brand/60" : "text-text-muted"}`}
            >
              ({bracket.participantCount})
            </span>
          </button>
        ))}

        {/* Add bracket button */}
        {showAddButton && (
          <div className="relative">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center justify-center w-9 h-9 text-text-muted hover:text-brand border border-transparent hover:border-brand/30 hover:bg-brand/10 rounded-xl transition-all"
              title="Add bracket"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            {createFormPopover}
          </div>
        )}
      </div>
    </div>
  );
}
