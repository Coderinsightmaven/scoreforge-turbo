"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandQuickDrawer } from "./CommandQuickDrawer";

export function CommandHeader({ onMenuToggle }: { onMenuToggle: () => void }): React.ReactNode {
  const tournaments = useQuery(api.tournaments.listMyTournaments, {});

  const liveMatchCount = tournaments?.reduce(
    (acc, tournament) => acc + tournament.liveMatchCount,
    0
  );

  return (
    <header
      id="onborda-command-header"
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
          {tournaments !== undefined && liveMatchCount && liveMatchCount > 0 ? (
            <div className="hidden items-center gap-2 text-xs text-brand sm:flex">
              <span className="live-dot" />
              {liveMatchCount} live matches
            </div>
          ) : (
            <span className="hidden text-xs text-muted-foreground sm:block">All courts idle</span>
          )}
        </div>

        <div className="hidden flex-1 items-center xl:flex" />

        <div className="ml-auto flex items-center gap-2">
          <div className="sm:hidden">
            <CommandQuickDrawer />
          </div>
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
