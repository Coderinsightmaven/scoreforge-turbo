"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import React, { useState } from "react";
import type { Id } from "@repo/convex/dataModel";
import { toast } from "sonner";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import { getDisplayMessage } from "@/lib/errors";
import { TabSkeleton } from "@/app/components/TabSkeleton";
import { ScorerCodeSection } from "./scorers/ScorerCodeSection";
import { TemporaryScorersSection } from "./scorers/TemporaryScorersSection";
import { AccountScorersSection } from "./scorers/AccountScorersSection";
import { AddScorerModal } from "./scorers/AddScorerModal";
import { CreateTempScorerModal } from "./scorers/CreateTempScorerModal";
import { ResetPinModal } from "./scorers/ResetPinModal";

export function ScorersTab({ tournamentId }: { tournamentId: string }): React.ReactNode {
  // Regular scorers
  const scorers = useQuery(api.tournamentScorers.listScorers, {
    tournamentId: tournamentId as Id<"tournaments">,
  });
  const removeScorer = useMutation(api.tournamentScorers.removeScorer);

  // Temporary scorers
  const tempScorers = useQuery(api.temporaryScorers.listTemporaryScorers, {
    tournamentId: tournamentId as Id<"tournaments">,
  });
  const scorerCode = useQuery(api.temporaryScorers.getScorerCode, {
    tournamentId: tournamentId as Id<"tournaments">,
  });
  const deactivateTempScorer = useMutation(api.temporaryScorers.deactivateTemporaryScorer);
  const reactivateTempScorer = useMutation(api.temporaryScorers.reactivateTemporaryScorer);
  const resetTempScorerPin = useMutation(api.temporaryScorers.resetTemporaryScorerPin);
  const deleteTempScorer = useMutation(api.temporaryScorers.deleteTemporaryScorer);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showTempScorerModal, setShowTempScorerModal] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [resetPinResult, setResetPinResult] = useState<{ scorerId: string; pin: string } | null>(
    null
  );
  const [confirmState, setConfirmState] = useState<{
    action: () => void;
    title: string;
    description: string;
    confirmLabel: string;
    variant: "danger" | "default";
  } | null>(null);

  if (!scorers || tempScorers === undefined) {
    return <TabSkeleton />;
  }

  const handleRemove = (userId: string) => {
    setConfirmState({
      action: async () => {
        setRemovingId(userId);
        try {
          await removeScorer({
            tournamentId: tournamentId as Id<"tournaments">,
            userId: userId as Id<"users">,
          });
        } catch (err) {
          toast.error(getDisplayMessage(err) || "Failed to remove scorer");
        } finally {
          setRemovingId(null);
        }
      },
      title: "Remove Scorer",
      description: "Remove this scorer from the tournament?",
      confirmLabel: "Remove",
      variant: "danger",
    });
  };

  const handleDeactivateTempScorer = (scorerId: string) => {
    setConfirmState({
      action: async () => {
        try {
          await deactivateTempScorer({ scorerId: scorerId as Id<"temporaryScorers"> });
        } catch (err) {
          toast.error(getDisplayMessage(err) || "Failed to deactivate scorer");
        }
      },
      title: "Deactivate Scorer",
      description: "Deactivate this scorer? They will no longer be able to log in.",
      confirmLabel: "Deactivate",
      variant: "danger",
    });
  };

  const handleReactivateTempScorer = async (scorerId: string) => {
    try {
      await reactivateTempScorer({ scorerId: scorerId as Id<"temporaryScorers"> });
    } catch (err) {
      toast.error(getDisplayMessage(err) || "Failed to reactivate scorer");
    }
  };

  const handleResetPin = (scorerId: string) => {
    setConfirmState({
      action: async () => {
        try {
          const newPin = await resetTempScorerPin({
            scorerId: scorerId as Id<"temporaryScorers">,
          });
          setResetPinResult({ scorerId, pin: newPin });
        } catch (err) {
          toast.error(getDisplayMessage(err) || "Failed to reset PIN");
        }
      },
      title: "Reset PIN",
      description: "Reset this scorer's PIN? Their current sessions will be invalidated.",
      confirmLabel: "Reset PIN",
      variant: "danger",
    });
  };

  const handleDeleteTempScorer = (scorerId: string) => {
    setConfirmState({
      action: async () => {
        try {
          await deleteTempScorer({ scorerId: scorerId as Id<"temporaryScorers"> });
        } catch (err) {
          toast.error(getDisplayMessage(err) || "Failed to delete scorer");
        }
      },
      title: "Delete Scorer",
      description: "Permanently delete this scorer? This cannot be undone.",
      confirmLabel: "Delete Scorer",
      variant: "danger",
    });
  };

  return (
    <div className="animate-fadeIn space-y-8">
      {/* Tournament Scorer Code */}
      {scorerCode && <ScorerCodeSection scorerCode={scorerCode} />}

      {/* Temporary Scorers Section */}
      <TemporaryScorersSection
        tempScorers={tempScorers}
        onCreateClick={() => setShowTempScorerModal(true)}
        onResetPin={handleResetPin}
        onDeactivate={handleDeactivateTempScorer}
        onReactivate={handleReactivateTempScorer}
        onDelete={handleDeleteTempScorer}
      />

      {/* Regular Scorers Section */}
      <AccountScorersSection
        scorers={scorers}
        removingId={removingId}
        onAddClick={() => setShowAddModal(true)}
        onRemove={handleRemove}
      />

      {/* Add Account Scorer Modal */}
      {showAddModal && (
        <AddScorerModal tournamentId={tournamentId} onClose={() => setShowAddModal(false)} />
      )}

      {/* Create Temporary Scorer Modal */}
      {showTempScorerModal && (
        <CreateTempScorerModal
          tournamentId={tournamentId}
          onClose={() => setShowTempScorerModal(false)}
        />
      )}

      {/* Reset PIN Result Modal */}
      {resetPinResult && (
        <ResetPinModal pin={resetPinResult.pin} onClose={() => setResetPinResult(null)} />
      )}

      <ConfirmDialog
        open={confirmState !== null}
        onConfirm={() => {
          confirmState?.action();
          setConfirmState(null);
        }}
        onCancel={() => setConfirmState(null)}
        title={confirmState?.title ?? ""}
        description={confirmState?.description ?? ""}
        confirmLabel={confirmState?.confirmLabel}
        variant={confirmState?.variant}
      />
    </div>
  );
}
