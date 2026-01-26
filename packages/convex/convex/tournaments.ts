import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import {
  tournamentFormats,
  tournamentStatus,
  presetSports,
  participantTypes,
  tennisConfig,
  volleyballConfig,
  tennisState,
  volleyballState,
} from "./schema";
import {
  generateSingleEliminationBracket,
  generateDoubleEliminationBracket,
  generateRoundRobinSchedule,
} from "./lib/bracketGenerator";

// ============================================
// Helper functions for access control
// ============================================

/**
 * Check if user can manage (edit/delete) a tournament
 * Only the creator can manage their tournaments
 */
async function canManageTournament(
  ctx: QueryCtx | MutationCtx,
  tournamentId: Id<"tournaments">,
  userId: Id<"users">
): Promise<boolean> {
  const tournament = await ctx.db.get(tournamentId);
  return tournament?.createdBy === userId;
}

/**
 * Check if user can score a tournament
 * Creator can score, or user must be in tournamentScorers
 */
async function canScoreTournament(
  ctx: QueryCtx | MutationCtx,
  tournamentId: Id<"tournaments">,
  userId: Id<"users">
): Promise<boolean> {
  const tournament = await ctx.db.get(tournamentId);
  if (!tournament) return false;
  if (tournament.createdBy === userId) return true;

  const scorer = await ctx.db
    .query("tournamentScorers")
    .withIndex("by_tournament_and_user", (q) =>
      q.eq("tournamentId", tournamentId).eq("userId", userId)
    )
    .first();
  return scorer !== null;
}

/**
 * Get user's role for a tournament
 * Returns "owner" if creator, "scorer" if assigned scorer, null if no access
 */
async function getTournamentRole(
  ctx: QueryCtx | MutationCtx,
  tournamentId: Id<"tournaments">,
  userId: Id<"users">
): Promise<"owner" | "scorer" | null> {
  const tournament = await ctx.db.get(tournamentId);
  if (!tournament) return null;
  if (tournament.createdBy === userId) return "owner";

  const scorer = await ctx.db
    .query("tournamentScorers")
    .withIndex("by_tournament_and_user", (q) =>
      q.eq("tournamentId", tournamentId).eq("userId", userId)
    )
    .first();
  return scorer ? "scorer" : null;
}

// ============================================
// Queries
// ============================================

/**
 * Get a single tournament with user's role
 */
