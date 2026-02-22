"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import { Id } from "@repo/convex/dataModel";
import { toast } from "sonner";
import { getDisplayMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";
import { TabSkeleton } from "@/app/components/TabSkeleton";

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/** Format a timestamp to a datetime-local input value (YYYY-MM-DDTHH:mm). */
function formatDateTimeInput(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse a datetime-local input value to epoch ms, or null if invalid. */
function parseDateTimeInput(value: string): number | null {
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** Format a timestamp as a localized short time string (e.g. "9:00 AM"). */
function formatTimeLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Return tomorrow at 9 AM as epoch ms. */
function defaultStartTimestamp(): number {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
}

/** Return a date key string for grouping (e.g. "2026-03-15"). */
function toDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Format a date key for display (e.g. "Sat Mar 15"). */
function formatDayLabel(dateKey: string): string {
  const d = new Date(dateKey + "T12:00:00"); // noon to avoid timezone edge cases
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ScheduleMatch = {
  _id: Id<"matches">;
  round: number;
  matchNumber: number;
  bracketType?: string;
  bracketName?: string;
  status: "pending" | "scheduled" | "live" | "completed" | "bye";
  scheduledTime?: number;
  court?: string;
  participant1Name?: string;
  participant2Name?: string;
  participant1Id?: Id<"tournamentParticipants">;
  participant2Id?: Id<"tournamentParticipants">;
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScheduleMatchCard({
  match,
  canManage,
  hasConflict,
  durationMs,
}: {
  match: ScheduleMatch;
  canManage: boolean;
  hasConflict: boolean;
  durationMs: number;
}) {
  const isDraggable = canManage && match.status === "scheduled";

  const statusColor: Record<string, string> = {
    scheduled: "border-brand/40 bg-brand/5",
    live: "border-emerald-500/40 bg-emerald-500/5",
    completed: "border-border bg-bg-secondary",
    pending: "border-border bg-secondary/40",
  };

  const colorClass = statusColor[match.status] ?? "border-border bg-bg-secondary";

  const heightPx = Math.max(Math.round((durationMs / 60_000) * 2), 36);

  return (
    <div
      draggable={isDraggable}
      onDragStart={(e) => {
        if (!isDraggable) return;
        e.dataTransfer.setData("matchId", match._id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`rounded-lg border px-2 py-1 text-xs transition-shadow ${colorClass} ${
        hasConflict ? "ring-2 ring-red-500" : ""
      } ${isDraggable ? "cursor-grab active:cursor-grabbing" : ""}`}
      style={{ minHeight: `${heightPx}px` }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-semibold text-foreground truncate">
          R{match.round} M{match.matchNumber}
        </span>
        {match.scheduledTime && (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatTimeLabel(match.scheduledTime)}
          </span>
        )}
      </div>
      <div className="truncate text-muted-foreground">
        {match.participant1Name ?? "TBD"} vs {match.participant2Name ?? "TBD"}
      </div>
      {match.bracketName && (
        <div className="truncate text-muted-foreground/60 text-[10px]">{match.bracketName}</div>
      )}
    </div>
  );
}

function ScheduleGrid({
  courts,
  scheduledMatches,
  conflictMatchIds,
  canManage,
  durationMs,
  onDrop,
}: {
  courts: string[];
  scheduledMatches: ScheduleMatch[];
  conflictMatchIds: Set<string>;
  canManage: boolean;
  durationMs: number;
  onDrop: (matchId: string, court: string, time: number) => void;
}) {
  if (courts.length === 0) {
    return (
      <div className="surface-panel p-8 text-center text-muted-foreground">
        No courts configured. Add courts in the tournament settings to enable scheduling.
      </div>
    );
  }

  if (scheduledMatches.length === 0) {
    return (
      <div
        className="surface-panel p-8 text-center border-2 border-dashed border-border/50 rounded-lg"
        onDragOver={(e) => {
          if (!canManage) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => {
          e.preventDefault();
          const matchId = e.dataTransfer.getData("matchId");
          if (matchId && courts.length > 0) {
            // Use a reasonable default time — current time rounded up to the next 30 min
            const now = Date.now();
            const slotMs = 30 * 60_000;
            const defaultTime = Math.ceil(now / slotMs) * slotMs;
            onDrop(matchId, courts[0]!, defaultTime);
          }
        }}
      >
        <p className="text-muted-foreground">No matches scheduled yet</p>
        <p className="text-sm text-muted-foreground mt-1">Use Auto-Schedule or drag matches here</p>
      </div>
    );
  }

  // Determine time range
  const times = scheduledMatches
    .filter((m) => m.scheduledTime !== undefined)
    .map((m) => m.scheduledTime!);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  // Align to 30-minute slots
  const SLOT_MS = 30 * 60_000;
  const startSlot = Math.floor(minTime / SLOT_MS) * SLOT_MS;
  const endSlot = Math.ceil((maxTime + durationMs) / SLOT_MS) * SLOT_MS;

  const slots: number[] = [];
  for (let t = startSlot; t < endSlot; t += SLOT_MS) {
    slots.push(t);
  }

  // Group matches by court
  const matchesByCourt: Record<string, ScheduleMatch[]> = {};
  for (const court of courts) {
    matchesByCourt[court] = [];
  }
  for (const m of scheduledMatches) {
    if (m.court && matchesByCourt[m.court]) {
      matchesByCourt[m.court]!.push(m);
    }
  }

  // Sort each court's matches by time
  for (const court of courts) {
    matchesByCourt[court]!.sort((a, b) => (a.scheduledTime ?? 0) - (b.scheduledTime ?? 0));
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (!canManage) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropOnCell = (court: string, slotTime: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const matchId = e.dataTransfer.getData("matchId");
    if (matchId) {
      onDrop(matchId, court, slotTime);
    }
  };

  return (
    <div className="overflow-auto">
      <div
        className="grid gap-px bg-border"
        style={{
          gridTemplateColumns: `80px repeat(${courts.length}, minmax(140px, 1fr))`,
        }}
      >
        {/* Header row */}
        <div className="bg-bg-secondary p-2 text-xs font-semibold text-muted-foreground sticky left-0 z-10">
          Time
        </div>
        {courts.map((court) => (
          <div
            key={court}
            className="bg-bg-secondary p-2 text-xs font-semibold text-foreground text-center"
          >
            {court}
          </div>
        ))}

        {/* Time slot rows */}
        {slots.map((slotTime) => (
          <React.Fragment key={slotTime}>
            <div
              className="bg-background p-2 text-xs text-muted-foreground sticky left-0 z-10 border-t border-border"
              style={{ minHeight: "60px" }}
            >
              {formatTimeLabel(slotTime)}
            </div>
            {courts.map((court) => {
              // Find matches in this slot
              const slotMatches = (matchesByCourt[court] ?? []).filter((m) => {
                if (m.scheduledTime === undefined) return false;
                return m.scheduledTime >= slotTime && m.scheduledTime < slotTime + SLOT_MS;
              });

              return (
                <div
                  key={`${court}-${slotTime}`}
                  className="bg-background p-1 border-t border-border min-h-[60px] transition-colors hover:bg-bg-secondary/50"
                  onDragOver={handleDragOver}
                  onDrop={handleDropOnCell(court, slotTime)}
                >
                  <div className="flex flex-col gap-1">
                    {slotMatches.map((m) => (
                      <ScheduleMatchCard
                        key={m._id}
                        match={m}
                        canManage={canManage}
                        hasConflict={conflictMatchIds.has(m._id)}
                        durationMs={durationMs}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function UnscheduledSidebar({
  matches,
  canManage,
}: {
  matches: ScheduleMatch[];
  canManage: boolean;
}) {
  if (matches.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-6">
        All matches are scheduled
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {matches.map((m) => (
        <div
          key={m._id}
          draggable={canManage}
          onDragStart={(e) => {
            e.dataTransfer.setData("matchId", m._id);
            e.dataTransfer.effectAllowed = "move";
          }}
          className={`rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs ${
            canManage ? "cursor-grab active:cursor-grabbing" : ""
          }`}
        >
          <div className="font-semibold text-foreground">
            R{m.round} M{m.matchNumber}
          </div>
          <div className="truncate text-muted-foreground">
            {m.participant1Name ?? "TBD"} vs {m.participant2Name ?? "TBD"}
          </div>
          {m.bracketName && (
            <div className="truncate text-muted-foreground/60 text-[10px]">{m.bracketName}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ScheduleTab({
  tournamentId,
  canManage,
  availableCourts,
  tournamentStatus,
  startDate,
  defaultMatchDuration,
  scheduleBuffer,
}: {
  tournamentId: string;
  canManage: boolean;
  availableCourts?: string[];
  tournamentStatus: "draft" | "active" | "completed" | "cancelled";
  startDate?: number;
  defaultMatchDuration?: number;
  scheduleBuffer?: number;
}): React.ReactNode {
  const [duration, setDuration] = useState(String(defaultMatchDuration ?? 90));
  const [buffer, setBuffer] = useState(String(scheduleBuffer ?? 15));
  const [scheduleStartDate, setScheduleStartDate] = useState(
    formatDateTimeInput(startDate ?? defaultStartTimestamp())
  );
  const [scheduling, setScheduling] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const scheduleData = useQuery(api.scheduling.getScheduleData, {
    tournamentId: tournamentId as Id<"tournaments">,
  });
  const autoSchedule = useMutation(api.scheduling.autoScheduleMatches);
  const clearSchedule = useMutation(api.scheduling.clearSchedule);
  const scheduleMatch = useMutation(api.matches.scheduleMatch);

  // Derived data
  const scheduledMatches = useMemo(
    () =>
      (scheduleData?.matches ?? []).filter(
        (m) => m.scheduledTime !== undefined && m.court !== undefined
      ),
    [scheduleData?.matches]
  );

  const unscheduledMatches = useMemo(
    () =>
      (scheduleData?.matches ?? []).filter(
        (m) => m.scheduledTime === undefined && m.status !== "completed" && m.status !== "live"
      ),
    [scheduleData?.matches]
  );

  const durationMs = (Number(duration) || 90) * 60_000;

  // Conflict detection: find matches where the same participant has < 60 min rest
  const conflictMatchIds = useMemo(() => {
    const conflicts = new Set<string>();
    const allScheduled = scheduledMatches.filter((m) => m.scheduledTime !== undefined);

    // Build a map: participantId -> list of { matchId, time }
    const participantSchedules: Record<string, { matchId: string; time: number }[]> = {};
    for (const m of allScheduled) {
      const ids = [m.participant1Id, m.participant2Id].filter(Boolean) as string[];
      for (const pid of ids) {
        if (!participantSchedules[pid]) {
          participantSchedules[pid] = [];
        }
        participantSchedules[pid]!.push({ matchId: m._id, time: m.scheduledTime! });
      }
    }

    const REST_THRESHOLD_MS = 60 * 60_000; // 60 minutes

    for (const schedule of Object.values(participantSchedules)) {
      if (schedule.length < 2) continue;
      // Sort by time
      schedule.sort((a, b) => a.time - b.time);
      for (let i = 1; i < schedule.length; i++) {
        const gap = schedule[i]!.time - (schedule[i - 1]!.time + durationMs);
        if (gap < REST_THRESHOLD_MS) {
          conflicts.add(schedule[i]!.matchId);
          conflicts.add(schedule[i - 1]!.matchId);
        }
      }
    }

    return conflicts;
  }, [scheduledMatches, durationMs]);

  const courts = scheduleData?.courts ?? availableCourts ?? [];

  // Multi-day support: extract unique dates from scheduled matches
  const scheduleDays = useMemo(() => {
    const dateSet = new Set<string>();
    for (const m of scheduledMatches) {
      if (m.scheduledTime) dateSet.add(toDateKey(m.scheduledTime));
    }
    return [...dateSet].sort();
  }, [scheduledMatches]);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Determine which day to show — default to first day if none selected
  const activeDay =
    selectedDay && scheduleDays.includes(selectedDay) ? selectedDay : scheduleDays[0];

  // Filter scheduled matches to the active day (only when multiple days exist)
  const visibleScheduledMatches = useMemo(() => {
    if (scheduleDays.length <= 1) return scheduledMatches;
    if (!activeDay) return scheduledMatches;
    return scheduledMatches.filter(
      (m) => m.scheduledTime && toDateKey(m.scheduledTime) === activeDay
    );
  }, [scheduledMatches, scheduleDays, activeDay]);

  // Handlers
  const handleAutoSchedule = useCallback(async () => {
    const parsedStart = parseDateTimeInput(scheduleStartDate);
    if (!parsedStart) {
      toast.error("Please enter a valid start date and time.");
      return;
    }
    const durationMin = Number(duration);
    if (!durationMin || durationMin <= 0) {
      toast.error("Match duration must be a positive number.");
      return;
    }
    const bufferMin = Number(buffer);
    if (Number.isNaN(bufferMin) || bufferMin < 0) {
      toast.error("Buffer minutes cannot be negative.");
      return;
    }

    setScheduling(true);
    try {
      const result = await autoSchedule({
        tournamentId: tournamentId as Id<"tournaments">,
        startTime: parsedStart,
        durationMinutes: durationMin,
        bufferMinutes: bufferMin,
      });
      toast.success(
        `Scheduled ${result.scheduledCount} match${result.scheduledCount !== 1 ? "es" : ""}`
      );
    } catch (err) {
      toast.error(getDisplayMessage(err));
    } finally {
      setScheduling(false);
    }
  }, [scheduleStartDate, duration, buffer, autoSchedule, tournamentId]);

  const handleClearSchedule = useCallback(async () => {
    setClearing(true);
    try {
      const result = await clearSchedule({
        tournamentId: tournamentId as Id<"tournaments">,
      });
      toast.success(`Cleared ${result.clearedCount} match${result.clearedCount !== 1 ? "es" : ""}`);
    } catch (err) {
      toast.error(getDisplayMessage(err));
    } finally {
      setClearing(false);
      setConfirmClear(false);
    }
  }, [clearSchedule, tournamentId]);

  const handleDrop = useCallback(
    async (matchId: string, newCourt: string, newTime: number) => {
      try {
        await scheduleMatch({
          matchId: matchId as Id<"matches">,
          scheduledTime: newTime,
          court: newCourt,
        });
      } catch (err) {
        toast.error(getDisplayMessage(err));
      }
    },
    [scheduleMatch]
  );

  // Loading state
  if (!scheduleData) {
    return <TabSkeleton />;
  }

  const isEditable =
    canManage && tournamentStatus !== "completed" && tournamentStatus !== "cancelled";

  return (
    <div className="animate-fadeIn space-y-4">
      {/* Config panel */}
      {isEditable && (
        <div className="surface-panel surface-panel-rail p-4 space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="schedule-start" className="text-xs">
                Start Date &amp; Time
              </Label>
              <Input
                id="schedule-start"
                type="datetime-local"
                value={scheduleStartDate}
                onChange={(e) => setScheduleStartDate(e.target.value)}
                className="w-56"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schedule-duration" className="text-xs">
                Duration (min)
              </Label>
              <Input
                id="schedule-duration"
                type="number"
                min={1}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-24"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schedule-buffer" className="text-xs">
                Buffer (min)
              </Label>
              <Input
                id="schedule-buffer"
                type="number"
                min={0}
                value={buffer}
                onChange={(e) => setBuffer(e.target.value)}
                className="w-24"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="brand" disabled={scheduling} onClick={handleAutoSchedule}>
              {scheduling ? "Scheduling..." : "Auto-Schedule"}
            </Button>
            <Button
              variant="outline"
              disabled={clearing || scheduledMatches.length === 0}
              onClick={() => setConfirmClear(true)}
            >
              {clearing ? "Clearing..." : "Clear Schedule"}
            </Button>

            <span className="text-sm text-muted-foreground ml-auto">
              {unscheduledMatches.length} unscheduled &middot; {scheduledMatches.length} scheduled
            </span>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex gap-4">
        {/* Timeline grid */}
        <div className="flex-1 surface-panel surface-panel-rail overflow-hidden">
          {/* Day tabs — only shown when matches span multiple days */}
          {scheduleDays.length > 1 && (
            <div className="flex gap-1 p-2 border-b border-border bg-bg-secondary/50">
              {scheduleDays.map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeDay === day
                      ? "bg-brand/10 text-brand border border-brand/40"
                      : "text-muted-foreground hover:bg-bg-secondary hover:text-foreground border border-transparent"
                  }`}
                >
                  {formatDayLabel(day)}
                </button>
              ))}
            </div>
          )}
          <ScheduleGrid
            courts={courts}
            scheduledMatches={visibleScheduledMatches}
            conflictMatchIds={conflictMatchIds}
            canManage={isEditable}
            durationMs={durationMs}
            onDrop={handleDrop}
          />
        </div>

        {/* Unscheduled sidebar */}
        {isEditable && unscheduledMatches.length > 0 && (
          <div className="w-56 shrink-0 surface-panel surface-panel-rail p-3 space-y-2 self-start max-h-[70vh] overflow-y-auto">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Unscheduled
            </h3>
            <UnscheduledSidebar matches={unscheduledMatches} canManage={isEditable} />
          </div>
        )}
      </div>

      {/* Confirm clear dialog */}
      <ConfirmDialog
        open={confirmClear}
        onConfirm={handleClearSchedule}
        onCancel={() => setConfirmClear(false)}
        title="Clear Schedule"
        description={`This will remove scheduling from ${scheduledMatches.length} match${scheduledMatches.length !== 1 ? "es" : ""} and reset them to pending. This cannot be undone.`}
        confirmLabel="Clear Schedule"
        variant="danger"
      />
    </div>
  );
}
