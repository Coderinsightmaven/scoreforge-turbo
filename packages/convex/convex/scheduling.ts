import { getCurrentUser, getCurrentUserOrThrow } from "./users";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { errors } from "./lib/errors";
import { matchStatus } from "./schema";
import { getTournamentRole } from "./lib/accessControl";

/**
 * Auto-schedule all unscheduled matches for a tournament using sequential court fill.
 * Assigns each schedulable match to the court with the earliest available slot.
 */
export const autoScheduleMatches = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    startTime: v.number(),
    durationMinutes: v.number(),
    bufferMinutes: v.number(),
  },
  returns: v.object({ scheduledCount: v.number() }),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const userId = user._id;

    const tournament = await ctx.db.get("tournaments", args.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Only owner can auto-schedule
    if (tournament.createdBy !== userId) {
      throw errors.unauthorized();
    }

    // Validate courts are configured
    if (!tournament.courts || tournament.courts.length === 0) {
      throw errors.invalidInput("Tournament must have courts configured before scheduling");
    }

    // Validate duration and buffer
    if (args.durationMinutes <= 0) {
      throw errors.invalidInput("Match duration must be greater than 0");
    }
    if (args.bufferMinutes < 0) {
      throw errors.invalidInput("Buffer minutes cannot be negative");
    }

    // Save scheduling config to tournament
    await ctx.db.patch("tournaments", args.tournamentId, {
      defaultMatchDuration: args.durationMinutes,
      scheduleBuffer: args.bufferMinutes,
    });

    // Collect all matches for this tournament
    const allMatches = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    // Filter to schedulable matches: pending and no scheduledTime (pending already excludes byes)
    const schedulable = allMatches
      .filter((m) => m.status === "pending" && !m.scheduledTime)
      .sort((a, b) => {
        // Sort by round ascending, then matchNumber ascending
        if (a.round !== b.round) return a.round - b.round;
        return a.matchNumber - b.matchNumber;
      });

    const durationMs = args.durationMinutes * 60 * 1000;
    const bufferMs = args.bufferMinutes * 60 * 1000;

    // Initialize court availability — each court starts at the given startTime
    const courtNextAvailable: Record<string, number> = {};
    for (const court of tournament.courts) {
      courtNextAvailable[court] = args.startTime;
    }

    // Account for already-scheduled matches: advance court availability past their end times
    for (const m of allMatches) {
      if (m.scheduledTime !== undefined && m.court !== undefined && m.status !== "bye") {
        const endTime = m.scheduledTime + durationMs + bufferMs;
        const currentAvailable = courtNextAvailable[m.court];
        if (currentAvailable !== undefined && endTime > currentAvailable) {
          courtNextAvailable[m.court] = endTime;
        }
      }
    }

    // Assign each schedulable match to the court with the earliest slot
    const courts = tournament.courts; // Already validated non-empty above
    let scheduledCount = 0;
    for (const match of schedulable) {
      // Find the court with the earliest available time
      let earliestCourt = courts[0]!;
      let earliestTime = courtNextAvailable[earliestCourt]!;
      for (const court of courts) {
        const available = courtNextAvailable[court]!;
        if (available < earliestTime) {
          earliestTime = available;
          earliestCourt = court;
        }
      }

      await ctx.db.patch("matches", match._id, {
        scheduledTime: earliestTime,
        court: earliestCourt,
        status: "scheduled",
      });

      // Advance this court's next available time
      courtNextAvailable[earliestCourt] = earliestTime + durationMs + bufferMs;
      scheduledCount++;
    }

    return { scheduledCount };
  },
});

/**
 * Clear scheduling data from all scheduled (not live/completed) matches in a tournament.
 * Resets them back to pending status.
 */
export const clearSchedule = mutation({
  args: {
    tournamentId: v.id("tournaments"),
  },
  returns: v.object({ clearedCount: v.number() }),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const userId = user._id;

    const tournament = await ctx.db.get("tournaments", args.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Only owner can clear schedule
    if (tournament.createdBy !== userId) {
      throw errors.unauthorized();
    }

    // Query matches with status === "scheduled"
    const scheduledMatches = await ctx.db
      .query("matches")
      .withIndex("by_tournament_and_status", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("status", "scheduled")
      )
      .collect();

    // Clear scheduling data and reset to pending
    let clearedCount = 0;
    for (const match of scheduledMatches) {
      await ctx.db.patch("matches", match._id, {
        scheduledTime: undefined,
        court: undefined,
        status: "pending",
      });
      clearedCount++;
    }

    return { clearedCount };
  },
});

/**
 * Get all match data needed for the schedule grid, with participant names resolved.
 * Accessible by owner, scorers, and temporary scorers.
 */
export const getScheduleData = query({
  args: {
    tournamentId: v.id("tournaments"),
    tempScorerToken: v.optional(v.string()),
  },
  returns: v.object({
    matches: v.array(
      v.object({
        _id: v.id("matches"),
        round: v.number(),
        matchNumber: v.number(),
        bracketType: v.optional(v.string()),
        status: matchStatus,
        scheduledTime: v.optional(v.number()),
        court: v.optional(v.string()),
        participant1Name: v.optional(v.string()),
        participant2Name: v.optional(v.string()),
        participant1Id: v.optional(v.id("tournamentParticipants")),
        participant2Id: v.optional(v.id("tournamentParticipants")),
      })
    ),
    courts: v.array(v.string()),
    defaultMatchDuration: v.number(),
    scheduleBuffer: v.number(),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user?._id ?? null;

    const tournament = await ctx.db.get("tournaments", args.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Check access: owner, scorer, or temp_scorer
    const role = await getTournamentRole(ctx, tournament, userId, args.tempScorerToken);
    if (!role) {
      throw errors.unauthorized();
    }

    // Query all matches for this tournament, filter out byes
    const allMatches = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    const nonByeMatches = allMatches.filter((m) => m.status !== "bye");

    // Collect unique participant IDs
    const participantIds = new Set<string>();
    for (const m of nonByeMatches) {
      if (m.participant1Id) participantIds.add(m.participant1Id);
      if (m.participant2Id) participantIds.add(m.participant2Id);
    }

    // Fetch participant names
    const participantNames: Record<string, string> = {};
    for (const id of participantIds) {
      const participant = await ctx.db.get(
        "tournamentParticipants",
        id as Id<"tournamentParticipants">
      );
      if (participant) {
        participantNames[id] = participant.displayName;
      }
    }

    // Map matches with resolved participant names
    const matches = nonByeMatches.map((m) => ({
      _id: m._id,
      round: m.round,
      matchNumber: m.matchNumber,
      bracketType: m.bracketType,
      status: m.status,
      scheduledTime: m.scheduledTime,
      court: m.court,
      participant1Name: m.participant1Id ? participantNames[m.participant1Id] : undefined,
      participant2Name: m.participant2Id ? participantNames[m.participant2Id] : undefined,
      participant1Id: m.participant1Id,
      participant2Id: m.participant2Id,
    }));

    return {
      matches,
      courts: tournament.courts ?? [],
      defaultMatchDuration: tournament.defaultMatchDuration ?? 90,
      scheduleBuffer: tournament.scheduleBuffer ?? 15,
    };
  },
});
