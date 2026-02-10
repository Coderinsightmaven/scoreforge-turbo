"use client";

import React, { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@repo/convex";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Id } from "@repo/convex/dataModel";
import { TabSkeleton } from "@/app/components/TabSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getDisplayMessage } from "@/lib/errors";
import { Loader2, Plus } from "lucide-react";

export function MatchesTab({
  tournamentId,
  bracketId,
  canManage,
  tournamentStatus,
  availableCourts,
}: {
  tournamentId: string;
  bracketId: string | null;
  canManage: boolean;
  tournamentStatus: "draft" | "active" | "completed" | "cancelled";
  availableCourts?: string[];
}): React.ReactNode {
  const router = useRouter();
  const matches = useQuery(api.matches.listMatches, {
    tournamentId: tournamentId as Id<"tournaments">,
    bracketId: bracketId ? (bracketId as Id<"tournamentBrackets">) : undefined,
  });
  const createOneOffMatch = useMutation(api.matches.createOneOffMatch);

  const [participant1Name, setParticipant1Name] = useState("");
  const [participant2Name, setParticipant2Name] = useState("");
  const [selectedCourt, setSelectedCourt] = useState("");
  const [isCreatingOneOff, setIsCreatingOneOff] = useState(false);
  const [createError, setCreateError] = useState("");

  if (!matches) {
    return <TabSkeleton />;
  }

  const canCreateOneOff = canManage && tournamentStatus === "active";

  const handleCreateOneOffMatch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError("");

    const p1 = participant1Name.trim();
    const p2 = participant2Name.trim();
    if (!p1 || !p2) {
      setCreateError("Both participant names are required.");
      return;
    }

    setIsCreatingOneOff(true);
    try {
      const matchId = await createOneOffMatch({
        tournamentId: tournamentId as Id<"tournaments">,
        participant1Name: p1,
        participant2Name: p2,
        court: selectedCourt.trim() || undefined,
      });

      setParticipant1Name("");
      setParticipant2Name("");
      router.push(`/matches/${matchId}`);
    } catch (error) {
      setCreateError(getDisplayMessage(error));
      setIsCreatingOneOff(false);
    }
  };

  // Filter out TBD matches (missing participants)
  const readyMatches = matches.filter((match) => {
    if (match.status === "bye") return true;
    return match.participant1 && match.participant2;
  });

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
    live: "text-success bg-success/10",
    completed: "text-gold bg-gold/10",
    bye: "text-muted-foreground bg-secondary",
  };

  // Allow clicking matches in draft mode to set court
  const isClickable = true;

  return (
    <div className="animate-fadeIn space-y-4">
      {canManage && (
        <section className="surface-panel rounded-xl border p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-heading">One-Off Match</h3>
              <p className="text-small text-muted-foreground">
                Create and score an ad-hoc match with custom participant names.
              </p>
            </div>
          </div>

          {createError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{createError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleCreateOneOffMatch} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="one-off-p1">Participant 1</Label>
              <Input
                id="one-off-p1"
                value={participant1Name}
                onChange={(event) => setParticipant1Name(event.target.value)}
                placeholder="e.g. Serena Williams"
                disabled={!canCreateOneOff || isCreatingOneOff}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="one-off-p2">Participant 2</Label>
              <Input
                id="one-off-p2"
                value={participant2Name}
                onChange={(event) => setParticipant2Name(event.target.value)}
                placeholder="e.g. Coco Gauff"
                disabled={!canCreateOneOff || isCreatingOneOff}
                required
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="one-off-court">Court</Label>
              {availableCourts && availableCourts.length > 0 ? (
                <select
                  id="one-off-court"
                  value={selectedCourt}
                  onChange={(event) => setSelectedCourt(event.target.value)}
                  disabled={!canCreateOneOff || isCreatingOneOff}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">No court assigned</option>
                  {availableCourts.map((court) => (
                    <option key={court} value={court}>
                      {court}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="one-off-court"
                  value={selectedCourt}
                  onChange={(event) => setSelectedCourt(event.target.value)}
                  placeholder="Optional court name"
                  disabled={!canCreateOneOff || isCreatingOneOff}
                />
              )}
            </div>

            <div className="sm:col-span-2">
              <Button
                type="submit"
                variant="brand"
                disabled={
                  !canCreateOneOff ||
                  isCreatingOneOff ||
                  !participant1Name.trim() ||
                  !participant2Name.trim()
                }
              >
                {isCreatingOneOff ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Match...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create One-Off Match
                  </>
                )}
              </Button>
              {!canCreateOneOff && (
                <p className="mt-2 text-small text-muted-foreground">
                  Tournament must be active before creating one-off matches.
                </p>
              )}
            </div>
          </form>
        </section>
      )}

      {readyMatches.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center bg-secondary border border-dashed border-border rounded-xl">
          <div className="w-14 h-14 flex items-center justify-center bg-card rounded-xl mb-4">
            <svg
              className="w-7 h-7 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
              />
            </svg>
          </div>
          <p className="text-muted-foreground">
            Matches will appear when participants are assigned
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sortedMatches.map((match, index) => {
            const roundLabel = match.bracketType === "one_off" ? "One-Off" : `Round ${match.round}`;

            const content = (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-semibold text-muted-foreground">{roundLabel}</span>
                  <span className="text-xs text-muted-foreground">Match {match.matchNumber}</span>
                  {match.court && <span className="text-xs text-brand">@ {match.court}</span>}
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
                      className={`font-medium ${
                        match.winnerId === match.participant1?._id
                          ? "text-brand"
                          : "text-foreground"
                      }`}
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
                      className={`font-medium ${
                        match.winnerId === match.participant2?._id
                          ? "text-brand"
                          : "text-foreground"
                      }`}
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
                  className="flex flex-col p-4 bg-card border border-border rounded-lg hover:bg-card-hover hover:border-brand/30 transition-all animate-fadeInUp"
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  {content}
                </Link>
              );
            }

            return (
              <div
                key={match._id}
                className="flex flex-col p-4 bg-card border border-border rounded-lg animate-fadeInUp"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                {content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
