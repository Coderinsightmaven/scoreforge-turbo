"use client";

import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable } from "@/components/ui/data-table";

import { Skeleton } from "@/app/components/Skeleton";
import { Activity, ArrowUpRight, Plus, Trophy, Users, Zap } from "lucide-react";
import { FORMAT_LABELS, type TournamentFormat } from "@/app/lib/constants";
import type { ColumnDef } from "@tanstack/react-table";
import NumberFlow from "@number-flow/react";

type Filter = "all" | "active" | "draft" | "completed";

export default function DashboardPage(): React.ReactNode {
  const user = useQuery(api.users.currentUser);
  const tournaments = useQuery(api.tournaments.listMyTournaments, {});
  const createStatus = useQuery(api.tournaments.canCreateTournament, {});
  const [filter, setFilter] = useState<Filter>("all");

  const canCreate = createStatus?.canCreate ?? true;
  const firstName = user?.name?.split(" ")[0] || "there";
  const tournamentList = useMemo(() => tournaments ?? [], [tournaments]);

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "draft", label: "Draft" },
    { value: "completed", label: "Completed" },
  ];

  const filteredTournaments = useMemo(() => {
    const base = tournamentList.filter((tournament) => {
      if (filter === "all") return true;
      return tournament.status === filter;
    });

    const sortedByActivity = [...base].sort((a, b) => {
      if (b.lastActivityAt !== a.lastActivityAt) {
        return b.lastActivityAt - a.lastActivityAt;
      }
      return b._creationTime - a._creationTime;
    });

    return sortedByActivity.slice(0, 3);
  }, [tournamentList, filter]);

  const liveMatchCount = tournamentList.reduce(
    (acc, tournament) => acc + tournament.liveMatchCount,
    0
  );
  const activeTournaments = tournamentList.filter(
    (tournament) => tournament.status === "active"
  ).length;

  const tableData = useMemo(
    () =>
      tournamentList.map((tournament) => ({
        id: tournament._id,
        name: tournament.name,
        status: tournament.status,
        format: FORMAT_LABELS[tournament.format as TournamentFormat] || tournament.format,
        liveMatches: tournament.liveMatchCount,
        participants: `${tournament.participantCount} / ${tournament.maxParticipants}`,
      })),
    [tournamentList]
  );

  const tableColumns = useMemo<ColumnDef<(typeof tableData)[number]>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Tournament",
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-semibold text-foreground">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{row.original.format}</p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.status === "active" ? "success" : "muted"}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "liveMatches",
        header: "Live",
        cell: ({ row }) => (
          <span className="font-semibold text-foreground">
            <NumberFlow value={row.original.liveMatches} />
          </span>
        ),
      },
      {
        accessorKey: "participants",
        header: "Participants",
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Link
            href={`/tournaments/${row.original.id}`}
            className="text-xs font-semibold uppercase tracking-[0.18em] text-brand hover:text-brand-hover"
          >
            Open
          </Link>
        ),
      },
    ],
    []
  );

  if (user === undefined || tournaments === undefined) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="container space-y-8">
      <section className="surface-panel surface-panel-rail p-6 sm:p-8 animate-slideUp">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-between">
          <div className="space-y-3">
            <p className="text-caption text-muted-foreground">Ops Overview</p>
            <h1 className="text-hero">Welcome back, {firstName}</h1>
            <p className="max-w-2xl text-body text-muted-foreground">
              {tournamentList.length === 0
                ? "Create your first tournament to start the ops board."
                : `You are tracking ${tournamentList.length} tournament${tournamentList.length === 1 ? "" : "s"} right now.`}
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 lg:gap-0 lg:justify-between lg:self-stretch">
            {liveMatchCount > 0 && (
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-brand">
                <span className="live-dot" />
                {liveMatchCount} live match{liveMatchCount === 1 ? "" : "es"}
              </div>
            )}
            {canCreate ? (
              <Button variant="brand" size="lg" asChild>
                <Link href="/tournaments/new">
                  <Plus className="h-4 w-4" />
                  New Tournament
                </Link>
              </Button>
            ) : (
              <div className="rounded-full border border-border bg-bg-secondary px-5 py-2.5 text-sm text-muted-foreground">
                Tournament limit reached ({createStatus?.maxAllowed})
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="onborda-ops-stats" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          value={<NumberFlow value={tournamentList.length} />}
          label="Total tournaments"
          icon={<Trophy className="h-4 w-4" />}
        />
        <StatCard
          value={<NumberFlow value={activeTournaments} />}
          label="Active tournaments"
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          value={<NumberFlow value={liveMatchCount} />}
          label="Live matches"
          icon={<Zap className="h-4 w-4" />}
        />
        <StatCard
          value={
            <NumberFlow
              value={tournamentList.filter((tournament) => tournament.status === "draft").length}
            />
          }
          label="Draft tournaments"
          icon={<Activity className="h-4 w-4" />}
        />
      </section>

      <section className="surface-panel p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter tournaments">
            {filters.map((activeFilter) => (
              <Button
                key={activeFilter.value}
                onClick={() => setFilter(activeFilter.value)}
                role="tab"
                aria-selected={filter === activeFilter.value}
                variant={filter === activeFilter.value ? "brand" : "outline"}
                size="sm"
              >
                {activeFilter.label}
              </Button>
            ))}
          </div>

          <div className="hidden sm:block" />
        </div>
      </section>

      {/* Tournament cards */}
      {tournamentList.length === 0 ? (
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
      ) : filteredTournaments.length === 0 ? (
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
        <div id="onborda-ops-tournaments" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredTournaments.map((tournament, index) => (
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

      <section id="onborda-ops-table" className="surface-panel surface-panel-rail p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-caption text-muted-foreground">Ops Directory</p>
            <h2 className="mt-2 text-heading">Tournament operations table</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Search, sort, and jump straight into any active tournament.
            </p>
          </div>
        </div>
        <div className="mt-6">
          <DataTable columns={tableColumns} data={tableData} searchKey="name" />
        </div>
      </section>
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
        className={`relative h-full overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-md)] ${
          hasLive ? "ring-2 ring-live/30" : ""
        }`}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-brand/70" />
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

          <div className="flex items-center justify-between border-t border-border/70 pt-3 text-sm">
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
    <div className="container space-y-8">
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
