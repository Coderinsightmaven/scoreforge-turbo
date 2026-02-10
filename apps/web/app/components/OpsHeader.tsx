"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { Activity, Braces, Menu, Plus } from "lucide-react";
import NumberFlow from "@number-flow/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OpsQuickDrawer } from "./OpsQuickDrawer";

export function OpsHeader({ onMenuToggle }: { onMenuToggle: () => void }): React.ReactNode {
  const tournaments = useQuery(api.tournaments.listMyTournaments, {});

  const liveMatchCount = tournaments?.reduce(
    (acc, tournament) => acc + tournament.liveMatchCount,
    0
  );
  const activeCount = tournaments?.filter((tournament) => tournament.status === "active").length;
  const totalCount = tournaments?.length;

  const tickerItems = tournaments
    ? [
        { label: "Active", value: activeCount ?? 0 },
        { label: "Total", value: totalCount ?? 0 },
        { label: "Live", value: liveMatchCount ?? 0 },
      ]
    : [];

  return (
    <header
      id="onborda-ops-header"
      className="sticky top-0 z-40 border-b border-border/80 bg-bg-secondary/90 backdrop-blur no-print"
    >
      <div className="mx-auto flex h-14 items-center gap-4 px-4 lg:px-8">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuToggle}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-border bg-bg-tertiary px-3 py-1">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Ops Live
            </span>
            <span
              className={cn(
                "ml-1 text-xs font-semibold",
                liveMatchCount && liveMatchCount > 0 ? "text-brand" : "text-muted-foreground"
              )}
            >
              {tournaments === undefined ? "--" : <NumberFlow value={liveMatchCount ?? 0} />}
            </span>
          </div>

          {tournaments !== undefined && liveMatchCount && liveMatchCount > 0 ? (
            <div className="hidden items-center gap-2 text-xs text-brand sm:flex">
              <span className="live-dot" />
              {liveMatchCount} live matches
            </div>
          ) : (
            <span className="hidden text-xs text-muted-foreground sm:block">All courts idle</span>
          )}
        </div>

        <div className="hidden flex-1 items-center overflow-hidden xl:flex">
          <div className="ticker-track animate-tickerSlide">
            {tickerItems.map((item) => (
              <span key={item.label} className="ticker-chip">
                {item.label}
                <strong className="text-foreground">
                  <NumberFlow value={item.value} />
                </strong>
              </span>
            ))}
            {tickerItems.map((item) => (
              <span key={`dup-${item.label}`} className="ticker-chip" aria-hidden="true">
                {item.label}
                <strong className="text-foreground">
                  <NumberFlow value={item.value} />
                </strong>
              </span>
            ))}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="sm:hidden">
            <OpsQuickDrawer />
          </div>
          <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/brackets/quick">
              <Braces className="h-4 w-4" />
              Quick Bracket
            </Link>
          </Button>
          <Button variant="brand" size="sm" asChild>
            <Link href="/tournaments/new">
              <Plus className="h-4 w-4" />
              New Tournament
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
