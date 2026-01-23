"use client";

import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const router = useRouter();
  const user = useQuery(api.users.currentUser);
  const organizations = useQuery(api.organizations.listMyOrganizations);
  const onboardingState = useQuery(api.users.getOnboardingState);

  // Redirect to onboarding if user hasn't completed setup
  useEffect(() => {
    if (onboardingState === undefined) return;
    if (onboardingState === null) {
      router.push("/sign-in");
      return;
    }

    // If user has no organizations and has pending invitations, redirect to onboarding
    if (onboardingState.organizationCount === 0) {
      router.push("/onboarding");
    }
  }, [onboardingState, router]);

  const greeting = getGreeting();
  const firstName = user?.name?.split(" ")[0] || "there";

  // Show loading while checking onboarding state
  if (onboardingState === undefined || (onboardingState && onboardingState.organizationCount === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl text-accent animate-float mb-4">⚡</div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 px-6">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-accent/10 blur-[120px] rounded-full" />
          <div className="absolute inset-0 grid-bg opacity-50" />
        </div>

        <div className="relative max-w-[var(--content-max)] mx-auto">
          <span className="inline-flex items-center gap-2 text-xs tracking-[0.2em] text-text-muted uppercase mb-4">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Command Center
          </span>
          <h1 className="font-display text-5xl md:text-7xl tracking-wide text-text-primary mb-2">
            {greeting}, <span className="text-accent">{firstName}</span>
          </h1>
          <p className="text-lg text-text-secondary">
            Your tournaments, teams, and matches at a glance
          </p>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="px-6 pb-12">
        <div className="max-w-[var(--content-max)] mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon="⬡"
              label="Organizations"
              value={organizations?.length ?? 0}
              href="/organizations"
              accentColor="accent"
            />
            <StatCard
              icon="◎"
              label="Active Tournaments"
              value={0}
              href="/tournaments"
              accentColor="gold"
            />
            <StatCard
              icon="◇"
              label="Teams"
              value={0}
              href="/teams"
              accentColor="red"
            />
            <StatCard
              icon="▣"
              label="Live Matches"
              value={0}
              href="/tournaments"
              accentColor="accent"
              isLive
            />
          </div>
        </div>
      </section>

      {/* Organizations Section */}
      <section className="px-6 pb-12">
        <div className="max-w-[var(--content-max)] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl text-accent">⬡</span>
              <h2 className="font-display text-xl tracking-wide text-text-primary">
                YOUR ORGANIZATIONS
              </h2>
            </div>
            <Link
              href="/organizations/new"
              className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/30 rounded-lg text-sm text-accent hover:bg-accent/20 transition-all"
            >
              <span>+</span> New Organization
            </Link>
          </div>

          {!organizations ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-bg-card rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : organizations.length === 0 ? (
            <EmptyState
              icon="⬡"
              title="No Organizations Yet"
              description="Create your first organization to start managing tournaments and teams."
              actionLabel="Create Organization"
              actionHref="/organizations/new"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {organizations.map((org, index) => (
                <OrganizationCard
                  key={org._id}
                  organization={org}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="px-6 pb-16">
        <div className="max-w-[var(--content-max)] mx-auto">
          <h3 className="font-display text-sm tracking-[0.2em] text-text-muted mb-4">
            QUICK ACTIONS
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuickAction
              icon="◎"
              label="Create Tournament"
              description="Start a new bracket or round robin"
              href="/tournaments/new"
            />
            <QuickAction
              icon="◇"
              label="Create Team"
              description="Add a new team to manage"
              href="/teams/new"
            />
            <QuickAction
              icon="👥"
              label="Invite Members"
              description="Grow your organization"
              href="/organizations"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function StatCard({
  icon,
  label,
  value,
  href,
  accentColor,
  isLive,
}: {
  icon: string;
  label: string;
  value: number;
  href: string;
  accentColor: "accent" | "gold" | "red";
  isLive?: boolean;
}) {
  const colorClasses = {
    accent: "border-accent/20 hover:border-accent/40 hover:bg-accent/5",
    gold: "border-gold/20 hover:border-gold/40 hover:bg-gold/5",
    red: "border-red/20 hover:border-red/40 hover:bg-red/5",
  };

  const iconColors = {
    accent: "text-accent",
    gold: "text-gold",
    red: "text-red",
  };

  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 p-5 bg-bg-card border rounded-xl transition-all ${colorClasses[accentColor]}`}
    >
      <div className={`text-2xl ${iconColors[accentColor]}`}>{icon}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-display text-text-primary">{value}</span>
          {isLive && value > 0 && (
            <span className="w-2 h-2 rounded-full bg-red animate-pulse" />
          )}
        </div>
        <div className="text-sm text-text-secondary">{label}</div>
      </div>
      <div className="text-text-muted group-hover:text-text-secondary group-hover:translate-x-1 transition-all">
        →
      </div>
    </Link>
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
  const roleColors: Record<string, string> = {
    owner: "text-accent bg-accent/10 border-accent/30",
    admin: "text-info bg-info/10 border-info/30",
    scorer: "text-success bg-success/10 border-success/30",
  };

  return (
    <Link
      href={`/organizations/${organization.slug}`}
      className="group relative flex items-center gap-4 p-4 bg-bg-card border border-border rounded-xl hover:border-accent/30 hover:bg-bg-card-hover transition-all animate-fadeInUp"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="w-12 h-12 rounded-lg bg-bg-elevated border border-border flex items-center justify-center text-xl font-display text-accent overflow-hidden">
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
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-text-primary truncate">
          {organization.name}
        </h3>
        <span
          className={`inline-block px-2 py-0.5 text-xs rounded border ${roleColors[organization.role] || "text-text-muted bg-bg-elevated border-border"}`}
        >
          {organization.role}
        </span>
      </div>
      <div className="text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-all">
        →
      </div>

      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-xl bg-accent/0 group-hover:bg-accent/5 transition-all pointer-events-none" />
    </Link>
  );
}

function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-bg-card/50 border border-border rounded-xl">
      <div className="text-5xl text-text-muted mb-4 animate-float">{icon}</div>
      <h3 className="font-display text-xl text-text-primary mb-2">{title}</h3>
      <p className="text-text-secondary mb-6 max-w-md">{description}</p>
      <Link
        href={actionHref}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-text-inverse font-semibold rounded-lg hover:bg-accent-bright transition-all"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  description,
  href,
}: {
  icon: string;
  label: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 p-4 bg-bg-card border border-border rounded-xl hover:border-accent/30 hover:bg-bg-card-hover transition-all"
    >
      <div className="text-2xl text-accent">{icon}</div>
      <div className="flex-1">
        <span className="block font-semibold text-text-primary">{label}</span>
        <span className="text-sm text-text-secondary">{description}</span>
      </div>
      <span className="text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-all">
        →
      </span>
    </Link>
  );
}