export const getTournament = query({
  args: { tournamentId: v.id("tournaments") },
  returns: v.union(
    v.object({
      _id: v.id("tournaments"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      sport: presetSports,
      format: tournamentFormats,
      participantType: participantTypes,
      maxParticipants: v.number(),
      status: tournamentStatus,
      startDate: v.optional(v.number()),
      endDate: v.optional(v.number()),
      scoringConfig: v.optional(
        v.object({
          pointsPerWin: v.optional(v.number()),
          pointsPerDraw: v.optional(v.number()),
          pointsPerLoss: v.optional(v.number()),
        })
      ),
      tennisConfig: v.optional(tennisConfig),
      volleyballConfig: v.optional(volleyballConfig),
      courts: v.optional(v.array(v.string())),
      createdBy: v.id("users"),
      participantCount: v.number(),
      myRole: v.union(v.literal("owner"), v.literal("scorer")),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      return null;
    }

    // Check if user has access to this tournament
    const role = await getTournamentRole(ctx, args.tournamentId, userId);
    if (!role) {
      return null;
    }

    // Get participant count
    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    return {
      _id: tournament._id,
      _creationTime: tournament._creationTime,
      name: tournament.name,
      description: tournament.description,
      sport: tournament.sport,
      format: tournament.format,
      participantType: tournament.participantType,
      maxParticipants: tournament.maxParticipants,
      status: tournament.status,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      scoringConfig: tournament.scoringConfig,
      tennisConfig: tournament.tennisConfig,
      volleyballConfig: tournament.volleyballConfig,
      courts: tournament.courts,
      createdBy: tournament.createdBy,
      participantCount: participants.length,
      myRole: role,
    };
  },
});

/**
 * Get bracket/matches structure for a tournament
 */
export const getBracket = query({
  args: { tournamentId: v.id("tournaments") },
  returns: v.object({
    format: tournamentFormats,
    sport: v.string(),
    matches: v.array(
      v.object({
        _id: v.id("matches"),
        round: v.number(),
        matchNumber: v.number(),
        bracket: v.optional(v.string()),
        bracketPosition: v.optional(v.number()),
        participant1: v.optional(
          v.object({
            _id: v.id("tournamentParticipants"),
            displayName: v.string(),
            seed: v.optional(v.number()),
          })
        ),
        participant2: v.optional(
          v.object({
            _id: v.id("tournamentParticipants"),
            displayName: v.string(),
            seed: v.optional(v.number()),
          })
        ),
        participant1Score: v.number(),
        participant2Score: v.number(),
        winnerId: v.optional(v.id("tournamentParticipants")),
        status: v.union(
          v.literal("pending"),
          v.literal("scheduled"),
          v.literal("live"),
          v.literal("completed"),
          v.literal("bye")
        ),
        scheduledTime: v.optional(v.number()),
        court: v.optional(v.string()),
        nextMatchId: v.optional(v.id("matches")),
        tennisState: v.optional(tennisState),
        volleyballState: v.optional(volleyballState),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check if user has access to this tournament
    const role = await getTournamentRole(ctx, args.tournamentId, userId);
    if (!role) {
      throw new Error("Not authorized");
    }

    // Get all matches for the tournament
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    // Get participant details
    const matchesWithParticipants = await Promise.all(
      matches.map(async (match) => {
        let participant1 = undefined;
        let participant2 = undefined;

        if (match.participant1Id) {
          const p1 = await ctx.db.get(match.participant1Id);
          if (p1) {
            participant1 = {
              _id: p1._id,
              displayName: p1.displayName,
              seed: p1.seed,
            };
          }
        }

        if (match.participant2Id) {
          const p2 = await ctx.db.get(match.participant2Id);
          if (p2) {
            participant2 = {
              _id: p2._id,
              displayName: p2.displayName,
              seed: p2.seed,
            };
          }
        }

        return {
          _id: match._id,
          round: match.round,
          matchNumber: match.matchNumber,
          bracket: match.bracket,
          bracketPosition: match.bracketPosition,
          participant1,
          participant2,
          participant1Score: match.participant1Score,
          participant2Score: match.participant2Score,
          winnerId: match.winnerId,
          status: match.status,
          scheduledTime: match.scheduledTime,
          court: match.court,
          nextMatchId: match.nextMatchId,
          tennisState: match.tennisState,
          volleyballState: match.volleyballState,
        };
      })
    );

    return {
      format: tournament.format,
      sport: tournament.sport,
      matches: matchesWithParticipants,
    };
  },
});

/**
 * Check if the current user can create more tournaments
 * Returns info about their limit status
 */
export const canCreateTournament = query({
  args: {},
  returns: v.object({
    canCreate: v.boolean(),
    currentCount: v.number(),
    maxAllowed: v.number(),
    isSiteAdmin: v.boolean(),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        canCreate: false,
        currentCount: 0,
        maxAllowed: 0,
        isSiteAdmin: false,
      };
    }

    // Check if user is a site admin
    const siteAdmin = await ctx.db
      .query("siteAdmins")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (siteAdmin) {
      return {
        canCreate: true,
        currentCount: 0,
        maxAllowed: Infinity,
        isSiteAdmin: true,
      };
    }

    // Get system settings for limit
    const settings = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    // Handle both old and new field names for backwards compatibility
    const settingsAny = settings as any;
    const maxTournaments = settingsAny?.maxTournamentsPerUser ?? settingsAny?.maxOrganizationsPerUser ?? 50;

    // Count user's existing tournaments
    const existingTournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_created_by", (q) => q.eq("createdBy", userId))
      .collect();

    const currentCount = existingTournaments.length;

    return {
      canCreate: currentCount < maxTournaments,
      currentCount,
      maxAllowed: maxTournaments,
      isSiteAdmin: false,
    };
  },
});

/**
 * List tournaments the user owns or is assigned to score
 */
export const listMyTournaments = query({
  args: {
    status: v.optional(tournamentStatus),
  },
  returns: v.array(
    v.object({
      _id: v.id("tournaments"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.optional(v.string()),
      sport: presetSports,
      format: tournamentFormats,
      participantType: participantTypes,
      maxParticipants: v.number(),
      status: tournamentStatus,
      startDate: v.optional(v.number()),
      participantCount: v.number(),
      liveMatchCount: v.number(),
      isOwner: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const processedTournamentIds = new Set<string>();
    const results: Array<{
      _id: Id<"tournaments">;
      _creationTime: number;
      name: string;
      description?: string;
      sport: "tennis" | "volleyball";
      format: "single_elimination" | "double_elimination" | "round_robin";
      participantType: "team" | "individual" | "doubles";
      maxParticipants: number;
      status: "draft" | "active" | "completed" | "cancelled";
      startDate?: number;
      participantCount: number;
      liveMatchCount: number;
      isOwner: boolean;
    }> = [];

    // Helper to process a tournament
    const processTournament = async (tournament: Doc<"tournaments">, isOwner: boolean) => {
      if (processedTournamentIds.has(tournament._id)) return;
      if (args.status && tournament.status !== args.status) return;

      const participants = await ctx.db
        .query("tournamentParticipants")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
        .collect();

      const liveMatches = await ctx.db
        .query("matches")
        .withIndex("by_tournament_and_status", (q) =>
          q.eq("tournamentId", tournament._id).eq("status", "live")
        )
        .collect();

      results.push({
        _id: tournament._id,
        _creationTime: tournament._creationTime,
        name: tournament.name,
        description: tournament.description,
        sport: tournament.sport,
        format: tournament.format,
        participantType: tournament.participantType,
        maxParticipants: tournament.maxParticipants,
        status: tournament.status,
        startDate: tournament.startDate,
        participantCount: participants.length,
        liveMatchCount: liveMatches.length,
        isOwner,
      });

      processedTournamentIds.add(tournament._id);
    };

    // Get tournaments user created (owns)
    let ownedTournaments;
    if (args.status) {
      ownedTournaments = await ctx.db
        .query("tournaments")
        .withIndex("by_created_by_and_status", (q) =>
          q.eq("createdBy", userId).eq("status", args.status!)
        )
        .collect();
    } else {
      ownedTournaments = await ctx.db
        .query("tournaments")
        .withIndex("by_created_by", (q) => q.eq("createdBy", userId))
        .collect();
    }

    for (const tournament of ownedTournaments) {
      await processTournament(tournament, true);
    }

    // Get tournaments user is assigned to as scorer
    const scorerAssignments = await ctx.db
      .query("tournamentScorers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const assignment of scorerAssignments) {
      const tournament = await ctx.db.get(assignment.tournamentId);
      if (tournament) {
        await processTournament(tournament, false);
      }
    }

    // Sort by creation time descending (newest first)
    results.sort((a, b) => b._creationTime - a._creationTime);

    return results;
  },
});

/**
 * Get standings for round robin tournaments
 */
export const getStandings = query({
  args: { tournamentId: v.id("tournaments") },
  returns: v.array(
    v.object({
      _id: v.id("tournamentParticipants"),
      displayName: v.string(),
      seed: v.optional(v.number()),
      wins: v.number(),
      losses: v.number(),
      draws: v.number(),
      pointsFor: v.number(),
      pointsAgainst: v.number(),
      points: v.number(), // Calculated based on scoring config
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check if user has access
    const role = await getTournamentRole(ctx, args.tournamentId, userId);
    if (!role) {
      throw new Error("Not authorized");
    }

    // Get all participants
    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    // Calculate points based on scoring config
    const config = tournament.scoringConfig || {
      pointsPerWin: 3,
      pointsPerDraw: 1,
      pointsPerLoss: 0,
    };

    const standings = participants.map((p) => ({
      _id: p._id,
      displayName: p.displayName,
      seed: p.seed,
      wins: p.wins,
      losses: p.losses,
      draws: p.draws,
      pointsFor: p.pointsFor,
      pointsAgainst: p.pointsAgainst,
      points:
        p.wins * (config.pointsPerWin || 3) +
        p.draws * (config.pointsPerDraw || 1) +
        p.losses * (config.pointsPerLoss || 0),
    }));

    // Sort by points, then point differential
    standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const aDiff = a.pointsFor - a.pointsAgainst;
      const bDiff = b.pointsFor - b.pointsAgainst;
      if (bDiff !== aDiff) return bDiff - aDiff;
      return b.pointsFor - a.pointsFor;
    });

    return standings;
  },
});

// ============================================
// Mutations
// ============================================

/**
 * Create a new tournament (any authenticated user)
 */
export const createTournament = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    sport: presetSports,
    format: tournamentFormats,
    participantType: participantTypes,
    maxParticipants: v.number(),
    startDate: v.optional(v.number()),
    scoringConfig: v.optional(
      v.object({
        pointsPerWin: v.optional(v.number()),
        pointsPerDraw: v.optional(v.number()),
        pointsPerLoss: v.optional(v.number()),
      })
    ),
    tennisConfig: v.optional(tennisConfig),
    volleyballConfig: v.optional(volleyballConfig),
    courts: v.optional(v.array(v.string())),
  },
  returns: v.id("tournaments"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is a site admin (exempt from limits)
    const siteAdmin = await ctx.db
      .query("siteAdmins")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    // If not a site admin, check tournament limit
    if (!siteAdmin) {
      // Get system settings for limit
      const settings = await ctx.db
        .query("systemSettings")
        .withIndex("by_key", (q) => q.eq("key", "global"))
        .first();

      // Handle both old and new field names for backwards compatibility
      const settingsAny = settings as any;
      const maxTournaments = settingsAny?.maxTournamentsPerUser ?? settingsAny?.maxOrganizationsPerUser ?? 50;

      // Count user's existing tournaments
      const existingTournaments = await ctx.db
        .query("tournaments")
        .withIndex("by_created_by", (q) => q.eq("createdBy", userId))
        .collect();

      if (existingTournaments.length >= maxTournaments) {
        throw new Error(
          `You have reached the maximum number of tournaments (${maxTournaments}). Please delete an existing tournament or contact an administrator.`
        );
      }
    }

    // Validate tennis config for tennis tournaments
    if (args.sport === "tennis" && !args.tennisConfig) {
      throw new Error("Tennis configuration is required for tennis tournaments");
    }

    // Validate volleyball config for volleyball tournaments
    if (args.sport === "volleyball" && !args.volleyballConfig) {
      throw new Error("Volleyball configuration is required for volleyball tournaments");
    }

    const tournamentId = await ctx.db.insert("tournaments", {
      createdBy: userId,
      name: args.name,
      description: args.description,
      sport: args.sport,
      format: args.format,
      participantType: args.participantType,
      maxParticipants: args.maxParticipants,
      status: "draft",
      startDate: args.startDate,
      scoringConfig: args.scoringConfig,
      tennisConfig: args.tennisConfig,
      volleyballConfig: args.volleyballConfig,
      courts: args.courts,
    });

    return tournamentId;
  },
});

/**
 * Update tournament details (owner only)
 */
export const updateTournament = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    maxParticipants: v.optional(v.number()),
    startDate: v.optional(v.number()),
    scoringConfig: v.optional(
      v.object({
        pointsPerWin: v.optional(v.number()),
        pointsPerDraw: v.optional(v.number()),
        pointsPerLoss: v.optional(v.number()),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Only owner can update
    if (tournament.createdBy !== userId) {
      throw new Error("Not authorized. Only the tournament owner can update it.");
    }

    // Can only update draft tournaments
    if (tournament.status !== "draft") {
      throw new Error("Cannot update tournament after it has started");
    }

    const updates: Partial<typeof tournament> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.maxParticipants !== undefined)
      updates.maxParticipants = args.maxParticipants;
    if (args.startDate !== undefined) updates.startDate = args.startDate;
    if (args.scoringConfig !== undefined)
      updates.scoringConfig = args.scoringConfig;

    await ctx.db.patch(args.tournamentId, updates);
    return null;
  },
});

/**
 * Delete a tournament (owner only)
 */
export const deleteTournament = mutation({
  args: { tournamentId: v.id("tournaments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Only owner can delete
    if (tournament.createdBy !== userId) {
      throw new Error("Only the tournament owner can delete it");
    }

    // Delete all matches
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    for (const match of matches) {
      await ctx.db.delete(match._id);
    }

    // Delete all participants
    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    for (const participant of participants) {
      await ctx.db.delete(participant._id);
    }

    // Delete all scorers
    const scorers = await ctx.db
      .query("tournamentScorers")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    for (const scorer of scorers) {
      await ctx.db.delete(scorer._id);
    }

    // Delete the tournament
    await ctx.db.delete(args.tournamentId);
    return null;
  },
});

/**
 * Helper function to generate bracket matches for a tournament
 */
async function generateBracketMatches(
  ctx: MutationCtx,
  tournamentId: Id<"tournaments">,
  tournament: Doc<"tournaments">,
  participants: Doc<"tournamentParticipants">[]
) {
  // Sort by seed (if set) or creation order
  participants.sort((a, b) => {
    if (a.seed && b.seed) return a.seed - b.seed;
    if (a.seed) return -1;
    if (b.seed) return 1;
    return a.createdAt - b.createdAt;
  });

  const participantIds = participants.map((p) => p._id);

  // Generate matches based on format
  let matchData;
  switch (tournament.format) {
    case "single_elimination":
      matchData = generateSingleEliminationBracket(participantIds);
      break;
    case "double_elimination":
      matchData = generateDoubleEliminationBracket(participantIds);
      break;
    case "round_robin":
      matchData = generateRoundRobinSchedule(participantIds);
      break;
    default:
      throw new Error("Unknown tournament format");
  }

  // Insert matches and build ID map for next match linking
  const matchIdMap = new Map<number, Id<"matches">>();

  for (let i = 0; i < matchData.length; i++) {
    const match = matchData[i]!;
    const matchId = await ctx.db.insert("matches", {
      tournamentId,
      round: match.round,
      matchNumber: match.matchNumber,
      bracket: match.bracket,
      bracketPosition: match.bracketPosition,
      participant1Id: match.participant1Id,
      participant2Id: match.participant2Id,
      participant1Score: match.participant1Score,
      participant2Score: match.participant2Score,
      status: match.status,
      nextMatchSlot: match.nextMatchSlot,
      loserNextMatchSlot: match.loserNextMatchSlot,
    });
    matchIdMap.set(i, matchId);
  }

  // Update next match IDs
  for (let i = 0; i < matchData.length; i++) {
    const match = matchData[i] as any;
    const matchId = matchIdMap.get(i)!;
    const updates: { nextMatchId?: Id<"matches">; loserNextMatchId?: Id<"matches"> } = {};

    if (match._nextMatchIndex !== undefined) {
      updates.nextMatchId = matchIdMap.get(match._nextMatchIndex);
    }
    if (match._loserNextMatchIndex !== undefined) {
      updates.loserNextMatchId = matchIdMap.get(match._loserNextMatchIndex);
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(matchId, updates);
    }
  }

  // Process bye matches - auto-advance winners
  const byeMatches = matchData
    .map((match, index) => ({ match, index }))
    .filter(({ match }) => match.status === "bye")
    .sort((a, b) => a.match.round - b.match.round);

  for (const { match, index } of byeMatches) {
    const matchId = matchIdMap.get(index)!;
    const fullMatch = await ctx.db.get(matchId);
    if (!fullMatch) continue;

    const winnerId = match.participant1Id || match.participant2Id;
    if (winnerId) {
      await ctx.db.patch(matchId, {
        winnerId,
        status: "completed",
        completedAt: Date.now(),
      });

      if (fullMatch.nextMatchId) {
        const nextMatch = await ctx.db.get(fullMatch.nextMatchId);
        if (nextMatch) {
          const slot = fullMatch.nextMatchSlot;
          if (slot === 1) {
            await ctx.db.patch(fullMatch.nextMatchId, {
              participant1Id: winnerId,
            });
          } else if (slot === 2) {
            await ctx.db.patch(fullMatch.nextMatchId, {
              participant2Id: winnerId,
            });
          }

          const updatedNextMatch = await ctx.db.get(fullMatch.nextMatchId);
          if (updatedNextMatch && updatedNextMatch.status === "pending") {
            const hasP1 = !!updatedNextMatch.participant1Id;
            const hasP2 = !!updatedNextMatch.participant2Id;

            if ((hasP1 || hasP2) && !(hasP1 && hasP2)) {
              const feederMatches = await ctx.db
                .query("matches")
                .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
                .filter((q) => q.eq(q.field("nextMatchId"), fullMatch.nextMatchId))
                .collect();

              const allFeedersComplete = feederMatches.every(
                (m) => m.status === "completed" || m.status === "bye"
              );

              if (allFeedersComplete && feederMatches.length > 0) {
                const byeWinner = updatedNextMatch.participant1Id || updatedNextMatch.participant2Id;
                if (byeWinner) {
                  await ctx.db.patch(fullMatch.nextMatchId, {
                    winnerId: byeWinner,
                    status: "completed",
                    completedAt: Date.now(),
                  });

                  if (updatedNextMatch.nextMatchId) {
                    const nextNextMatch = await ctx.db.get(updatedNextMatch.nextMatchId);
                    if (nextNextMatch) {
                      const nextSlot = updatedNextMatch.nextMatchSlot;
                      if (nextSlot === 1) {
                        await ctx.db.patch(updatedNextMatch.nextMatchId, {
                          participant1Id: byeWinner,
                        });
                      } else if (nextSlot === 2) {
                        await ctx.db.patch(updatedNextMatch.nextMatchId, {
                          participant2Id: byeWinner,
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

/**
 * Generate bracket for a tournament while still in draft mode (owner only)
 * Can be called multiple times to regenerate the bracket
 */
export const generateBracket = mutation({
  args: { tournamentId: v.id("tournaments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Only owner can generate bracket
    if (tournament.createdBy !== userId) {
      throw new Error("Not authorized. Only the tournament owner can generate the bracket.");
    }

    // Can only generate bracket for draft tournaments
    if (tournament.status !== "draft") {
      throw new Error("Can only generate bracket for draft tournaments");
    }

    // Get participants
    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    if (participants.length < 2) {
      throw new Error("Need at least 2 participants to generate bracket");
    }

    // Delete any existing matches (for regeneration)
    const existingMatches = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    for (const match of existingMatches) {
      await ctx.db.delete(match._id);
    }

    // Generate the bracket
    await generateBracketMatches(ctx, args.tournamentId, tournament, participants);

    return null;
  },
});

/**
 * Start a tournament - activates the tournament (owner only)
 * If bracket doesn't exist, generates it first
 */
export const startTournament = mutation({
  args: { tournamentId: v.id("tournaments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Only owner can start
    if (tournament.createdBy !== userId) {
      throw new Error("Not authorized. Only the tournament owner can start it.");
    }

    // Can only start draft tournaments
    if (tournament.status !== "draft") {
      throw new Error("Tournament has already started or is cancelled");
    }

    // Get participants
    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    if (participants.length < 2) {
      throw new Error("Need at least 2 participants to start tournament");
    }

    // Check if bracket already exists
    const existingMatches = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .first();

    // If no bracket exists, generate it
    if (!existingMatches) {
      await generateBracketMatches(ctx, args.tournamentId, tournament, participants);
    }

    // Update tournament status
    await ctx.db.patch(args.tournamentId, {
      status: "active",
      startDate: Date.now(),
    });

    return null;
  },
});

/**
 * Cancel a tournament (owner only)
 */
export const cancelTournament = mutation({
  args: { tournamentId: v.id("tournaments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Only owner can cancel
    if (tournament.createdBy !== userId) {
      throw new Error("Only the tournament owner can cancel it");
    }

    if (tournament.status === "completed" || tournament.status === "cancelled") {
      throw new Error("Tournament is already completed or cancelled");
    }

    await ctx.db.patch(args.tournamentId, {
      status: "cancelled",
    });

    return null;
  },
});
