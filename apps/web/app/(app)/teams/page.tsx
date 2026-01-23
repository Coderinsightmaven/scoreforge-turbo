"use client";

import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import Link from "next/link";
import { Skeleton } from "@/app/components/Skeleton";

export default function TeamsPage() {
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
          <div>
            <h1 className="font-display text-5xl tracking-wide text-text-primary mb-2">
              TEAMS
            </h1>
            <p className="text-text-secondary">
              View and manage teams across your organizations
            </p>
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
            <TeamsList organizations={organizations} />
          )}
        </div>
      </main>
    </div>
  );
}

function TeamsList({
  organizations,
}: {
  organizations: {
    _id: string;
    name: string;
    slug: string;
    role: string;
  }[];
}) {
  return (
    <div className="space-y-12">
      {organizations.map((org) => (
        <OrgTeams key={org._id} organization={org} />
      ))}
    </div>
  );
}

function OrgTeams({
  organization,
}: {
  organization: {
    _id: string;
    name: string;
    slug: string;
    role: string;
  };
}) {
  const teams = useQuery(api.teams.listByOrganization, {
    organizationId: organization._id as any,
  });

  if (!teams || teams.length === 0) {
    return null;
  }

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
          <span className="text-sm text-text-muted">{teams.length} teams</span>
        </div>
        {canCreate && (
          <Link
            href={`/organizations/${organization.slug}/teams/new`}
            className="flex items-center gap-1 px-3 py-1.5 bg-accent/10 border border-accent/30 rounded-lg text-xs text-accent hover:bg-accent/20 transition-all"
          >
            <span>+</span> New
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {teams.map((team, index) => (
          <Link
            key={team._id}
            href={`/teams/${team._id}`}
            className="group relative p-4 bg-bg-card border border-border rounded-xl hover:border-accent/30 hover:bg-bg-card-hover transition-all animate-fadeInUp"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="w-12 h-12 rounded-lg bg-bg-elevated border border-border flex items-center justify-center text-xl font-display text-accent overflow-hidden mb-3">
              {team.image ? (
                <img
                  src={team.image}
                  alt={team.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                team.name.charAt(0).toUpperCase()
              )}
            </div>
            <h3 className="font-semibold text-text-primary mb-2 truncate">
              {team.name}
            </h3>
            <div className="flex flex-col gap-1 text-sm text-text-secondary">
              {team.captainName && (
                <span className="flex items-center gap-1.5">
                  <span>👑</span>
                  {team.captainName}
                </span>
              )}
              <span className="text-text-muted">
                {team.memberCount} {team.memberCount === 1 ? "member" : "members"}
              </span>
            </div>
            {/* Hover indicator */}
            <div className="absolute inset-x-4 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center justify-between text-sm text-accent">
                <span>View Team</span>
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
      <div className="text-6xl text-text-muted mb-6 animate-float">◇</div>
      <h2 className="font-display text-2xl text-text-primary mb-3">No Teams Yet</h2>
      <p className="text-text-secondary mb-8 max-w-md">
        Join an organization to view and manage teams, or create your own organization
        to get started.
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
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <TeamCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamCardSkeleton() {
  return (
    <div className="p-4 bg-bg-card border border-border rounded-xl">
      <Skeleton className="w-12 h-12 rounded-lg mb-3" />
      <Skeleton className="h-5 w-3/4 mb-2" />
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Skeleton className="w-4 h-4" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}
