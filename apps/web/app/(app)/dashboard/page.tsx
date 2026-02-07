"use client";

import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/app/components/Skeleton";
import { Plus, Trophy } from "lucide-react";
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
    <div className="min-h-screen bg-background py-8">
      <div className="container">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-title text-foreground mb-2 font-[family-name:var(--font-display)]">
            Welcome back, {firstName}
          </h1>
          <p className="text-body text-muted-foreground">
            {tournaments.length === 0
              ? "Create your first tournament to get started"
              : `You have ${tournaments.length} tournament${tournaments.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {/* Live matches alert */}
        {liveMatchCount > 0 && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-4">
            <div className="live-dot" />
            <div>
              <p className="font-medium text-foreground">
                {liveMatchCount} match{liveMatchCount === 1 ? "" : "es"} in progress
              </p>
              <p className="text-small text-muted-foreground">
                Tap a tournament to see live scores
              </p>
            </div>
          </div>
        )}

        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          {/* Filters */}
          {tournaments.length > 0 && (
            <div className="flex gap-4" role="tablist">
              {filters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  role="tab"
                  aria-selected={filter === f.value}
                  className={`pb-1 text-sm transition-colors ${
                    filter === f.value
                      ? "border-b-2 border-brand text-brand font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Create button */}
          {canCreate ? (
            <Button variant="brand" asChild>
              <Link href="/tournaments/new">
                <Plus className="w-5 h-5" />
                New Tournament
              </Link>
            </Button>
          ) : (
            <div className="text-small text-muted-foreground">
              Tournament limit reached ({createStatus?.maxAllowed})
            </div>
          )}
        </div>

        {/* Tournament list */}
        {tournaments.length === 0 ? (
          <EmptyState canCreate={canCreate} />
        ) : filteredTournaments?.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No {filter} tournaments</p>
            <button onClick={() => setFilter("all")} className="mt-2 text-brand hover:underline">
              Show all tournaments
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTournaments?.map((tournament, index) => (
              <div
                key={tournament._id}
                className="animate-staggerIn"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <TournamentCard tournament={tournament} />
              </div>
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
        className={`h-full transition-all hover:border-border hover:shadow-md ${hasLive ? "ring-2 ring-red-500/30" : ""}`}
      >
        <CardContent className="pt-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <Badge variant={statusVariants[tournament.status] || "muted"}>
              {hasLive && <span className="live-dot" />}
              {tournament.status}
            </Badge>
            <span className="text-small text-muted-foreground">
              {tournament.isOwner ? "Owner" : "Scorer"}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-heading text-foreground mb-2 truncate font-[family-name:var(--font-display)]">
            {tournament.name}
          </h3>

          {/* Details */}
          <div className="space-y-1 text-small text-muted-foreground">
            <p>{sportLabels[tournament.sport] || tournament.sport}</p>
            <p>{formatLabels[tournament.format as TournamentFormat] || tournament.format}</p>
            <p>
              {tournament.participantCount} of {tournament.maxParticipants} players
            </p>
          </div>

          {/* Live indicator */}
          {hasLive && (
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-small text-red-600 dark:text-red-400 font-medium">
                {tournament.liveMatchCount} live match{tournament.liveMatchCount === 1 ? "" : "es"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({ canCreate }: { canCreate: boolean }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 mx-auto mb-6 bg-secondary rounded-2xl flex items-center justify-center">
        <Trophy className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-heading text-foreground mb-2 font-[family-name:var(--font-display)]">
        No tournaments yet
      </h2>
      <p className="text-body text-muted-foreground mb-6 max-w-sm mx-auto">
        Create your first tournament to start managing competitions
      </p>
      {canCreate && (
        <Button variant="brand" asChild>
          <Link href="/tournaments/new">
            <Plus className="w-5 h-5" />
            Create Tournament
          </Link>
        </Button>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-20" />
            ))}
          </div>
          <Skeleton className="h-12 w-40" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-20 mb-3" />
                <Skeleton className="h-6 w-48 mb-2" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
