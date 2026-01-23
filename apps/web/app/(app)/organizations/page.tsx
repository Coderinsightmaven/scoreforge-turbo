"use client";

import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import Link from "next/link";
import { Skeleton } from "@/app/components/Skeleton";

export default function OrganizationsPage() {
  const organizations = useQuery(api.organizations.listMyOrganizations);

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <header className="relative overflow-hidden py-12 px-6">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-accent/10 blur-[100px] rounded-full" />
          <div className="absolute inset-0 grid-bg opacity-50" />
        </div>
        <div className="relative max-w-[var(--content-max)] mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs tracking-[0.2em] text-accent uppercase mb-2 block">
                MANAGE
              </span>
              <h1 className="font-display text-5xl tracking-wide text-text-primary mb-2">
                ORGANIZATIONS
              </h1>
              <p className="text-text-secondary">
                Create and manage your sports organizations, leagues, and clubs
              </p>
            </div>
            <Link
              href="/organizations/new"
              className="flex items-center gap-2 px-5 py-2.5 bg-accent text-text-inverse font-semibold rounded-lg hover:bg-accent-bright transition-all"
            >
              <span className="text-lg">+</span>
              <span>New Organization</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Organizations Grid */}
      <main className="px-6 pb-16">
        <div className="max-w-[var(--content-max)] mx-auto">
          {!organizations ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <OrganizationCardSkeleton key={i} />
              ))}
            </div>
          ) : organizations.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {organizations.map((org, index) => (
                <OrganizationCard key={org._id} organization={org} index={index} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function OrganizationCard({
  organization,
  index,
}: {
  organization: {
    _id: string;
    name: string;
    slug: string;
    image?: string;
    role: string;
  };
  index: number;
}) {
  const roleLabels: Record<string, string> = {
    owner: "Owner",
    admin: "Admin",
    scorer: "Scorer",
  };

  const roleColors: Record<string, string> = {
    owner: "text-accent bg-accent/10 border-accent/30",
    admin: "text-info bg-info/10 border-info/30",
    scorer: "text-success bg-success/10 border-success/30",
  };

  return (
    <Link
      href={`/organizations/${organization.slug}`}
      className="group relative flex items-center gap-4 p-4 bg-bg-card border border-border rounded-xl hover:border-accent/30 hover:bg-bg-card-hover transition-all animate-fadeInUp"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex items-center gap-4 flex-1">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-lg bg-bg-elevated border border-border flex items-center justify-center text-2xl font-display text-accent overflow-hidden">
          {organization.image ? (
            <img
              src={organization.image}
              alt={organization.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{organization.name.charAt(0).toUpperCase()}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary truncate">
            {organization.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-block px-2 py-0.5 text-xs rounded border ${roleColors[organization.role] || "text-text-muted bg-bg-elevated border-border"}`}
            >
              {roleLabels[organization.role] || organization.role}
            </span>
            <span className="text-text-muted text-sm">/{organization.slug}</span>
          </div>
        </div>

        {/* Arrow */}
        <div className="text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-all text-xl">
          →
        </div>
      </div>

      {/* Glow effect */}
      <div className="absolute inset-0 rounded-xl bg-accent/0 group-hover:bg-accent/5 transition-all pointer-events-none" />
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="text-6xl text-text-muted mb-6 animate-float">⬡</div>
      <h2 className="font-display text-2xl text-text-primary mb-3">
        No Organizations Yet
      </h2>
      <p className="text-text-secondary mb-8 max-w-md">
        Create your first organization to start managing tournaments, teams, and
        competitions.
      </p>
      <Link
        href="/organizations/new"
        className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-text-inverse font-semibold rounded-lg hover:bg-accent-bright transition-all"
      >
        <span>+</span> Create Organization
      </Link>
    </div>
  );
}

function OrganizationCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 bg-bg-card border border-border rounded-xl">
      <Skeleton className="w-14 h-14 rounded-lg" />
      <div className="flex-1">
        <Skeleton className="h-5 w-40 mb-2" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="w-6 h-6" />
    </div>
  );
}
