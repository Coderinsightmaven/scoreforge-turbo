"use client";

import { ReactNode } from "react";

// Base skeleton element with shimmer animation
export function Skeleton({
  className = "",
  children,
}: {
  className?: string;
  children?: ReactNode;
}): ReactNode {
  return (
    <div
      className={`relative overflow-hidden bg-bg-elevated rounded animate-pulse ${className}`}
    >
      {children}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/5 to-transparent animate-shimmer" />
    </div>
  );
}

// Skeleton for text lines
export function SkeletonText({
  lines = 1,
  className = "",
}: {
  lines?: number;
  className?: string;
}): ReactNode {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"}`}
        />
      ))}
    </div>
  );
}

// Skeleton for avatars/circles
export function SkeletonAvatar({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}): ReactNode {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-20 h-20",
  };

  return <Skeleton className={`${sizeClasses[size]} rounded-full ${className}`} />;
}

// Skeleton for cards
export function SkeletonCard({
  className = "",
  children,
}: {
  className?: string;
  children?: ReactNode;
}): ReactNode {
  return (
    <div className={`bg-bg-card border border-border rounded-xl p-4 ${className}`}>
      {children || (
        <>
          <Skeleton className="h-12 w-12 rounded-lg mb-4" />
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </>
      )}
    </div>
  );
}

// Skeleton for stat cards
export function SkeletonStatCard({ className = "" }: { className?: string }): ReactNode {
  return (
    <div className={`bg-bg-card border border-border rounded-xl p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

// Skeleton for list items
export function SkeletonListItem({ className = "" }: { className?: string }): ReactNode {
  return (
    <div className={`flex items-center gap-4 p-4 ${className}`}>
      <SkeletonAvatar size="md" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>
  );
}

// Skeleton for tables
export function SkeletonTable({
  rows = 5,
  cols = 4,
  className = "",
}: {
  rows?: number;
  cols?: number;
  className?: string;
}): ReactNode {
  return (
    <div className={`bg-bg-card border border-border rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-border bg-bg-secondary">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex gap-4 p-4 border-b border-border last:border-b-0"
        >
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={`h-4 flex-1 ${colIndex === 0 ? "w-1/4" : ""}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Skeleton for tournament brackets
export function SkeletonBracket({ className = "" }: { className?: string }): ReactNode {
  return (
    <div className={`flex gap-8 overflow-x-auto p-4 ${className}`}>
      {[4, 2, 1].map((count, roundIndex) => (
        <div key={roundIndex} className="flex flex-col gap-4 min-w-[200px]">
          <Skeleton className="h-5 w-20 mb-2" />
          {Array.from({ length: count }).map((_, matchIndex) => (
            <div
              key={matchIndex}
              className="bg-bg-card border border-border rounded-lg overflow-hidden"
            >
              <div className="flex items-center gap-2 p-3 border-b border-border">
                <Skeleton className="w-6 h-6 rounded" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-6" />
              </div>
              <div className="flex items-center gap-2 p-3">
                <Skeleton className="w-6 h-6 rounded" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-6" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Skeleton for match scoreboard
export function SkeletonScoreboard({ className = "" }: { className?: string }): ReactNode {
  return (
    <div className={`flex items-center justify-center gap-4 p-8 ${className}`}>
      {/* Team 1 */}
      <div className="flex-1 flex flex-col items-center gap-4 p-6 bg-bg-secondary border border-border rounded-xl">
        <Skeleton className="h-5 w-8 mb-1" />
        <Skeleton className="h-6 w-32 mb-1" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-12 w-16 mt-2" />
      </div>

      {/* VS */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <Skeleton className="h-8 w-12" />
      </div>

      {/* Team 2 */}
      <div className="flex-1 flex flex-col items-center gap-4 p-6 bg-bg-secondary border border-border rounded-xl">
        <Skeleton className="h-5 w-8 mb-1" />
        <Skeleton className="h-6 w-32 mb-1" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-12 w-16 mt-2" />
      </div>
    </div>
  );
}

// Skeleton for page headers
export function SkeletonPageHeader({
  withBackButton = false,
  withActions = false,
  className = "",
}: {
  withBackButton?: boolean;
  withActions?: boolean;
  className?: string;
}): ReactNode {
  return (
    <div className={`${className}`}>
      {withBackButton && <Skeleton className="h-5 w-24 mb-4" />}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        {withActions && (
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        )}
      </div>
    </div>
  );
}

// Skeleton for tabs
export function SkeletonTabs({
  count = 4,
  className = "",
}: {
  count?: number;
  className?: string;
}): ReactNode {
  return (
    <div className={`flex gap-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-28 rounded-lg" />
      ))}
    </div>
  );
}

// Skeleton for form sections
export function SkeletonForm({
  fields = 3,
  className = "",
}: {
  fields?: number;
  className?: string;
}): ReactNode {
  return (
    <div className={`space-y-6 ${className}`}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      ))}
      <div className="flex justify-end pt-4">
        <Skeleton className="h-12 w-32 rounded-lg" />
      </div>
    </div>
  );
}
