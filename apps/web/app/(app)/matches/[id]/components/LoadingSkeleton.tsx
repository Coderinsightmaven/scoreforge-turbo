"use client";

import type { JSX } from "react";

import { Skeleton, SkeletonScoreboard } from "@/app/components/Skeleton";

export function LoadingSkeleton(): JSX.Element {
  return (
    <div className="flex items-start justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <Skeleton className="w-40 h-5" />
        <div className="surface-panel surface-panel-rail relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-brand/40" />
          <div className="flex items-center justify-between border-b border-border/70 bg-bg-secondary px-6 py-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-2" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-7 w-24 rounded" />
          </div>

          {/* Scoreboard */}
          <SkeletonScoreboard />

          {/* Match Actions */}
          <div className="flex justify-center gap-4 px-6 pb-6">
            <Skeleton className="h-12 w-32 rounded-lg" />
          </div>

          {/* Match Info */}
          <div className="flex flex-wrap gap-6 border-t border-border/70 p-6">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-32 mt-1" />
            </div>
            <div className="flex flex-col gap-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-20 mt-1" />
            </div>
          </div>

          {/* Accent bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand" />
        </div>
      </div>
    </div>
  );
}
