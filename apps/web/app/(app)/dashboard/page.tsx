"use client";

import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/app/components/Skeleton";
import { Activity, ArrowUpRight, Plus, Trophy, Users, Zap } from "lucide-react";
import { FORMAT_LABELS, type TournamentFormat } from "@/app/lib/constants";

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

  const filteredTournaments = tournaments?.filter((tournament) => {
    if (filter === "all") return true;
    return tournament.status === filter;
  });

  if (user === undefined || tournaments === undefined) {
    return <DashboardSkeleton />;
  }

  const liveMatchCount = tournaments.reduce(
    (acc, tournament) => acc + tournament.liveMatchCount,
    0
  );
  const activeTournaments = tournaments.filter(
    (tournament) => tournament.status === "active"
  ).length;

  return (
    <div className="container space-y-8 py-4">
      {/* Welcome section */}
      <section className="animate-slideUp">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-caption text-muted-foreground">Dashboard</p>
            <h1 className="text-hero">Welcome back, {firstName}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {tournaments.length === 0
                ? "Create your first tournament to get started."
                : `You have ${tournaments.length} tournament${tournaments.length === 1 ? "" : "s"} in your workspace.`}
            </p>
          </div>

          {canCreate ? (
            <Button variant="brand" size="lg" asChild>
              <Link href="/tournaments/new">
                <Plus className="h-4 w-4" />
                New Tournament
              </Link>
            </Button>
          ) : (
            <div className="rounded-full border border-border bg-secondary px-5 py-2.5 text-sm text-muted-foreground">
              Tournament limit reached ({createStatus?.maxAllowed})
            </div>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          value={tournaments.length}
          label="Total tournaments"
          icon={<Trophy className="h-4 w-4" />}
        />
        <StatCard
          value={activeTournaments}
          label="Active tournaments"
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard value={liveMatchCount} label="Live matches" icon={<Zap className="h-4 w-4" />} />
        <StatCard
          value={tournaments.filter((tournament) => tournament.status === "draft").length}
          label="Draft tournaments"
          icon={<Activity className="h-4 w-4" />}
        />
      </section>

      {/* Filters */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter tournaments">
          {filters.map((activeFilter) => (
            <button
              key={activeFilter.value}
              onClick={() => setFilter(activeFilter.value)}
              role="tab"
              aria-selected={filter === activeFilter.value}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                filter === activeFilter.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {activeFilter.label}
            </button>
          ))}
        </div>

        {liveMatchCount > 0 && (
          <div className="inline-flex items-center gap-2 rounded-full bg-error-light px-4 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-error">
            <span className="live-dot" />
            {liveMatchCount} live match{liveMatchCount === 1 ? "" : "es"}
          </div>
        )}
      </section>

      {/* Tournament cards */}
      {tournaments.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Trophy className="h-8 w-8" />}
              title="No tournaments yet"
              description="Create your first tournament to start managing competitions and score live matches."
              action={
                canCreate ? (
                  <Button variant="brand" asChild>
                    <Link href="/tournaments/new">
                      <Plus className="h-4 w-4" />
                      Create Tournament
                    </Link>
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : filteredTournaments?.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              title={`No ${filter} tournaments`}
              description="Adjust your filter to see all tournaments in your workspace."
              action={
                <Button variant="outline" onClick={() => setFilter("all")}>
                  Show all tournaments
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredTournaments?.map((tournament, index) => (
            <div
              key={tournament._id}
              className="animate-staggerIn"
              style={{ animationDelay: `${index * 55}ms` }}
            >
              <TournamentCard tournament={tournament} />
            </div>
          ))}
        </div>
      )}
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
  };

  const formatLabels = FORMAT_LABELS;

  const statusVariants: Record<string, "muted" | "success" | "brand" | "destructive"> = {
    draft: "muted",
    active: "success",
    completed: "brand",
    cancelled: "destructive",
  };

  const hasLive = tournament.liveMatchCount > 0;

  return (
    <Link href={`/tournaments/${tournament._id}`} className="block">
      <Card
        className={`h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-md)] ${hasLive ? "ring-2 ring-error/30" : ""}`}
      >
        <CardHeader className="pb-1">
          <div className="flex items-start justify-between gap-3">
            <Badge variant={statusVariants[tournament.status] || "muted"}>
              {hasLive && <span className="live-dot" />}
              {tournament.status}
            </Badge>
            <Badge variant="outline">{tournament.isOwner ? "Owner" : "Scorer"}</Badge>
          </div>
          <CardTitle className="text-heading truncate">{tournament.name}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>{sportLabels[tournament.sport] || tournament.sport}</p>
            <p>{formatLabels[tournament.format as TournamentFormat] || tournament.format}</p>
            <p>
              {tournament.participantCount} of {tournament.maxParticipants} participants
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">
              {tournament.liveMatchCount} live match{tournament.liveMatchCount === 1 ? "" : "es"}
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-foreground">
              Open
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container space-y-8 py-4">
      <div>
        <Skeleton className="mb-3 h-4 w-28 rounded-full" />
        <Skeleton className="mb-2 h-12 w-96 max-w-full rounded-full" />
        <Skeleton className="h-5 w-72 max-w-full rounded-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((index) => (
          <Card key={index}>
            <CardContent className="space-y-2 p-5">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        {[1, 2, 3, 4].map((index) => (
          <Skeleton key={index} className="h-10 w-24 rounded-full" />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((index) => (
          <Card key={index}>
            <CardContent className="space-y-3 p-6">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-6 w-48 rounded-full" />
              <Skeleton className="h-4 w-32 rounded-full" />
              <Skeleton className="h-4 w-36 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
