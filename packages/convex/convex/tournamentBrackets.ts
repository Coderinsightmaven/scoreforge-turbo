import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import {
  tournamentFormats,
  participantTypes,
  bracketStatus,
  tennisConfig,
  tennisState,
} from "./schema";
import { errors } from "./lib/errors";
import { canManageTournament, canViewTournament } from "./lib/accessControl";
import { assertNotInMaintenance } from "./lib/maintenance";
import { generateBracketMatches } from "./tournaments";

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

    const tournament = await ctx.db.get("tournaments", args.tournamentId);
    if (!tournament) {
      return [];
    }

    const hasAccess = await canViewTournament(ctx, tournament, userId);
    if (!hasAccess) {
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

    const bracket = await ctx.db.get("tournamentBrackets", args.bracketId);
    if (!bracket) {
      return null;
    }

    const tournament = await ctx.db.get("tournaments", bracket.tournamentId);
    if (!tournament) {
      return null;
    }

    const hasAccess = await canViewTournament(ctx, tournament, userId);
    if (!hasAccess) {
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

    const bracket = await ctx.db.get("tournamentBrackets", args.bracketId);
    if (!bracket) {
      return null;
    }

    const tournament = await ctx.db.get("tournaments", bracket.tournamentId);
    if (!tournament) {
      return null;
    }

    const hasAccess = await canViewTournament(ctx, tournament, userId);
    if (!hasAccess) {
      return null;
    }

    // Get all matches for this bracket
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_bracket", (q: any) => q.eq("bracketId", args.bracketId))
      .collect();

    // Batch-fetch all unique participant IDs to avoid N+1 queries
    const participantIds = new Set<Id<"tournamentParticipants">>();
    for (const match of matches) {
      if (match.participant1Id) participantIds.add(match.participant1Id);
      if (match.participant2Id) participantIds.add(match.participant2Id);
    }

    const participantDocs = await Promise.all(
      [...participantIds].map((id) => ctx.db.get("tournamentParticipants", id))
    );
    const participantMap = new Map<string, Doc<"tournamentParticipants">>();
    for (const doc of participantDocs) {
      if (doc) participantMap.set(doc._id, doc);
    }

    // Enrich matches with participant details using the pre-fetched map
    const matchesWithParticipants = matches.map((match: Doc<"matches">) => {
      let participant1 = undefined;
      let participant2 = undefined;

      if (match.participant1Id) {
        const p1 = participantMap.get(match.participant1Id);
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
        const p2 = participantMap.get(match.participant2Id);
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
    });

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
  },
  returns: v.id("tournamentBrackets"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw errors.unauthenticated();
    }
    await assertNotInMaintenance(ctx, userId);

    const tournament = await ctx.db.get("tournaments", args.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    if (!canManageTournament(tournament, userId)) {
      throw errors.unauthorized("Only the tournament owner can create brackets");
    }

    // Only allow creating brackets in draft or active tournaments
    if (tournament.status !== "draft" && tournament.status !== "active") {
      throw errors.invalidState("Cannot create brackets for completed or cancelled tournaments");
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
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw errors.unauthenticated();
    }

    const bracket = await ctx.db.get("tournamentBrackets", args.bracketId);
    if (!bracket) {
      throw errors.notFound("Bracket");
    }

    const tournament = await ctx.db.get("tournaments", bracket.tournamentId);
    if (!tournament || !canManageTournament(tournament, userId)) {
      throw errors.unauthorized("Only the tournament owner can update brackets");
    }

    // Only allow updating draft brackets
    if (bracket.status !== "draft") {
      throw errors.invalidState("Can only update draft brackets");
    }

    const updates: Partial<Doc<"tournamentBrackets">> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.format !== undefined) updates.format = args.format;
    if (args.participantType !== undefined) updates.participantType = args.participantType;
    if (args.maxParticipants !== undefined) updates.maxParticipants = args.maxParticipants;
    if (args.tennisConfig !== undefined) updates.tennisConfig = args.tennisConfig;

    await ctx.db.patch("tournamentBrackets", args.bracketId, updates);
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
      throw errors.unauthenticated();
    }

    const bracket = await ctx.db.get("tournamentBrackets", args.bracketId);
    if (!bracket) {
      throw errors.notFound("Bracket");
    }

    const tournament = await ctx.db.get("tournaments", bracket.tournamentId);
    if (!tournament || !canManageTournament(tournament, userId)) {
      throw errors.unauthorized("Only the tournament owner can delete brackets");
    }

    // Only allow deleting draft brackets
    if (bracket.status !== "draft") {
      throw errors.invalidState("Can only delete draft brackets");
    }

    // Check if this is the last bracket - cannot delete
    const allBrackets = await ctx.db
      .query("tournamentBrackets")
      .withIndex("by_tournament", (q: any) => q.eq("tournamentId", bracket.tournamentId))
      .collect();

    if (allBrackets.length <= 1) {
      throw errors.invalidState(
        "Cannot delete the last bracket. Every tournament must have at least one bracket"
      );
    }

    // Check if bracket has participants
    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_bracket", (q: any) => q.eq("bracketId", args.bracketId))
      .first();

    if (participants) {
      throw errors.invalidState(
        "Cannot delete bracket with participants. Remove participants first"
      );
    }

    // Check if bracket has matches
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_bracket", (q: any) => q.eq("bracketId", args.bracketId))
      .first();

    if (matches) {
      throw errors.invalidState("Cannot delete bracket with matches. Delete matches first");
    }

    await ctx.db.delete("tournamentBrackets", args.bracketId);
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
      throw errors.unauthenticated();
    }

    const tournament = await ctx.db.get("tournaments", args.tournamentId);
    if (!tournament || !canManageTournament(tournament, userId)) {
      throw errors.unauthorized("Only the tournament owner can reorder brackets");
    }

    // Verify all brackets belong to this tournament
    for (let i = 0; i < args.bracketIds.length; i++) {
      const bracket = await ctx.db.get("tournamentBrackets", args.bracketIds[i]!);
      if (!bracket || bracket.tournamentId !== args.tournamentId) {
        throw errors.invalidInput("Invalid bracket ID");
      }

      await ctx.db.patch("tournamentBrackets", args.bracketIds[i]!, {
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
      throw errors.unauthenticated();
    }

    const bracket = await ctx.db.get("tournamentBrackets", args.bracketId);
    if (!bracket) {
      throw errors.notFound("Bracket");
    }

    const tournament = await ctx.db.get("tournaments", bracket.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    if (!canManageTournament(tournament, userId)) {
      throw errors.unauthorized("Only the tournament owner can start brackets");
    }

    if (bracket.status !== "draft") {
      throw errors.invalidState("Bracket has already started or is completed");
    }

    // Tournament must be active to start brackets
    if (tournament.status !== "active") {
      throw errors.invalidState("Tournament must be started before brackets can be activated");
    }

    // Get participants in this bracket
    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_bracket", (q: any) => q.eq("bracketId", args.bracketId))
      .collect();

    if (participants.length < 2) {
      throw errors.invalidInput("Need at least 2 participants to start bracket");
    }

    // Check if matches already exist
    const existingMatches = await ctx.db
      .query("matches")
      .withIndex("by_bracket", (q: any) => q.eq("bracketId", args.bracketId))
      .first();

    // Generate matches if they don't exist
    if (!existingMatches) {
      const format = bracket.format || tournament.format;
      await generateBracketMatches(ctx, tournament._id, tournament, participants, {
        bracketId: args.bracketId,
        format,
      });
    }

    // Update bracket status
    await ctx.db.patch("tournamentBrackets", args.bracketId, {
      status: "active",
    });

    return null;
  },
});

