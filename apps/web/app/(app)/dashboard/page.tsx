"use client";

import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import Link from "next/link";
import { Skeleton } from "@/app/components/Skeleton";
import { useState } from "react";

type StatusFilter = "all" | "active" | "draft" | "completed" | "cancelled";

export default function DashboardPage() {
  const user = useQuery(api.users.currentUser);
  const tournaments = useQuery(api.tournaments.listMyTournaments, {});
  const createStatus = useQuery(api.tournaments.canCreateTournament, {});
  const [filter, setFilter] = useState<StatusFilter>("all");

  const canCreate = createStatus?.canCreate ?? true;
  const greeting = getGreeting();
  const firstName = user?.name?.split(" ")[0] || "there";

  const filters: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "draft", label: "Draft" },
    { value: "completed", label: "Completed" },
  ];

  const filteredTournaments = tournaments?.filter((t) => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  if (user === undefined || tournaments === undefined) {
    return <DashboardSkeleton />;
  }

  const totalTournaments = tournaments?.length || 0;
  const liveTournaments = tournaments?.filter((t) => t.status === "active").length || 0;
  const liveMatches = tournaments?.reduce((acc, t) => acc + t.liveMatchCount, 0) || 0;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-accent/10 via-bg-secondary to-bg-primary overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-accent/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-accent/5 blur-[80px] rounded-full" />
          <div className="absolute inset-0 grid-bg opacity-20" />
        </div>

        {/* Content */}
        <div className="relative z-10 px-6 lg:px-8 pt-24 pb-16">
          <div className="max-w-[var(--content-max)] mx-auto">
            <p className="text-sm text-text-muted mb-2">{greeting}</p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-text-primary mb-4">
              Welcome back, <span className="text-accent">{firstName}</span>
            </h1>
            <p className="text-lg text-text-secondary max-w-xl mb-10">
              Manage your tournaments and track live matches.
            </p>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-3">
              <StatPill
                label="Tournaments"
                value={totalTournaments}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                  </svg>
                }
              />
              {liveTournaments > 0 && (
                <StatPill
                  label="Active"
                  value={liveTournaments}
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                    </svg>
                  }
                />
              )}
              {liveMatches > 0 && (
                <StatPill
                  label="Live Matches"
                  value={liveMatches}
                  isLive
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                  }
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 lg:px-8 py-12">
        <div className="max-w-[var(--content-max)] mx-auto space-y-12">
          {/* Tournaments Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl font-semibold text-text-primary mb-1">
                  Your tournaments
                </h2>
                <p className="text-text-secondary">
                  {createStatus && !createStatus.isSiteAdmin && (
                    <span>{createStatus.currentCount} of {createStatus.maxAllowed} tournaments used</span>
                  )}
                  {createStatus?.isSiteAdmin && <span>Unlimited tournaments (admin)</span>}
                  {!createStatus && <span>Create and manage your competitions</span>}
                </p>
              </div>
              {canCreate ? (
                <Link
                  href="/tournaments/new"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-text-inverse bg-accent rounded-xl hover:bg-accent-bright transition-all shadow-lg shadow-accent/25"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  New tournament
                </Link>
              ) : (
                <div className="relative group">
                  <button
                    disabled
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-text-muted bg-bg-elevated rounded-xl cursor-not-allowed opacity-60"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    New tournament
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <p className="text-sm text-text-secondary">
                      You&apos;ve reached your limit of {createStatus?.maxAllowed} tournaments. Delete an existing tournament to create a new one.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Filters */}
            {tournaments && tournaments.length > 0 && (
              <div className="flex gap-2 mb-6">
                {filters.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      filter === f.value
                        ? "bg-accent text-text-inverse"
                        : "bg-bg-card border border-border text-text-secondary hover:text-text-primary hover:border-accent/30"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            {!tournaments ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <TournamentCardSkeleton key={i} />
                ))}
              </div>
            ) : tournaments.length === 0 ? (
              <EmptyState
                title="No tournaments yet"
                description="Create your first tournament to start managing competitions."
                actionLabel="Create tournament"
                actionHref="/tournaments/new"
                canCreate={canCreate}
                maxAllowed={createStatus?.maxAllowed}
              />
            ) : filteredTournaments?.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-text-secondary">No {filter} tournaments</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredTournaments?.map((tournament, index) => (
                  <TournamentCard key={tournament._id} tournament={tournament} index={index} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function StatPill({
  label,
  value,
  icon,
  isLive,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  isLive?: boolean;
}) {
  return (
    <div className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-full border ${
      isLive
        ? "bg-success/10 border-success/20 text-success"
        : "bg-bg-primary/80 backdrop-blur-sm border-border text-text-primary"
    }`}>
      <span className="text-current opacity-70">{icon}</span>
      <span className="font-display text-lg font-semibold">{value}</span>
      <span className="text-sm opacity-70">{label}</span>
      {isLive && <span className="w-2 h-2 rounded-full bg-success animate-pulse" />}
    </div>
  );
}

function TournamentCard({
  tournament,
  index,
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
    startDate?: number;
  };
  index: number;
}) {
  const sportIcons: Record<string, string> = {
    tennis: "🎾",
    volleyball: "🏐",
  };

  const statusStyles: Record<string, string> = {
    draft: "text-text-muted bg-bg-elevated",
    active: "text-success bg-success/10",
    completed: "text-text-secondary bg-bg-elevated",
    cancelled: "text-error bg-error/10",
  };

  const formatLabels: Record<string, string> = {
    single_elimination: "Single Elim",
    double_elimination: "Double Elim",
    round_robin: "Round Robin",
  };

  const hasLive = tournament.liveMatchCount > 0;

  return (
    <Link
      href={`/tournaments/${tournament._id}`}
      className={`group relative flex flex-col p-6 bg-bg-card border border-border ${hasLive ? "border-l-4 border-l-success" : ""} rounded-2xl hover:bg-bg-card-hover hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 transition-all duration-300 animate-fadeInUp overflow-hidden`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-accent/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {hasLive && (
        <span className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-success bg-success/10 rounded-full border border-success/20">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          {tournament.liveMatchCount} live
        </span>
      )}

      <div className="relative z-10 flex items-center gap-3 mb-3">
        <span className="text-2xl">{sportIcons[tournament.sport] || "🏆"}</span>
        <span className={`flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md ${statusStyles[tournament.status] || statusStyles.draft}`}>
          {tournament.status === "active" && (
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          )}
          {tournament.status}
        </span>
      </div>

      <div className="relative z-10 flex-1">
        <h3 className="font-display text-xl font-semibold text-text-primary truncate group-hover:text-accent transition-colors mb-1">
          {tournament.name}
        </h3>
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <span>{formatLabels[tournament.format] || tournament.format}</span>
          <span>·</span>
          <span>{tournament.participantCount}/{tournament.maxParticipants}</span>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between mt-6 pt-4 border-t border-border/50">
        <div className="flex items-center gap-2">
          {tournament.isOwner ? (
            <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-accent/10 text-accent">
              Owner
            </span>
          ) : (
            <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-success/10 text-success">
              Scorer
            </span>
          )}
        </div>
        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-bg-elevated group-hover:bg-accent group-hover:text-white transition-all duration-300">
          <svg
            className="w-4 h-4 text-text-muted group-hover:text-white transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  canCreate,
  maxAllowed,
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  canCreate: boolean;
  maxAllowed?: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-bg-card/50 border border-border border-dashed rounded-2xl">
      <div className="w-16 h-16 flex items-center justify-center bg-bg-elevated rounded-2xl mb-5">
        <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
        </svg>
      </div>
      <h3 className="font-display text-xl font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-text-secondary mb-8 max-w-md">{description}</p>
      {canCreate ? (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-text-inverse bg-accent rounded-xl hover:bg-accent-bright transition-all shadow-lg shadow-accent/25"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {actionLabel}
        </Link>
      ) : (
        <p className="text-sm text-text-muted">
          You&apos;ve reached your limit of {maxAllowed} tournaments. Contact an administrator for assistance.
        </p>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Hero Section Skeleton */}
      <div className="relative bg-gradient-to-br from-accent/10 via-bg-secondary to-bg-primary">
        <div className="px-6 lg:px-8 pt-24 pb-16">
          <div className="max-w-[var(--content-max)] mx-auto">
            <Skeleton className="h-4 w-28 mb-3" />
            <Skeleton className="h-14 w-96 max-w-full mb-4" />
            <Skeleton className="h-6 w-80 max-w-full mb-10" />
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-11 w-40 rounded-full" />
              <Skeleton className="h-11 w-36 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="px-6 lg:px-8 py-12">
        <div className="max-w-[var(--content-max)] mx-auto space-y-12">
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-5 w-64" />
              </div>
              <Skeleton className="h-11 w-44 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <TournamentCardSkeleton key={i} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function TournamentCardSkeleton() {
  return (
    <div className="flex flex-col p-6 bg-bg-card border border-border rounded-2xl">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="w-8 h-8 rounded" />
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
      <div className="flex-1">
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
        <Skeleton className="h-7 w-16 rounded-lg" />
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>
    </div>
  );
}
