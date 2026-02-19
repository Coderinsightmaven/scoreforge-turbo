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
import { CourtScorersSection } from "./scorers/CourtScorersSection";
import { CourtPinQRDialog } from "./scorers/CourtPinQRDialog";
import { AccountScorersSection } from "./scorers/AccountScorersSection";
import { AddScorerModal } from "./scorers/AddScorerModal";
import { ResetPinModal } from "./scorers/ResetPinModal";

interface QRDialogState {
  court: string;
  username: string;
  pin?: string;
}

export function ScorersTab({ tournamentId }: { tournamentId: string }): React.ReactNode {
  // Regular scorers
  const scorers = useQuery(api.tournamentScorers.listScorers, {
    tournamentId: tournamentId as Id<"tournaments">,
  });
  const removeScorer = useMutation(api.tournamentScorers.removeScorer);

  // Court scorers
  const courtScorers = useQuery(api.temporaryScorers.getCourtScorers, {
    tournamentId: tournamentId as Id<"tournaments">,
  });
  const scorerCode = useQuery(api.temporaryScorers.getScorerCode, {
    tournamentId: tournamentId as Id<"tournaments">,
  });
  const deactivateTempScorer = useMutation(api.temporaryScorers.deactivateTemporaryScorer);
  const reactivateTempScorer = useMutation(api.temporaryScorers.reactivateTemporaryScorer);
  const resetTempScorerPin = useMutation(api.temporaryScorers.resetTemporaryScorerPin);

  const [showAddModal, setShowAddModal] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [resetPinResult, setResetPinResult] = useState<{ scorerId: string; pin: string } | null>(
    null
  );
  const [courtPins, setCourtPins] = useState<Map<string, string>>(new Map());
  const [qrDialog, setQrDialog] = useState<QRDialogState | null>(null);
  const [confirmState, setConfirmState] = useState<{
    action: () => void;
    title: string;
    description: string;
    confirmLabel: string;
    variant: "danger" | "default";
  } | null>(null);

  if (!scorers || courtScorers === undefined) {
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
          // Store PIN so it shows inline for the court
          const scorer = courtScorers.find((s) => s._id === scorerId);
          if (scorer) {
            setCourtPins((prev) => new Map(prev).set(scorer.court, newPin));
          }
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

  const handleShowQR = async (scorer: { _id: string; court: string; username: string }) => {
    let pin = courtPins.get(scorer.court);
    if (!pin) {
      try {
        pin = await resetTempScorerPin({
          scorerId: scorer._id as Id<"temporaryScorers">,
        });
        setCourtPins((prev) => new Map(prev).set(scorer.court, pin!));
      } catch (err) {
        toast.error(getDisplayMessage(err) || "Failed to generate PIN");
        return;
      }
    }
    setQrDialog({ court: scorer.court, username: scorer.username, pin });
  };

  return (
    <div className="animate-fadeIn space-y-8">
      {/* Tournament Scorer Code */}
      {scorerCode && <ScorerCodeSection scorerCode={scorerCode} />}

      {/* Court Scorers Section */}
      <CourtScorersSection
        courtScorers={courtScorers}
        courtPins={courtPins}
        scorerCode={scorerCode ?? null}
        onShowQR={handleShowQR}
        onResetPin={handleResetPin}
        onDeactivate={handleDeactivateTempScorer}
        onReactivate={handleReactivateTempScorer}
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

      {/* QR Code Dialog */}
      {qrDialog && scorerCode && (
        <CourtPinQRDialog
          open={!!qrDialog}
          onClose={() => setQrDialog(null)}
          courtName={qrDialog.court}
          pin={qrDialog.pin ?? null}
          scorerCode={scorerCode}
          username={qrDialog.username}
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
