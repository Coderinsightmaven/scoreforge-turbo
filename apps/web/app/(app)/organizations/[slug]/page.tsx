"use client";

import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { useState } from "react";
import Link from "next/link";
import { use } from "react";
import { Skeleton, SkeletonTabs, SkeletonCard } from "@/app/components/Skeleton";

type Tab = "tournaments" | "teams" | "members";

export default function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [activeTab, setActiveTab] = useState<Tab>("tournaments");
  const organization = useQuery(api.organizations.getOrganizationBySlug, { slug });
  const tournaments = useQuery(
    api.tournaments.listByOrganization,
    organization ? { organizationId: organization._id } : "skip"
  );
  const teams = useQuery(
    api.teams.listByOrganization,
    organization ? { organizationId: organization._id } : "skip"
  );
  const members = useQuery(
    api.organizationMembers.listMembers,
    organization ? { organizationId: organization._id } : "skip"
  );

  if (organization === undefined) {
    return <LoadingSkeleton />;
  }

  if (organization === null) {
    return <NotFound />;
  }

  const tabs: { id: Tab; label: string; icon: string; count?: number }[] = [
    { id: "tournaments", label: "Tournaments", icon: "◎", count: tournaments?.length },
    { id: "teams", label: "Teams", icon: "◇", count: teams?.length },
    { id: "members", label: "Members", icon: "👥", count: members?.length },
  ];

  const roleColors: Record<string, string> = {
    owner: "text-accent bg-accent/10 border-accent/30",
    admin: "text-info bg-info/10 border-info/30",
    scorer: "text-success bg-success/10 border-success/30",
  };

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <header className="relative overflow-hidden py-8 px-6">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-accent/10 blur-[100px] rounded-full" />
          <div className="absolute inset-0 grid-bg opacity-50" />
        </div>
        <div className="relative max-w-[var(--content-max)] mx-auto">
          <Link
            href="/organizations"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-accent transition-colors mb-6"
          >
            <span>←</span> Organizations
          </Link>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-xl bg-bg-elevated border border-border flex items-center justify-center text-3xl font-display text-accent overflow-hidden">
              {organization.image ? (
                <img
                  src={organization.image}
                  alt={organization.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                organization.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <h1 className="font-display text-4xl tracking-wide text-text-primary">
                {organization.name}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <span
                  className={`inline-block px-3 py-1 text-sm rounded-lg border ${roleColors[organization.myRole || ""] || "text-text-muted bg-bg-elevated border-border"}`}
                >
                  {organization.myRole}
                </span>
                <span className="text-text-muted">/{organization.slug}</span>
              </div>
            </div>
            {(organization.myRole === "owner" || organization.myRole === "admin") && (
              <Link
                href={`/organizations/${slug}/settings`}
                className="px-4 py-2 bg-bg-card border border-border rounded-lg text-text-secondary hover:text-text-primary hover:border-accent/30 transition-all"
              >
                Settings
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="px-6 border-b border-border">
        <div className="max-w-[var(--content-max)] mx-auto">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? "text-accent border-accent"
                    : "text-text-secondary border-transparent hover:text-text-primary"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="px-2 py-0.5 text-xs bg-bg-card rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="px-6 py-8">
        <div className="max-w-[var(--content-max)] mx-auto">
          {activeTab === "tournaments" && (
            <TournamentsTab
              tournaments={tournaments}
              organizationSlug={slug}
              canCreate={organization.myRole === "owner" || organization.myRole === "admin"}
            />
          )}
          {activeTab === "teams" && (
            <TeamsTab
              teams={teams}
              organizationSlug={slug}
              canCreate={organization.myRole === "owner" || organization.myRole === "admin"}
            />
          )}
          {activeTab === "members" && (
            <MembersTab
              members={members}
              canInvite={organization.myRole === "owner" || organization.myRole === "admin"}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function TournamentsTab({
  tournaments,
  organizationSlug,
  canCreate,
}: {
  tournaments?: {
    _id: string;
    name: string;
    sport: string;
    format: string;
    status: string;
    participantCount: number;
    maxParticipants: number;
  }[];
  organizationSlug: string;
  canCreate: boolean;
}) {
  if (!tournaments) {
    return <TabSkeleton />;
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-lg tracking-wide text-text-primary">
          TOURNAMENTS
        </h2>
        {canCreate && (
          <Link
            href={`/organizations/${organizationSlug}/tournaments/new`}
            className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/30 rounded-lg text-sm text-accent hover:bg-accent/20 transition-all"
          >
            <span>+</span> New Tournament
          </Link>
        )}
      </div>

      {tournaments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-4xl text-text-muted mb-4">◎</span>
          <p className="text-text-secondary mb-4">No tournaments yet</p>
          {canCreate && (
            <Link
              href={`/organizations/${organizationSlug}/tournaments/new`}
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Create Tournament
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map((tournament, index) => (
            <Link
              key={tournament._id}
              href={`/tournaments/${tournament._id}`}
              className="group p-4 bg-bg-card border border-border rounded-xl hover:border-accent/30 hover:bg-bg-card-hover transition-all animate-fadeInUp"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">
                  {sportIcons[tournament.sport] || "🏆"}
                </span>
                <span
                  className={`px-2 py-0.5 text-xs rounded border ${statusColors[tournament.status] || statusColors.draft}`}
                >
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamsTab({
  teams,
  organizationSlug,
  canCreate,
}: {
  teams?: {
    _id: string;
    name: string;
    image?: string;
    captainName?: string;
    memberCount: number;
  }[];
  organizationSlug: string;
  canCreate: boolean;
}) {
  if (!teams) {
    return <TabSkeleton />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-lg tracking-wide text-text-primary">
          TEAMS
        </h2>
        {canCreate && (
          <Link
            href={`/organizations/${organizationSlug}/teams/new`}
            className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/30 rounded-lg text-sm text-accent hover:bg-accent/20 transition-all"
          >
            <span>+</span> New Team
          </Link>
        )}
      </div>

      {teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-4xl text-text-muted mb-4">◇</span>
          <p className="text-text-secondary mb-4">No teams yet</p>
          {canCreate && (
            <Link
              href={`/organizations/${organizationSlug}/teams/new`}
              className="text-accent hover:text-accent-bright transition-colors"
            >
              Create Team
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team, index) => (
            <Link
              key={team._id}
              href={`/teams/${team._id}`}
              className="group p-4 bg-bg-card border border-border rounded-xl hover:border-accent/30 hover:bg-bg-card-hover transition-all animate-fadeInUp"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="w-12 h-12 rounded-lg bg-bg-elevated border border-border flex items-center justify-center text-xl font-display text-accent mb-3 overflow-hidden">
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
              <h3 className="font-semibold text-text-primary mb-1 truncate">
                {team.name}
              </h3>
              <div className="flex flex-col gap-1 text-sm text-text-secondary">
                {team.captainName && <span>Capt: {team.captainName}</span>}
                <span>{team.memberCount} members</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MembersTab({
  members,
  canInvite,
}: {
  members?: {
    _id: string;
    userId: string;
    role: string;
    joinedAt: number;
    user: {
      _id: string;
      name?: string;
      email?: string;
      image?: string;
    };
  }[];
  canInvite: boolean;
}) {
  if (!members) {
    return <TabSkeleton />;
  }

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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-lg tracking-wide text-text-primary">
          MEMBERS
        </h2>
        {canInvite && (
          <button className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/30 rounded-lg text-sm text-accent hover:bg-accent/20 transition-all">
            <span>+</span> Invite Member
          </button>
        )}
      </div>

      <div className="space-y-2">
        {members.map((member, index) => (
          <div
            key={member._id}
            className="flex items-center gap-4 p-4 bg-bg-card border border-border rounded-xl animate-fadeInUp"
            style={{ animationDelay: `${index * 0.03}s` }}
          >
            <div className="w-10 h-10 rounded-full bg-bg-elevated border border-border flex items-center justify-center text-sm font-semibold text-accent">
              {member.user.name?.charAt(0).toUpperCase() ||
                member.user.email?.charAt(0).toUpperCase() ||
                "?"}
            </div>
            <div className="flex-1 min-w-0">
              <span className="block font-medium text-text-primary truncate">
                {member.user.name || member.user.email || "Unknown"}
              </span>
              <span className="text-sm text-text-muted">{member.user.email}</span>
            </div>
            <span
              className={`px-3 py-1 text-xs rounded-lg border ${roleColors[member.role] || "text-text-muted bg-bg-elevated border-border"}`}
            >
              {roleLabels[member.role] || member.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <header className="relative overflow-hidden py-8 px-6">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-accent/10 blur-[100px] rounded-full" />
          <div className="absolute inset-0 grid-bg opacity-50" />
        </div>
        <div className="relative max-w-[var(--content-max)] mx-auto">
          <Skeleton className="w-28 h-5 mb-6" />
          <div className="flex items-center gap-6">
            <Skeleton className="w-20 h-20 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-10 w-64 mb-2" />
              <div className="flex items-center gap-3 mt-2">
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
            <Skeleton className="h-10 w-24 rounded-lg" />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="px-6 border-b border-border">
        <div className="max-w-[var(--content-max)] mx-auto">
          <SkeletonTabs count={3} className="py-3" />
        </div>
      </nav>

      {/* Content */}
      <main className="px-6 py-8">
        <div className="max-w-[var(--content-max)] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-36 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="text-6xl text-text-muted mb-6">⬡</div>
      <h1 className="font-display text-3xl text-text-primary mb-3">
        Organization Not Found
      </h1>
      <p className="text-text-secondary mb-8">
        This organization doesn&apos;t exist or you don&apos;t have access.
      </p>
      <Link
        href="/organizations"
        className="inline-flex items-center gap-2 text-accent hover:text-accent-bright transition-colors"
      >
        ← Back to Organizations
      </Link>
    </div>
  );
}

function TabSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="p-4 bg-bg-card border border-border rounded-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="w-10 h-10 rounded" />
              <Skeleton className="w-16 h-5 rounded" />
            </div>
            <Skeleton className="h-5 w-3/4 mb-2" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
