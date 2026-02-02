"use client";

import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import Link from "next/link";
import { useState } from "react";

type Filter = "all" | "active" | "draft" | "completed";

export default function DashboardPage(): React.ReactNode {
  const user = useQuery(api.users.currentUser);
  const tournaments = useQuery(api.tournaments.listMyTournaments, {});
  const createStatus = useQuery(api.tournaments.canCreateTournament, {});
  const [filter, setFilter] = useState<Filter>("all");

  const canCreate = createStatus?.canCreate ?? true;
  const firstName = user?.name?.split(" ")[0] || "there";

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "draft", label: "Draft" },
    { value: "completed", label: "Completed" },
  ];

  const filteredTournaments = tournaments?.filter((t) => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  // Loading state
  if (user === undefined || tournaments === undefined) {
    return <DashboardSkeleton />;
  }

  const liveMatchCount = tournaments.reduce((acc, t) => acc + t.liveMatchCount, 0);

  return (
    <div className="min-h-screen bg-bg-page py-8">
      <div className="container">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-title text-text-primary mb-2">
            Welcome back, {firstName}
          </h1>
          <p className="text-body text-text-secondary">
            {tournaments.length === 0
              ? "Create your first tournament to get started"
              : `You have ${tournaments.length} tournament${tournaments.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {/* Live matches alert */}
        {liveMatchCount > 0 && (
          <div className="mb-8 p-4 bg-error-light border border-error/20 rounded-xl flex items-center gap-4">
            <div className="live-dot" />
            <div>
              <p className="font-medium text-text-primary">
                {liveMatchCount} match{liveMatchCount === 1 ? "" : "es"} in progress
              </p>
              <p className="text-small text-text-secondary">
                Tap a tournament to see live scores
              </p>
            </div>
          </div>
        )}

        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          {/* Filters */}
          {tournaments.length > 0 && (
            <div className="flex gap-2">
              {filters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    filter === f.value
                      ? "bg-text-primary text-bg-page"
                      : "bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Create button */}
          {canCreate ? (
            <Link href="/tournaments/new" className="btn-primary">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Tournament
            </Link>
          ) : (
            <div className="text-small text-text-muted">
              Tournament limit reached ({createStatus?.maxAllowed})
            </div>
          )}
        </div>

        {/* Tournament list */}
        {tournaments.length === 0 ? (
          <EmptyState canCreate={canCreate} />
        ) : filteredTournaments?.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-text-muted">No {filter} tournaments</p>
            <button
              onClick={() => setFilter("all")}
              className="mt-2 text-brand hover:underline"
            >
              Show all tournaments
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTournaments?.map((tournament) => (
              <TournamentCard key={tournament._id} tournament={tournament} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TournamentCard({
  tournament,
}: {
  tournament: {
    _id: string;
    name: string;
    sport: string;
    format: string;
    status: string;
    participantCount: number;
    maxParticipants: number;
    liveMatchCount: number;
    isOwner: boolean;
  };
}) {
  const sportLabels: Record<string, string> = {
    tennis: "Tennis",
    volleyball: "Volleyball",
  };

  const formatLabels: Record<string, string> = {
    single_elimination: "Single Elimination",
    double_elimination: "Double Elimination",
    round_robin: "Round Robin",
  };

  const statusStyles: Record<string, string> = {
    draft: "badge-muted",
    active: "badge-success",
    completed: "badge-brand",
    cancelled: "badge-error",
  };

  const hasLive = tournament.liveMatchCount > 0;

  return (
    <Link
      href={`/tournaments/${tournament._id}`}
      className={`card card-hover block ${hasLive ? "ring-2 ring-error/30" : ""}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <span className={`badge ${statusStyles[tournament.status] || "badge-muted"}`}>
          {hasLive && <span className="live-dot" />}
          {tournament.status}
        </span>
        <span className="text-small text-text-muted">
          {tournament.isOwner ? "Owner" : "Scorer"}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-heading text-text-primary mb-2 truncate">
        {tournament.name}
      </h3>

      {/* Details */}
      <div className="space-y-1 text-small text-text-secondary">
        <p>{sportLabels[tournament.sport] || tournament.sport}</p>
        <p>{formatLabels[tournament.format] || tournament.format}</p>
        <p>{tournament.participantCount} of {tournament.maxParticipants} players</p>
      </div>

      {/* Live indicator */}
      {hasLive && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-small text-error font-medium">
            {tournament.liveMatchCount} live match{tournament.liveMatchCount === 1 ? "" : "es"}
          </p>
        </div>
      )}
    </Link>
  );
}

function EmptyState({ canCreate }: { canCreate: boolean }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 mx-auto mb-6 bg-bg-secondary rounded-2xl flex items-center justify-center">
        <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
        </svg>
      </div>
      <h2 className="text-heading text-text-primary mb-2">No tournaments yet</h2>
      <p className="text-body text-text-secondary mb-6 max-w-sm mx-auto">
        Create your first tournament to start managing competitions
      </p>
      {canCreate && (
        <Link href="/tournaments/new" className="btn-primary">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Tournament
        </Link>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-bg-page py-8">
      <div className="container">
        <div className="mb-8">
          <div className="h-8 w-64 bg-bg-secondary rounded-lg animate-pulse mb-2" />
          <div className="h-5 w-48 bg-bg-secondary rounded-lg animate-pulse" />
        </div>
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 w-20 bg-bg-secondary rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="h-12 w-40 bg-bg-secondary rounded-lg animate-pulse" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="h-6 w-20 bg-bg-secondary rounded animate-pulse mb-3" />
              <div className="h-6 w-48 bg-bg-secondary rounded animate-pulse mb-2" />
              <div className="space-y-2">
                <div className="h-4 w-24 bg-bg-secondary rounded animate-pulse" />
                <div className="h-4 w-32 bg-bg-secondary rounded animate-pulse" />
                <div className="h-4 w-28 bg-bg-secondary rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
