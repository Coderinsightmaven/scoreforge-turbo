"use client";

import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import Link from "next/link";
import { Skeleton } from "@/app/components/Skeleton";
import { useState } from "react";

type StatusFilter = "all" | "active" | "upcoming" | "completed";

export default function TournamentsPage() {
  const organizations = useQuery(api.organizations.listMyOrganizations);
  const [filter, setFilter] = useState<StatusFilter>("all");

  const filters: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "upcoming", label: "Upcoming" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <div className="min-h-screen py-8 px-6">
      <div className="max-w-[var(--content-max)] mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-text-primary mb-2">
            Tournaments
          </h1>
          <p className="text-text-secondary">
            Manage and track all your competitions
          </p>
        </header>

        {/* Filters */}
        <div className="flex gap-2 mb-8">
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

        {/* Content */}
        {organizations === undefined ? (
          <LoadingSkeleton />
        ) : organizations.length === 0 ? (
          <EmptyState />
        ) : (
          <TournamentsList organizations={organizations} filter={filter} />
        )}
      </div>
    </div>
  );
}

function TournamentsList({
  organizations,
  filter,
}: {
  organizations: {
    _id: string;
    name: string;
    slug: string;
    image?: string;
    role: string;
  }[];
  filter: StatusFilter;
}) {
  return (
    <div className="space-y-10">
      {organizations.map((org) => (
        <OrgTournaments key={org._id} organization={org} filter={filter} />
      ))}
    </div>
  );
}

function OrgTournaments({
  organization,
  filter,
}: {
  organization: {
    _id: string;
    name: string;
    slug: string;
    role: string;
  };
  filter: StatusFilter;
}) {
  const tournaments = useQuery(api.tournaments.listByOrganization, {
    organizationId: organization._id as any,
  });

  const filteredTournaments = tournaments?.filter((t) => {
    if (filter === "all") return true;
    if (filter === "active") return t.status === "active";
    if (filter === "upcoming") return t.status === "draft" || t.status === "registration";
    if (filter === "completed") return t.status === "completed" || t.status === "cancelled";
    return true;
  });

  if (!filteredTournaments || filteredTournaments.length === 0) {
    return null;
  }

  const sportIcons: Record<string, string> = {
    tennis: "🎾",
    volleyball: "🏐",
  };

  const statusStyles: Record<string, string> = {
    draft: "text-text-muted bg-bg-elevated",
    registration: "text-info bg-info/10",
    active: "text-success bg-success/10",
    completed: "text-text-secondary bg-bg-elevated",
    cancelled: "text-error bg-error/10",
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
            className="font-display text-lg font-medium text-text-primary hover:text-accent transition-colors"
          >
            {organization.name}
          </Link>
          <span className="text-sm text-text-muted">
            {filteredTournaments.length} {filteredTournaments.length === 1 ? "tournament" : "tournaments"}
          </span>
        </div>
        {canCreate && (
          <Link
            href={`/organizations/${organization.slug}/tournaments/new`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-accent bg-accent/10 rounded-lg hover:bg-accent/15 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredTournaments.map((tournament, index) => (
          <Link
            key={tournament._id}
            href={`/tournaments/${tournament._id}`}
            className="group p-4 bg-bg-card border border-border rounded-xl hover:border-accent/30 hover:bg-bg-card-hover transition-all duration-200 animate-fadeInUp"
            style={{ animationDelay: `${index * 0.03}s` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl">
                {sportIcons[tournament.sport] || "🏆"}
              </span>
              <span className={`flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md ${statusStyles[tournament.status] || statusStyles.draft}`}>
                {tournament.status === "active" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                )}
                {tournament.status}
              </span>
            </div>
            <h3 className="font-medium text-text-primary mb-1.5 truncate group-hover:text-accent transition-colors">
              {tournament.name}
            </h3>
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <span>{formatLabels[tournament.format] || tournament.format}</span>
              <span>·</span>
              <span>{tournament.participantCount}/{tournament.maxParticipants}</span>
            </div>
            {tournament.startDate && (
              <p className="mt-2 text-xs text-text-muted">
                {new Date(tournament.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 flex items-center justify-center bg-bg-card rounded-2xl mb-4">
        <svg className="w-7 h-7 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
        </svg>
      </div>
      <h2 className="font-display text-xl font-medium text-text-primary mb-2">
        No tournaments yet
      </h2>
      <p className="text-text-secondary mb-6 max-w-sm">
        Join an organization to view and manage tournaments, or create your own organization.
      </p>
      <Link
        href="/organizations"
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-text-inverse bg-accent rounded-lg hover:bg-accent-bright transition-colors"
      >
        View organizations
      </Link>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-10">
      {[1, 2].map((section) => (
        <div key={section}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 bg-bg-card border border-border rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="w-6 h-6 rounded" />
                  <Skeleton className="w-14 h-5 rounded-md" />
                </div>
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