/**
 * Generate matches for a bracket while still in draft mode
 */
export const generateBracketMatchesForBracket = mutation({
  args: { bracketId: v.id("tournamentBrackets") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw errors.unauthenticated();
    }

    const bracket = await ctx.db.get("tournamentBrackets", args.bracketId);
    if (!bracket) {
      throw errors.notFound("Bracket");
    }

    const tournament = await ctx.db.get("tournaments", bracket.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    if (!canManageTournament(tournament, userId)) {
      throw errors.unauthorized("Only the tournament owner can generate matches");
    }

    if (bracket.status !== "draft") {
      throw errors.invalidState("Can only generate matches for draft brackets");
    }

    // Get participants in this bracket
    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_bracket", (q: any) => q.eq("bracketId", args.bracketId))
      .collect();

    if (participants.length < 2) {
      throw errors.invalidInput("Need at least 2 participants to generate bracket");
    }

    // Delete existing matches for this bracket
    const existingMatches = await ctx.db
      .query("matches")
      .withIndex("by_bracket", (q: any) => q.eq("bracketId", args.bracketId))
      .collect();

    for (const match of existingMatches) {
      await ctx.db.delete("matches", match._id);
    }

    // Generate new matches
    const format = bracket.format || tournament.format;
    await generateBracketMatches(ctx, tournament._id, tournament, participants, {
      bracketId: args.bracketId,
      format,
    });

    return null;
  },
});
