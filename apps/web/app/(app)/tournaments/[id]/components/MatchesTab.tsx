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

  const oneOffMatches = sortedMatches.filter((m) => m.bracketType === "one_off");
  const bracketMatches = sortedMatches.filter((m) => m.bracketType !== "one_off");

  const matchStatusStyles: Record<string, string> = {
    pending: "text-muted-foreground bg-secondary",
    scheduled: "text-info bg-info/10",
    live: "text-success bg-success/10",
    completed: "text-gold bg-gold/10",
    bye: "text-muted-foreground bg-secondary",
  };

  return (
    <div className="animate-fadeIn space-y-4">
      {canManage && (
        <section className="surface-panel surface-panel-rail p-4 sm:p-5">
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
                  className="input"
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
        <div className="surface-panel surface-panel-rail flex flex-col items-center py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-bg-secondary">
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
        <div className="space-y-6">
          {oneOffMatches.length > 0 && (
            <section>
              <h3 className="text-heading mb-3">One-Off Matches</h3>
              <div className="flex flex-col gap-3">
                {oneOffMatches.map((match, index) => (
                  <MatchCard
                    key={match._id}
                    match={match}
                    index={index}
                    matchStatusStyles={matchStatusStyles}
                  />
                ))}
              </div>
            </section>
          )}

          {bracketMatches.length > 0 && (
            <section>
              <h3 className="text-heading mb-3">Tournament Matches</h3>
              <div className="flex flex-col gap-3">
                {bracketMatches.map((match, index) => (
                  <MatchCard
                    key={match._id}
                    match={match}
                    index={index}
                    matchStatusStyles={matchStatusStyles}
                  />
                ))}
              </div>
            </section>
          )}

          {oneOffMatches.length === 0 && bracketMatches.length === 0 && (
            <p className="text-sm text-muted-foreground">No matches to display.</p>
          )}
        </div>
      )}
    </div>
  );
}

function MatchCard({
  match,
  index,
  matchStatusStyles,
}: {
  match: {
    _id: string;
    bracketType?: string;
    round: number;
    matchNumber: number;
    court?: string;
    status: string;
    winnerId?: string;
    participant1?: { _id: string; displayName: string };
    participant2?: { _id: string; displayName: string };
    participant1Score: number;
    participant2Score: number;
    scheduledTime?: number;
  };
  index: number;
  matchStatusStyles: Record<string, string>;
}): React.ReactNode {
  const roundLabel = match.bracketType === "one_off" ? "One-Off" : `Round ${match.round}`;
  const isWinner1 = match.winnerId === match.participant1?._id;
  const isWinner2 = match.winnerId === match.participant2?._id;

  const content = (
    <>
      <div className="absolute inset-x-4 top-0 h-px bg-brand/40" />
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {roundLabel}
        </span>
        <span className="text-xs font-semibold text-muted-foreground">
          Match {match.matchNumber}
        </span>
        {match.court && <span className="text-xs font-semibold text-brand">@ {match.court}</span>}
        <span
          className={`ml-auto flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${matchStatusStyles[match.status]}`}
        >
          {match.status === "live" && (
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
          )}
          {match.status}
        </span>
      </div>
      <div className="mt-3 grid gap-2">
        <div
          className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
            isWinner1 ? "border-brand/30 bg-brand/10" : "border-border/60 bg-bg-secondary"
          }`}
        >
          <span className={`text-sm font-semibold ${isWinner1 ? "text-brand" : "text-foreground"}`}>
            {match.participant1?.displayName || "TBD"}
          </span>
          <span className="text-lg font-bold text-foreground">{match.participant1Score}</span>
        </div>
        <div
          className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
            isWinner2 ? "border-brand/30 bg-brand/10" : "border-border/60 bg-bg-secondary"
          }`}
        >
          <span className={`text-sm font-semibold ${isWinner2 ? "text-brand" : "text-foreground"}`}>
            {match.participant2?.displayName || "TBD"}
          </span>
          <span className="text-lg font-bold text-foreground">{match.participant2Score}</span>
        </div>
      </div>
      {match.scheduledTime && (
        <div className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/70">
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

  return (
    <Link
      href={`/matches/${match._id}`}
      className="surface-panel surface-panel-rail relative flex flex-col gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md animate-fadeInUp"
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      {content}
    </Link>
  );
}
