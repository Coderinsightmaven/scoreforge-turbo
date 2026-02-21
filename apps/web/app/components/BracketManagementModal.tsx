"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import { Id } from "@repo/convex/dataModel";
import { toast } from "sonner";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FORMAT_LABELS,
  PARTICIPANT_TYPE_LABELS,
  type TournamentFormat,
  type ParticipantType,
} from "@/app/lib/constants";

type BracketManagementModalProps = {
  tournamentId: string;
  onClose: () => void;
};

type BracketItem = {
  _id: Id<"tournamentBrackets">;
  name: string;
  status: "draft" | "active" | "completed";
  participantCount: number;
  matchCount: number;
  maxParticipants?: number;
  format?: TournamentFormat;
  participantType?: ParticipantType;
  gender?: "mens" | "womens" | "mixed";
};

export function BracketManagementModal({
  tournamentId,
  onClose,
}: BracketManagementModalProps): React.ReactNode {
  const [isCreating, setIsCreating] = useState(false);
  const [newBracketName, setNewBracketName] = useState("");
  const [newBracketFormat, setNewBracketFormat] = useState<TournamentFormat | "">("");
  const [newBracketParticipantType, setNewBracketParticipantType] = useState<ParticipantType | "">(
    ""
  );
  const [newBracketMaxParticipants, setNewBracketMaxParticipants] = useState<string>("");
  const [newBracketGender, setNewBracketGender] = useState<"mens" | "womens" | "mixed" | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [orderedBrackets, setOrderedBrackets] = useState<BracketItem[]>([]);

  const brackets = useQuery(api.tournamentBrackets.listBrackets, {
    tournamentId: tournamentId as Id<"tournaments">,
  });

  const tournament = useQuery(api.tournaments.getTournament, {
    tournamentId: tournamentId as Id<"tournaments">,
  });

  const createBracket = useMutation(api.tournamentBrackets.createBracket);
  const deleteBracket = useMutation(api.tournamentBrackets.deleteBracket);
  const reorderBrackets = useMutation(api.tournamentBrackets.reorderBrackets);

  useEffect(() => {
    if (brackets) {
      setOrderedBrackets(brackets as BracketItem[]);
    }
  }, [brackets]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleCreateBracket = async () => {
    if (!newBracketName.trim()) return;

    setIsSubmitting(true);
    try {
      await createBracket({
        tournamentId: tournamentId as Id<"tournaments">,
        name: newBracketName.trim(),
        format: newBracketFormat || undefined,
        participantType: newBracketParticipantType || undefined,
        maxParticipants: newBracketMaxParticipants
          ? parseInt(newBracketMaxParticipants, 10)
          : undefined,
        gender: newBracketGender || undefined,
      });
      setNewBracketName("");
      setNewBracketFormat("");
      setNewBracketParticipantType("");
      setNewBracketMaxParticipants("");
      setNewBracketGender("");
      setIsCreating(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create bracket");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBracket = (bracketId: string) => {
    setConfirmDelete(bracketId);
  };

  const executeDeleteBracket = async () => {
    if (!confirmDelete) return;
    try {
      await deleteBracket({ bracketId: confirmDelete as Id<"tournamentBrackets"> });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete bracket");
    }
    setConfirmDelete(null);
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const oldIndex = orderedBrackets.findIndex((bracket) => bracket._id === active.id);
    const newIndex = orderedBrackets.findIndex((bracket) => bracket._id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const previousOrder = orderedBrackets;
    const nextOrder = arrayMove(orderedBrackets, oldIndex, newIndex);

    setOrderedBrackets(nextOrder);

    try {
      await reorderBrackets({
        tournamentId: tournamentId as Id<"tournaments">,
        bracketIds: nextOrder.map((bracket) => bracket._id as Id<"tournamentBrackets">),
      });
    } catch (error) {
      setOrderedBrackets(previousOrder);
      toast.error(error instanceof Error ? error.message : "Failed to reorder brackets");
    }
  };

  const formatLabels = FORMAT_LABELS;
  const participantTypeLabels = PARTICIPANT_TYPE_LABELS;

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        showCloseButton
        className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col gap-0 p-0"
      >
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl">Manage Brackets</DialogTitle>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tournament defaults info */}
          {tournament && (
            <div className="text-xs text-muted-foreground mb-4 p-3 bg-secondary rounded-lg">
              <p>
                <span className="font-medium">Tournament defaults:</span>{" "}
                {formatLabels[tournament.format as TournamentFormat]},{" "}
                {participantTypeLabels[tournament.participantType as ParticipantType]}
              </p>
              <p className="mt-1">Brackets inherit these unless overridden.</p>
            </div>
          )}

          {/* Existing brackets */}
          {orderedBrackets.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedBrackets.map((bracket) => bracket._id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2 mb-6">
                  {orderedBrackets.map((bracket) => {
                    const canDelete =
                      orderedBrackets.length > 1 &&
                      bracket.status === "draft" &&
                      bracket.participantCount === 0 &&
                      bracket.matchCount === 0;

                    return (
                      <SortableBracketRow
                        key={bracket._id}
                        bracket={bracket}
                        canDelete={canDelete}
                        formatLabels={formatLabels}
                        onDelete={handleDeleteBracket}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Create new bracket form */}
          {isCreating ? (
            <div className="border border-border rounded-lg p-4 bg-secondary">
              <h3 className="font-medium mb-4">New Bracket</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Name <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={newBracketName}
                    onChange={(e) => setNewBracketName(e.target.value)}
                    placeholder="e.g., Men's Singles"
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Format <span className="text-muted-foreground">(optional override)</span>
                  </label>
                  <select
                    value={newBracketFormat}
                    onChange={(e) => setNewBracketFormat(e.target.value as TournamentFormat | "")}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:border-brand"
                  >
                    <option value="">Use tournament default</option>
                    <option value="single_elimination">Single Elimination</option>
                    <option value="double_elimination">Double Elimination</option>
                    <option value="round_robin">Round Robin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Participant Type{" "}
                    <span className="text-muted-foreground">(optional override)</span>
                  </label>
                  <select
                    value={newBracketParticipantType}
                    onChange={(e) =>
                      setNewBracketParticipantType(e.target.value as ParticipantType | "")
                    }
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:border-brand"
                  >
                    <option value="">Use tournament default</option>
                    <option value="individual">Individual</option>
                    <option value="doubles">Doubles</option>
                    <option value="team">Team</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Gender Category <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <select
                    value={newBracketGender}
                    onChange={(e) =>
                      setNewBracketGender(e.target.value as "mens" | "womens" | "mixed" | "")
                    }
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:border-brand"
                  >
                    <option value="">Not set</option>
                    <option value="mens">Men&apos;s</option>
                    <option value="womens">Women&apos;s</option>
                    <option value="mixed">Mixed</option>
                  </select>
                  <span className="block text-xs text-muted-foreground mt-1">
                    Filters the player database when importing players
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Max Participants <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <input
                    type="number"
                    min="2"
                    value={newBracketMaxParticipants}
                    onChange={(e) => setNewBracketMaxParticipants(e.target.value)}
                    placeholder="e.g., 8, 16, 32"
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:border-brand"
                  />
                  <span className="block text-xs text-muted-foreground mt-1">
                    Leave empty for unlimited participants
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleCreateBracket}
                  disabled={!newBracketName.trim() || isSubmitting}
                  className="flex-1 px-4 py-2 bg-brand text-white rounded-lg font-medium hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Creating..." : "Create Bracket"}
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewBracketName("");
                    setNewBracketFormat("");
                    setNewBracketParticipantType("");
                    setNewBracketMaxParticipants("");
                    setNewBracketGender("");
                  }}
                  className="px-4 py-2 bg-secondary border border-border rounded-lg font-medium hover:bg-card transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-border rounded-lg text-muted-foreground hover:text-brand hover:border-brand transition-colors"
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
              Add Bracket
            </button>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-6 pt-4 border-t border-border">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-secondary border border-border rounded-lg font-medium hover:bg-card transition-colors"
          >
            Done
          </button>
        </DialogFooter>
      </DialogContent>
      <ConfirmDialog
        open={confirmDelete !== null}
        onConfirm={executeDeleteBracket}
        onCancel={() => setConfirmDelete(null)}
        title="Delete Bracket"
        description="Are you sure you want to delete this bracket? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </Dialog>
  );
}

type SortableBracketRowProps = {
  bracket: BracketItem;
  canDelete: boolean;
  formatLabels: typeof FORMAT_LABELS;
  onDelete: (bracketId: Id<"tournamentBrackets">) => void;
};

function SortableBracketRow({
  bracket,
  canDelete,
  formatLabels,
  onDelete,
}: SortableBracketRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bracket._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-secondary border border-border rounded-lg group ${
        isDragging ? "ring-2 ring-brand/30 shadow-sm" : ""
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
        aria-label={`Reorder ${bracket.name}`}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{bracket.name}</div>
        <div className="text-xs text-muted-foreground">
          {bracket.participantCount}
          {bracket.maxParticipants ? ` / ${bracket.maxParticipants}` : ""} participants,{" "}
          {bracket.matchCount} matches
          {bracket.format && (
            <span className="ml-1">- {formatLabels[bracket.format as TournamentFormat]}</span>
          )}
        </div>
      </div>

      <span
        className={`px-2 py-0.5 text-xs font-medium rounded ${
          bracket.status === "active"
            ? "text-success bg-success/10"
            : bracket.status === "completed"
              ? "text-gold bg-gold/10"
              : "text-muted-foreground bg-secondary"
        }`}
      >
        {bracket.status}
      </span>

      {canDelete && (
        <button
          onClick={() => onDelete(bracket._id)}
          className="p-1.5 text-muted-foreground hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete bracket"
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
