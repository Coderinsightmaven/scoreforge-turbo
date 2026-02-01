import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import {
  tournamentFormats,
  participantTypes,
  bracketStatus,
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
// Access Control Helpers
// ============================================

/**
 * Check if user can manage tournament (owner only)
 */
async function canManageTournament(
  ctx: { db: any },
  tournamentId: Id<"tournaments">,
  userId: Id<"users">
): Promise<boolean> {
  const tournament = await ctx.db.get(tournamentId);
  return tournament?.createdBy === userId;
}

/**
 * Check if user can view tournament (owner or scorer)
 */
async function canViewTournament(
  ctx: { db: any },
  tournamentId: Id<"tournaments">,
  userId: Id<"users">
): Promise<boolean> {
  const tournament = await ctx.db.get(tournamentId);
  if (!tournament) return false;
  if (tournament.createdBy === userId) return true;

  const scorer = await ctx.db
    .query("tournamentScorers")
    .withIndex("by_tournament_and_user", (q: any) =>
      q.eq("tournamentId", tournamentId).eq("userId", userId)
    )
    .first();
  return scorer !== null;
}

// ============================================
// Queries
// ============================================

/**
 * List all brackets for a tournament
 */
export const listBrackets = query({
  args: { tournamentId: v.id("tournaments") },
  returns: v.array(
    v.object({
      _id: v.id("tournamentBrackets"),
      tournamentId: v.id("tournaments"),
      name: v.string(),
      description: v.optional(v.string()),
      format: v.optional(tournamentFormats),
      participantType: v.optional(participantTypes),
      maxParticipants: v.optional(v.number()),
      tennisConfig: v.optional(tennisConfig),
      volleyballConfig: v.optional(volleyballConfig),
      status: bracketStatus,
      displayOrder: v.number(),
      createdAt: v.number(),
      participantCount: v.number(),
      matchCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const hasAccess = await canViewTournament(ctx, args.tournamentId, userId);
    if (!hasAccess) {
      // Return empty array if tournament doesn't exist or user doesn't have access
      return [];
    }

    const brackets = await ctx.db
      .query("tournamentBrackets")
      .withIndex("by_tournament", (q: any) => q.eq("tournamentId", args.tournamentId))
      .collect();

    // Get participant and match counts for each bracket
    const enrichedBrackets = await Promise.all(
      brackets.map(async (bracket: Doc<"tournamentBrackets">) => {
        const participants = await ctx.db
          .query("tournamentParticipants")
          .withIndex("by_bracket", (q: any) => q.eq("bracketId", bracket._id))
          .collect();

        const matches = await ctx.db
          .query("matches")
          .withIndex("by_bracket", (q: any) => q.eq("bracketId", bracket._id))
          .collect();

        return {
          _id: bracket._id,
          tournamentId: bracket.tournamentId,
          name: bracket.name,
          description: bracket.description,
          format: bracket.format,
          participantType: bracket.participantType,
          maxParticipants: bracket.maxParticipants,
          tennisConfig: bracket.tennisConfig,
          volleyballConfig: bracket.volleyballConfig,
          status: bracket.status,
          displayOrder: bracket.displayOrder,
          createdAt: bracket.createdAt,
          participantCount: participants.length,
          matchCount: matches.length,
        };
      })
    );

    // Sort by displayOrder
    enrichedBrackets.sort((a, b) => a.displayOrder - b.displayOrder);

    return enrichedBrackets;
  },
});

/**
 * Get a single bracket with details
 */
export const getBracket = query({
  args: { bracketId: v.id("tournamentBrackets") },
  returns: v.union(
    v.object({
      _id: v.id("tournamentBrackets"),
      tournamentId: v.id("tournaments"),
      name: v.string(),
      description: v.optional(v.string()),
      format: v.optional(tournamentFormats),
      participantType: v.optional(participantTypes),
      maxParticipants: v.optional(v.number()),
      tennisConfig: v.optional(tennisConfig),
      volleyballConfig: v.optional(volleyballConfig),
      status: bracketStatus,
      displayOrder: v.number(),
      createdAt: v.number(),
      participantCount: v.number(),
      matchCount: v.number(),
      // Resolved values (from bracket or tournament)
      resolvedFormat: tournamentFormats,
      resolvedParticipantType: participantTypes,
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const bracket = await ctx.db.get(args.bracketId);
    if (!bracket) {
      return null;
    }

    const hasAccess = await canViewTournament(ctx, bracket.tournamentId, userId);
    if (!hasAccess) {
      return null;
    }

    const tournament = await ctx.db.get(bracket.tournamentId);
    if (!tournament) {
      return null;
    }

    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_bracket", (q: any) => q.eq("bracketId", bracket._id))
      .collect();

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_bracket", (q: any) => q.eq("bracketId", bracket._id))
      .collect();

    return {
      _id: bracket._id,
      tournamentId: bracket.tournamentId,
      name: bracket.name,
      description: bracket.description,
      format: bracket.format,
      participantType: bracket.participantType,
      maxParticipants: bracket.maxParticipants,
      tennisConfig: bracket.tennisConfig,
      volleyballConfig: bracket.volleyballConfig,
      status: bracket.status,
      displayOrder: bracket.displayOrder,
      createdAt: bracket.createdAt,
      participantCount: participants.length,
      matchCount: matches.length,
      resolvedFormat: bracket.format || tournament.format,
      resolvedParticipantType: bracket.participantType || tournament.participantType,
    };
  },
});

/**
 * Get bracket/matches structure for a specific tournament bracket
 */
export const getBracketMatches = query({
  args: { bracketId: v.id("tournamentBrackets") },
  returns: v.union(
    v.object({
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
          volleyballState: v.optional(volleyballState),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const bracket = await ctx.db.get(args.bracketId);
    if (!bracket) {
      return null;
    }

    const hasAccess = await canViewTournament(ctx, bracket.tournamentId, userId);
    if (!hasAccess) {
      return null;
    }

    const tournament = await ctx.db.get(bracket.tournamentId);
    if (!tournament) {
      return null;
    }

    // Get all matches for this bracket
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_bracket", (q: any) => q.eq("bracketId", args.bracketId))
      .collect();

    // Get participant details
    const matchesWithParticipants = await Promise.all(
      matches.map(async (match: Doc<"matches">) => {
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
          volleyballState: match.volleyballState,
        };
      })
    );

    const resolvedFormat = bracket.format || tournament.format;

    return {
      format: resolvedFormat,
      sport: tournament.sport,
      matches: matchesWithParticipants,
    };
  },
});

// ============================================
// Mutations
// ============================================

/**
 * Create a new bracket within a tournament
 */
export const createBracket = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    name: v.string(),
    description: v.optional(v.string()),
    format: v.optional(tournamentFormats),
    participantType: v.optional(participantTypes),
    maxParticipants: v.optional(v.number()),
    tennisConfig: v.optional(tennisConfig),
    volleyballConfig: v.optional(volleyballConfig),
  },
  returns: v.id("tournamentBrackets"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const canManage = await canManageTournament(ctx, args.tournamentId, userId);
    if (!canManage) {
      throw new Error("Not authorized. Only the tournament owner can create brackets.");
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Only allow creating brackets in draft or active tournaments
    if (tournament.status !== "draft" && tournament.status !== "active") {
      throw new Error("Cannot create brackets for completed or cancelled tournaments");
    }

    // Get highest displayOrder
    const existingBrackets = await ctx.db
      .query("tournamentBrackets")
      .withIndex("by_tournament", (q: any) => q.eq("tournamentId", args.tournamentId))
      .collect();

    const maxOrder = existingBrackets.reduce(
      (max, b: Doc<"tournamentBrackets">) => Math.max(max, b.displayOrder),
      0
    );

    const bracketId = await ctx.db.insert("tournamentBrackets", {
      tournamentId: args.tournamentId,
      name: args.name,
      description: args.description,
      format: args.format,
      participantType: args.participantType,
      maxParticipants: args.maxParticipants,
      tennisConfig: args.tennisConfig,
      volleyballConfig: args.volleyballConfig,
      status: "draft",
      displayOrder: maxOrder + 1,
      createdAt: Date.now(),
    });

    return bracketId;
  },
});

/**
 * Update a bracket's details
 */
export const updateBracket = mutation({
  args: {
    bracketId: v.id("tournamentBrackets"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    format: v.optional(tournamentFormats),
    participantType: v.optional(participantTypes),
    maxParticipants: v.optional(v.number()),
    tennisConfig: v.optional(tennisConfig),
    volleyballConfig: v.optional(volleyballConfig),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const bracket = await ctx.db.get(args.bracketId);
    if (!bracket) {
      throw new Error("Bracket not found");
    }

    const canManage = await canManageTournament(ctx, bracket.tournamentId, userId);
    if (!canManage) {
      throw new Error("Not authorized. Only the tournament owner can update brackets.");
    }

    // Only allow updating draft brackets
    if (bracket.status !== "draft") {
      throw new Error("Can only update draft brackets");
    }

    const updates: Partial<Doc<"tournamentBrackets">> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.format !== undefined) updates.format = args.format;
    if (args.participantType !== undefined) updates.participantType = args.participantType;
    if (args.maxParticipants !== undefined) updates.maxParticipants = args.maxParticipants;
    if (args.tennisConfig !== undefined) updates.tennisConfig = args.tennisConfig;
    if (args.volleyballConfig !== undefined) updates.volleyballConfig = args.volleyballConfig;

    await ctx.db.patch(args.bracketId, updates);
    return null;
  },
});

/**
 * Delete a bracket (only if empty and in draft status)
 * Cannot delete the last bracket in a tournament
 */
export const deleteBracket = mutation({
  args: { bracketId: v.id("tournamentBrackets") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const bracket = await ctx.db.get(args.bracketId);
    if (!bracket) {
      throw new Error("Bracket not found");
    }

    const canManage = await canManageTournament(ctx, bracket.tournamentId, userId);
    if (!canManage) {
      throw new Error("Not authorized. Only the tournament owner can delete brackets.");
    }

    // Only allow deleting draft brackets
    if (bracket.status !== "draft") {
      throw new Error("Can only delete draft brackets");
    }

    // Check if this is the last bracket - cannot delete
    const allBrackets = await ctx.db
      .query("tournamentBrackets")
      .withIndex("by_tournament", (q: any) => q.eq("tournamentId", bracket.tournamentId))
      .collect();

    if (allBrackets.length <= 1) {
      throw new Error("Cannot delete the last bracket. Every tournament must have at least one bracket.");
    }

    // Check if bracket has participants
    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_bracket", (q: any) => q.eq("bracketId", args.bracketId))
      .first();

    if (participants) {
      throw new Error("Cannot delete bracket with participants. Remove participants first.");
    }

    // Check if bracket has matches
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_bracket", (q: any) => q.eq("bracketId", args.bracketId))
      .first();

    if (matches) {
      throw new Error("Cannot delete bracket with matches. Delete matches first.");
    }

    await ctx.db.delete(args.bracketId);
    return null;
  },
});

/**
 * Reorder brackets by providing an array of bracket IDs in the desired order
 */
export const reorderBrackets = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    bracketIds: v.array(v.id("tournamentBrackets")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const canManage = await canManageTournament(ctx, args.tournamentId, userId);
    if (!canManage) {
      throw new Error("Not authorized. Only the tournament owner can reorder brackets.");
    }

    // Verify all brackets belong to this tournament
    for (let i = 0; i < args.bracketIds.length; i++) {
      const bracket = await ctx.db.get(args.bracketIds[i]!);
      if (!bracket || bracket.tournamentId !== args.tournamentId) {
        throw new Error("Invalid bracket ID");
      }

      await ctx.db.patch(args.bracketIds[i]!, {
        displayOrder: i + 1,
      });
    }

    return null;
  },
});

/**
 * Start a single bracket (set to active)
 */
export const startBracket = mutation({
  args: { bracketId: v.id("tournamentBrackets") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const bracket = await ctx.db.get(args.bracketId);
    if (!bracket) {
      throw new Error("Bracket not found");
    }

    const canManage = await canManageTournament(ctx, bracket.tournamentId, userId);
    if (!canManage) {
      throw new Error("Not authorized. Only the tournament owner can start brackets.");
    }

    if (bracket.status !== "draft") {
      throw new Error("Bracket has already started or is completed");
    }

    const tournament = await ctx.db.get(bracket.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Tournament must be active to start brackets
    if (tournament.status !== "active") {
      throw new Error("Tournament must be started before brackets can be activated");
    }

    // Get participants in this bracket
    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_bracket", (q: any) => q.eq("bracketId", args.bracketId))
      .collect();

    if (participants.length < 2) {
      throw new Error("Need at least 2 participants to start bracket");
    }

    // Check if matches already exist
    const existingMatches = await ctx.db
      .query("matches")
      .withIndex("by_bracket", (q: any) => q.eq("bracketId", args.bracketId))
      .first();

    // Generate matches if they don't exist
    if (!existingMatches) {
      await generateBracketMatchesInternal(ctx, args.bracketId, bracket, tournament, participants);
    }

    // Update bracket status
    await ctx.db.patch(args.bracketId, {
      status: "active",
    });

    return null;
  },
});

/**
 * Generate matches for a bracket while still in draft mode
 */
export const generateBracketMatches = mutation({
  args: { bracketId: v.id("tournamentBrackets") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const bracket = await ctx.db.get(args.bracketId);
    if (!bracket) {
      throw new Error("Bracket not found");
    }

    const canManage = await canManageTournament(ctx, bracket.tournamentId, userId);
    if (!canManage) {
      throw new Error("Not authorized. Only the tournament owner can generate matches.");
    }

    if (bracket.status !== "draft") {
      throw new Error("Can only generate matches for draft brackets");
    }

    const tournament = await ctx.db.get(bracket.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Get participants in this bracket
    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_bracket", (q: any) => q.eq("bracketId", args.bracketId))
      .collect();

    if (participants.length < 2) {
      throw new Error("Need at least 2 participants to generate bracket");
    }

    // Delete existing matches for this bracket
    const existingMatches = await ctx.db
      .query("matches")
      .withIndex("by_bracket", (q: any) => q.eq("bracketId", args.bracketId))
      .collect();

    for (const match of existingMatches) {
      await ctx.db.delete(match._id);
    }

    // Generate new matches
    await generateBracketMatchesInternal(ctx, args.bracketId, bracket, tournament, participants);

    return null;
  },
});

/**
 * Internal helper to generate bracket matches
 */
async function generateBracketMatchesInternal(
  ctx: MutationCtx,
  bracketId: Id<"tournamentBrackets">,
  bracket: Doc<"tournamentBrackets">,
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
  const format = bracket.format || tournament.format;

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
      throw new Error("Unknown tournament format");
  }

  // Insert matches and build ID map for next match linking
  const matchIdMap = new Map<number, Id<"matches">>();

  for (let i = 0; i < matchData.length; i++) {
    const match = matchData[i]!;
    const matchId = await ctx.db.insert("matches", {
      tournamentId: tournament._id,
      bracketId,
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
