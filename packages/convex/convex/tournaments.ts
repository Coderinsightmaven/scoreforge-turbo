import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, internalMutation, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  tournamentFormats,
  tournamentStatus,
  presetSports,
  participantTypes,
  tennisConfig,
  tennisState,
} from "./schema";
import {
  generateSingleEliminationBracket,
  generateDoubleEliminationBracket,
  generateRoundRobinSchedule,
} from "./lib/bracketGenerator";
import { errors } from "./lib/errors";
import { validateStringLength, validateStringArrayLength, MAX_LENGTHS } from "./lib/validation";

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
 * Creator can score, user in tournamentScorers can score, or temp scorer with valid token
 */
async function canScoreTournament(
  ctx: QueryCtx | MutationCtx,
  tournamentId: Id<"tournaments">,
  userId: Id<"users"> | null,
  tempScorerToken?: string
): Promise<boolean> {
  const tournament = await ctx.db.get(tournamentId);
  if (!tournament) return false;

  // Check temp scorer token if provided
  if (tempScorerToken) {
    const session = await ctx.db
      .query("temporaryScorerSessions")
      .withIndex("by_token", (q) => q.eq("token", tempScorerToken))
      .first();

    if (session && session.expiresAt > Date.now()) {
      const tempScorer = await ctx.db.get(session.scorerId);
      if (tempScorer && tempScorer.isActive && tempScorer.tournamentId === tournamentId) {
        return true;
      }
    }
  }

  if (!userId) return false;
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
 * Returns "owner" if creator, "scorer" if assigned scorer, "temp_scorer" if temp scorer, null if no access
 */
async function getTournamentRole(
  ctx: QueryCtx | MutationCtx,
  tournamentId: Id<"tournaments">,
  userId: Id<"users"> | null,
  tempScorerToken?: string
): Promise<"owner" | "scorer" | "temp_scorer" | null> {
  const tournament = await ctx.db.get(tournamentId);
  if (!tournament) return null;

  // Check temp scorer token if provided
  if (tempScorerToken) {
    const session = await ctx.db
      .query("temporaryScorerSessions")
      .withIndex("by_token", (q) => q.eq("token", tempScorerToken))
      .first();

    if (session && session.expiresAt > Date.now()) {
      const tempScorer = await ctx.db.get(session.scorerId);
      if (tempScorer && tempScorer.isActive && tempScorer.tournamentId === tournamentId) {
        return "temp_scorer";
      }
    }
  }

  if (!userId) return null;
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
  args: {
    tournamentId: v.id("tournaments"),
    tempScorerToken: v.optional(v.string()),
  },
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
      courts: v.optional(v.array(v.string())),
      createdBy: v.id("users"),
      participantCount: v.number(),
      bracketCount: v.number(),
      myRole: v.union(v.literal("owner"), v.literal("scorer"), v.literal("temp_scorer")),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      return null;
    }

    // Check if user has access to this tournament
    const role = await getTournamentRole(ctx, args.tournamentId, userId, args.tempScorerToken);
    if (!role) {
      return null;
    }

    // Get participant count
    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    // Get bracket count
    const brackets = await ctx.db
      .query("tournamentBrackets")
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
      courts: tournament.courts,
      createdBy: tournament.createdBy,
      participantCount: participants.length,
      bracketCount: brackets.length,
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
        bracketType: v.optional(v.string()),
        bracketPosition: v.optional(v.number()),
        participant1: v.optional(
          v.object({
            _id: v.id("tournamentParticipants"),
            displayName: v.string(),
            seed: v.optional(v.number()),
            isPlaceholder: v.optional(v.boolean()),
          })
        ),
        participant2: v.optional(
          v.object({
            _id: v.id("tournamentParticipants"),
            displayName: v.string(),
            seed: v.optional(v.number()),
            isPlaceholder: v.optional(v.boolean()),
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
      })
    ),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw errors.unauthenticated();
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Check if user has access to this tournament
    const role = await getTournamentRole(ctx, args.tournamentId, userId);
    if (!role) {
      throw errors.unauthorized();
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
              isPlaceholder: p1.isPlaceholder,
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
              isPlaceholder: p2.isPlaceholder,
            };
          }
        }

        return {
          _id: match._id,
          round: match.round,
          matchNumber: match.matchNumber,
          bracketType: match.bracketType,
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
      // Still count tournaments for admins (for accurate display)
      const existingTournaments = await ctx.db
        .query("tournaments")
        .withIndex("by_created_by", (q) => q.eq("createdBy", userId))
        .collect();

      return {
        canCreate: true,
        currentCount: existingTournaments.length,
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
      sport: "tennis";
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
 * Get standings for round robin tournaments (optionally filtered by bracket)
 */
export const getStandings = query({
  args: {
    tournamentId: v.id("tournaments"),
    bracketId: v.optional(v.id("tournamentBrackets")),
  },
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
      throw errors.unauthenticated();
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Check if user has access
    const role = await getTournamentRole(ctx, args.tournamentId, userId);
    if (!role) {
      throw errors.unauthorized();
    }

    // Get participants (optionally filtered by bracket)
    let participants;
    if (args.bracketId !== undefined) {
      participants = await ctx.db
        .query("tournamentParticipants")
        .withIndex("by_bracket", (q) => q.eq("bracketId", args.bracketId))
        .collect();
    } else {
      participants = await ctx.db
        .query("tournamentParticipants")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
        .collect();
    }

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
    courts: v.optional(v.array(v.string())),
    bracketName: v.optional(v.string()),
  },
  returns: v.id("tournaments"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw errors.unauthenticated();
    }

    // Validate input lengths
    validateStringLength(args.name, "Tournament name", MAX_LENGTHS.tournamentName);
    validateStringLength(args.description, "Description", MAX_LENGTHS.tournamentDescription);
    validateStringLength(args.bracketName, "Bracket name", MAX_LENGTHS.bracketName);
    validateStringArrayLength(args.courts, "courts", MAX_LENGTHS.courtName);

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
        throw errors.limitExceeded(
          `You have reached the maximum number of tournaments (${maxTournaments}). Please delete an existing tournament or contact an administrator`
        );
      }
    }

    // Validate tennis config for tennis tournaments
    if (args.sport === "tennis" && !args.tennisConfig) {
      throw errors.invalidInput("Tennis configuration is required for tennis tournaments");
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
      courts: args.courts,
    });

    // Auto-create a default bracket for the tournament
    await ctx.db.insert("tournamentBrackets", {
      tournamentId,
      name: args.bracketName?.trim() || "Main Draw",
      status: "draft",
      displayOrder: 1,
      createdAt: Date.now(),
      maxParticipants: args.maxParticipants,
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
      throw errors.unauthenticated();
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Only owner can update
    if (tournament.createdBy !== userId) {
      throw errors.unauthorized("Only the tournament owner can update it");
    }

    // Can only update draft tournaments
    if (tournament.status !== "draft") {
      throw errors.invalidState("Cannot update tournament after it has started");
    }

    // Validate input lengths
    validateStringLength(args.name, "Tournament name", MAX_LENGTHS.tournamentName);
    validateStringLength(args.description, "Description", MAX_LENGTHS.tournamentDescription);

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
      throw errors.unauthenticated();
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Only owner can delete
    if (tournament.createdBy !== userId) {
      throw errors.unauthorized("Only the tournament owner can delete it");
    }

    // Only allow deletion of draft or cancelled tournaments
    // Active or completed tournaments should be cancelled first to preserve audit trail
    if (tournament.status === "active") {
      throw errors.invalidState(
        "Cannot delete an active tournament. Cancel it first to preserve match history."
      );
    }
    if (tournament.status === "completed") {
      throw errors.invalidState(
        "Cannot delete a completed tournament. Historical data is preserved for record-keeping."
      );
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

    // Delete all brackets
    const brackets = await ctx.db
      .query("tournamentBrackets")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    for (const bracket of brackets) {
      await ctx.db.delete(bracket._id);
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
      throw errors.invalidInput("Unknown tournament format");
  }

  // Insert matches and build ID map for next match linking
  const matchIdMap = new Map<number, Id<"matches">>();

  for (let i = 0; i < matchData.length; i++) {
    const match = matchData[i]!;
    const matchId = await ctx.db.insert("matches", {
      tournamentId,
      round: match.round,
      matchNumber: match.matchNumber,
      bracketType: match.bracketType,
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
                .withIndex("by_next_match", (q) => q.eq("nextMatchId", fullMatch.nextMatchId))
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
 * Helper function to generate bracket matches for a specific tournament bracket
 */
async function generateBracketMatchesForBracket(
  ctx: MutationCtx,
  tournamentId: Id<"tournaments">,
  bracketId: Id<"tournamentBrackets">,
  format: "single_elimination" | "double_elimination" | "round_robin",
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
  switch (format) {
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
      throw errors.invalidInput("Unknown tournament format");
  }

  // Insert matches and build ID map for next match linking
  const matchIdMap = new Map<number, Id<"matches">>();

  for (let i = 0; i < matchData.length; i++) {
    const match = matchData[i]!;
    const matchId = await ctx.db.insert("matches", {
      tournamentId,
      bracketId, // Include bracket ID for bracket-specific matches
      round: match.round,
      matchNumber: match.matchNumber,
      bracketType: match.bracketType,
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
      throw errors.unauthenticated();
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Only owner can generate bracket
    if (tournament.createdBy !== userId) {
      throw errors.unauthorized("Only the tournament owner can generate the bracket");
    }

    // Can only generate bracket for draft tournaments
    if (tournament.status !== "draft") {
      throw errors.invalidState("Can only generate bracket for draft tournaments");
    }

    // Optimistic concurrency control: increment version before making changes
    // If another call is racing, Convex OCC will retry one of them
    const newVersion = (tournament.bracketVersion ?? 0) + 1;
    await ctx.db.patch(args.tournamentId, {
      bracketVersion: newVersion,
    });

    // Get participants that are NOT assigned to a specific bracket
    // (for multi-bracket tournaments, each bracket generates its own matches)
    const allParticipants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    // Filter to only participants without a bracketId (tournament-level participants)
    const participants = allParticipants.filter((p) => !p.bracketId);

    if (participants.length < 2) {
      throw errors.invalidInput("Need at least 2 participants to generate bracket. For multi-bracket tournaments, generate matches for each bracket individually");
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
 * For multi-bracket tournaments, generates matches for all brackets with 2+ participants
 * For single-bracket tournaments, generates matches from tournament-level participants
 */
export const startTournament = mutation({
  args: { tournamentId: v.id("tournaments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw errors.unauthenticated();
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Only owner can start
    if (tournament.createdBy !== userId) {
      throw errors.unauthorized("Only the tournament owner can start it");
    }

    // Can only start draft tournaments
    if (tournament.status !== "draft") {
      throw errors.invalidState("Tournament has already started or is cancelled");
    }

    // Optimistic concurrency control: increment version before making changes
    // If another call is racing, Convex OCC will retry one of them
    const newVersion = (tournament.bracketVersion ?? 0) + 1;
    await ctx.db.patch(args.tournamentId, {
      bracketVersion: newVersion,
    });

    // Check if this tournament has brackets
    const brackets = await ctx.db
      .query("tournamentBrackets")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    if (brackets.length > 0) {
      // Multi-bracket tournament: generate matches for each bracket with 2+ participants
      let totalParticipants = 0;

      for (const bracket of brackets) {
        const bracketParticipants = await ctx.db
          .query("tournamentParticipants")
          .withIndex("by_bracket", (q) => q.eq("bracketId", bracket._id))
          .collect();

        totalParticipants += bracketParticipants.length;

        if (bracketParticipants.length >= 2 && bracket.status === "draft") {
          // Check if matches already exist for this bracket
          const existingBracketMatches = await ctx.db
            .query("matches")
            .withIndex("by_bracket", (q) => q.eq("bracketId", bracket._id))
            .first();

          if (!existingBracketMatches) {
            // Generate matches for this bracket
            const format = bracket.format || tournament.format;
            await generateBracketMatchesForBracket(
              ctx,
              args.tournamentId,
              bracket._id,
              format,
              tournament,
              bracketParticipants
            );
          }

          // Update bracket status to active
          await ctx.db.patch(bracket._id, { status: "active" });
        }
      }

      if (totalParticipants < 2) {
        throw errors.invalidInput("Need at least 2 participants across all brackets to start tournament");
      }
    } else {
      // Single-bracket tournament: use tournament-level participants
      const participants = await ctx.db
        .query("tournamentParticipants")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
        .collect();

      if (participants.length < 2) {
        throw errors.invalidInput("Need at least 2 participants to start tournament");
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
 * Calculate the next power of 2 that is >= n
 */
function nextPowerOf2(n: number): number {
  let power = 1;
  while (power < n) {
    power *= 2;
  }
  return power;
}

/**
 * Generate a blank bracket with placeholder participants
 * Creates placeholder participants ("Slot 1", "Slot 2", etc.) and generates the bracket structure
 * Optionally accepts seed assignments to place existing participants at specific seeds
 */
export const generateBlankBracket = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    bracketSize: v.number(),
    // Optional: assign existing participants to specific seeds
    // Array of { participantId, seed } objects
    seedAssignments: v.optional(
      v.array(
        v.object({
          participantId: v.id("tournamentParticipants"),
          seed: v.number(),
        })
      )
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw errors.unauthenticated();
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Only owner can generate blank bracket
    if (tournament.createdBy !== userId) {
      throw errors.unauthorized("Only the tournament owner can generate a blank bracket");
    }

    // Can only generate for draft tournaments
    if (tournament.status !== "draft") {
      throw errors.invalidState("Can only generate blank bracket for draft tournaments");
    }

    // Optimistic concurrency control: increment version before making changes
    // If another call is racing, Convex OCC will retry one of them
    const newVersion = (tournament.bracketVersion ?? 0) + 1;
    await ctx.db.patch(args.tournamentId, {
      bracketVersion: newVersion,
    });

    // Validate bracket size (must be power of 2 and between 2 and 128)
    const validSizes = [2, 4, 8, 16, 32, 64, 128];
    let actualSize = args.bracketSize;

    // If not a valid power of 2, round up to next power of 2
    if (!validSizes.includes(actualSize)) {
      actualSize = nextPowerOf2(actualSize);
      if (actualSize > 128) {
        throw errors.invalidInput("Bracket size must be 128 or less");
      }
    }

    if (actualSize < 2) {
      throw errors.invalidInput("Bracket size must be at least 2");
    }

    // Get existing participants
    const existingParticipants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    // Build a map of seed -> existing participant ID from assignments
    const seedToParticipantId = new Map<number, Id<"tournamentParticipants">>();
    const assignedParticipantIds = new Set<string>();

    if (args.seedAssignments) {
      for (const assignment of args.seedAssignments) {
        if (assignment.seed >= 1 && assignment.seed <= actualSize) {
          // Verify this participant exists and belongs to this tournament
          const participant = existingParticipants.find(p => p._id === assignment.participantId);
          if (participant) {
            seedToParticipantId.set(assignment.seed, assignment.participantId);
            assignedParticipantIds.add(assignment.participantId);
          }
        }
      }
    }

    // Delete existing matches (for regeneration)
    const existingMatches = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    for (const match of existingMatches) {
      await ctx.db.delete(match._id);
    }

    // Delete participants that are not assigned to a seed
    for (const participant of existingParticipants) {
      if (!assignedParticipantIds.has(participant._id)) {
        await ctx.db.delete(participant._id);
      }
    }

    // Create/update participants for each slot
    const participants: Doc<"tournamentParticipants">[] = [];
    for (let i = 1; i <= actualSize; i++) {
      const assignedParticipantId = seedToParticipantId.get(i);

      if (assignedParticipantId) {
        // Update existing participant with the seed and mark as not placeholder
        await ctx.db.patch(assignedParticipantId, {
          seed: i,
          isPlaceholder: false,
        });
        const participant = await ctx.db.get(assignedParticipantId);
        if (participant) {
          participants.push(participant);
        }
      } else {
        // Create a new placeholder participant
        const participantId = await ctx.db.insert("tournamentParticipants", {
          tournamentId: args.tournamentId,
          type: tournament.participantType,
          displayName: `Slot ${i}`,
          seed: i,
          wins: 0,
          losses: 0,
          draws: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          createdAt: Date.now(),
          isPlaceholder: true,
        });

        const participant = await ctx.db.get(participantId);
        if (participant) {
          participants.push(participant);
        }
      }
    }

    // Update tournament maxParticipants if needed
    if (tournament.maxParticipants < actualSize) {
      await ctx.db.patch(args.tournamentId, {
        maxParticipants: actualSize,
      });
    }

    // Generate the bracket using existing helper (only for elimination formats)
    if (tournament.format === "single_elimination" || tournament.format === "double_elimination") {
      await generateBracketMatches(ctx, args.tournamentId, tournament, participants);
    }

    return null;
  },
});

// ============================================
// Internal mutations for tournament completion
// ============================================

/**
 * Check if all matches in a tournament are complete and mark it as completed
 * Also deactivates all temporary scorers when tournament completes
 * Called internally after each match completion
 */
export const checkAndCompleteTournament = internalMutation({
  args: { tournamentId: v.id("tournaments") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      return false;
    }

    // Only check active tournaments
    if (tournament.status !== "active") {
      return false;
    }

    // Get all matches for this tournament
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    if (matches.length === 0) {
      return false;
    }

    // Check if all matches are completed or bye
    const allComplete = matches.every(
      (m) => m.status === "completed" || m.status === "bye"
    );

    if (!allComplete) {
      return false;
    }

    // Mark tournament as completed
    await ctx.db.patch(args.tournamentId, {
      status: "completed",
      endDate: Date.now(),
    });

    // Deactivate all temporary scorers for this tournament
    await ctx.runMutation(internal.temporaryScorers.deactivateAllForTournament, {
      tournamentId: args.tournamentId,
    });

    return true;
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
      throw errors.unauthenticated();
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Only owner can cancel
    if (tournament.createdBy !== userId) {
      throw errors.unauthorized("Only the tournament owner can cancel it");
    }

    if (tournament.status === "completed" || tournament.status === "cancelled") {
      throw errors.invalidState("Tournament is already completed or cancelled");
    }

    await ctx.db.patch(args.tournamentId, {
      status: "cancelled",
    });

    // Deactivate all temporary scorers for this tournament
    await ctx.runMutation(internal.temporaryScorers.deactivateAllForTournament, {
      tournamentId: args.tournamentId,
    });

    return null;
  },
});
