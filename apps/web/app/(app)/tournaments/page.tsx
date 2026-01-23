"use client";

import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import Link from "next/link";
import { Skeleton } from "@/app/components/Skeleton";

export default function TournamentsPage() {
  const organizations = useQuery(api.organizations.listMyOrganizations);

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <header className="relative overflow-hidden py-12 px-6">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-accent/10 blur-[100px] rounded-full" />
          <div className="absolute inset-0 grid-bg opacity-50" />
        </div>
        <div className="relative max-w-[var(--content-max)] mx-auto">
          <div className="mb-6">
            <h1 className="font-display text-5xl tracking-wide text-text-primary mb-2">
              TOURNAMENTS
            </h1>
            <p className="text-text-secondary">
              Manage and track all your tournament competitions
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-accent text-text-inverse text-sm font-medium rounded-full transition-all">
              All
            </button>
            <button className="px-4 py-2 bg-bg-card border border-border text-text-secondary text-sm font-medium rounded-full hover:border-accent/30 hover:text-text-primary transition-all">
              Active
            </button>
            <button className="px-4 py-2 bg-bg-card border border-border text-text-secondary text-sm font-medium rounded-full hover:border-accent/30 hover:text-text-primary transition-all">
              Upcoming
            </button>
            <button className="px-4 py-2 bg-bg-card border border-border text-text-secondary text-sm font-medium rounded-full hover:border-accent/30 hover:text-text-primary transition-all">
              Completed
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-6 pb-16">
        <div className="max-w-[var(--content-max)] mx-auto">
          {organizations === undefined ? (
            <LoadingSkeleton />
          ) : organizations.length === 0 ? (
            <EmptyState />
          ) : (
            <TournamentsList organizations={organizations} />
          )}
        </div>
      </main>
    </div>
  );
}

function TournamentsList({
  organizations,
}: {
  organizations: {
    _id: string;
    name: string;
    slug: string;
    image?: string;
    role: string;
  }[];
}) {
  return (
    <div className="space-y-12">
      {organizations.map((org) => (
        <OrgTournaments key={org._id} organization={org} />
      ))}
    </div>
  );
}

function OrgTournaments({
  organization,
}: {
  organization: {
    _id: string;
    name: string;
    slug: string;
    role: string;
  };
}) {
  const tournaments = useQuery(api.tournaments.listByOrganization, {
    organizationId: organization._id as any,
  });

  if (!tournaments || tournaments.length === 0) {
    return null;
  }

  const sportIcons: Record<string, string> = {
    basketball: "🏀",
    soccer: "⚽",
    tennis: "🎾",
    football: "🏈",
    baseball: "⚾",
    volleyball: "🏐",
    hockey: "🏒",
    golf: "⛳",
    badminton: "🏸",
    table_tennis: "🏓",
    cricket: "🏏",
    rugby: "🏉",
  };

  const statusColors: Record<string, string> = {
    draft: "text-text-muted bg-bg-elevated border-border",
    registration: "text-info bg-info/10 border-info/30",
    active: "text-success bg-success/10 border-success/30",
    completed: "text-text-secondary bg-bg-card border-border",
    cancelled: "text-red bg-red/10 border-red/30",
  };

  const formatLabels: Record<string, string> = {
    single_elimination: "Single Elim",
    double_elimination: "Double Elim",
    round_robin: "Round Robin",
  };

  const canCreate = organization.role === "owner" || organization.role === "admin";

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/organizations/${organization.slug}`}
            className="group flex items-center gap-2 hover:text-accent transition-colors"
          >
            <span className="font-display text-lg tracking-wide text-text-primary group-hover:text-accent">
              {organization.name}
            </span>
            <span className="text-text-muted group-hover:text-accent">→</span>
          </Link>
          <span className="text-sm text-text-muted">
            {tournaments.length} tournaments
          </span>
        </div>
        {canCreate && (
          <Link
            href={`/organizations/${organization.slug}/tournaments/new`}
            className="flex items-center gap-1 px-3 py-1.5 bg-accent/10 border border-accent/30 rounded-lg text-xs text-accent hover:bg-accent/20 transition-all"
          >
            <span>+</span> New
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tournaments.map((tournament, index) => (
          <Link
            key={tournament._id}
            href={`/tournaments/${tournament._id}`}
            className="group relative p-4 bg-bg-card border border-border rounded-xl hover:border-accent/30 hover:bg-bg-card-hover transition-all animate-fadeInUp"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">
                {sportIcons[tournament.sport] || "🏆"}
              </span>
              <span
                className={`flex items-center gap-1.5 px-2 py-0.5 text-xs rounded border ${statusColors[tournament.status] || statusColors.draft}`}
              >
                {tournament.status === "active" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                )}
                {tournament.status}
              </span>
            </div>
            <h3 className="font-semibold text-text-primary mb-2 truncate">
              {tournament.name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span>{formatLabels[tournament.format] || tournament.format}</span>
              <span className="text-text-muted">•</span>
              <span>
                {tournament.participantCount}/{tournament.maxParticipants}
              </span>
            </div>
            {tournament.startDate && (
              <div className="mt-2 text-xs text-text-muted">
                {new Date(tournament.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            )}

            {/* Hover indicator */}
            <div className="absolute inset-x-4 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center justify-between text-sm text-accent">
                <span>View Tournament</span>
                <span>→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-6xl text-text-muted mb-6 animate-float">◎</div>
      <h2 className="font-display text-2xl text-text-primary mb-3">
        No Tournaments Yet
      </h2>
      <p className="text-text-secondary mb-8 max-w-md">
        Join an organization to view and manage tournaments, or create your own
        organization to get started.
      </p>
      <Link
        href="/organizations"
        className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-text-inverse font-semibold rounded-lg hover:bg-accent-bright transition-all"
      >
        View Organizations
      </Link>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-12">
      {[1, 2].map((section) => (
        <div key={section}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <TournamentCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TournamentCardSkeleton() {
  return (
    <div className="p-4 bg-bg-card border border-border rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="w-8 h-8 rounded" />
        <Skeleton className="w-16 h-5 rounded" />
      </div>
      <Skeleton className="h-5 w-3/4 mb-2" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="h-3 w-24 mt-2" />
    </div>
  );
}
