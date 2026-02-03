import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { errors } from "./lib/errors";

/**
 * List scorers assigned to a tournament
 * Only the tournament owner can see the list of scorers
 */
export const listScorers = query({
  args: { tournamentId: v.id("tournaments") },
  returns: v.array(
    v.object({
      _id: v.id("tournamentScorers"),
      userId: v.id("users"),
      userName: v.optional(v.string()),
      userEmail: v.optional(v.string()),
      assignedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      return [];
    }

    // Only the tournament owner can see scorers
    if (tournament.createdBy !== userId) {
      return [];
    }

    const scorers = await ctx.db
      .query("tournamentScorers")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    const results = await Promise.all(
      scorers.map(async (scorer) => {
        const user = await ctx.db.get(scorer.userId);
        return {
          _id: scorer._id,
          userId: scorer.userId,
          userName: user?.name,
          userEmail: user?.email,
          assignedAt: scorer.assignedAt,
        };
      })
    );

    return results;
  },
});

/**
 * Assign a scorer to a tournament (owner only)
 * Assigns by email - will look up the user or create a pending invitation
 */
export const assignScorer = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    email: v.string(),
  },
  returns: v.id("tournamentScorers"),
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw errors.unauthenticated();
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Only tournament owner can assign scorers
    if (tournament.createdBy !== currentUserId) {
      throw errors.unauthorized("Only the tournament owner can assign scorers");
    }

    // Find user by email
    const normalizedEmail = args.email.toLowerCase().trim();
    const targetUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!targetUser) {
      // Use generic error to prevent email enumeration
      throw errors.invalidInput("Could not assign scorer. Please verify the email address is correct and the user has created an account.");
    }

    // Cannot assign yourself
    if (targetUser._id === currentUserId) {
      throw errors.invalidInput("You don't need to assign yourself - you already have full access as the owner");
    }

    // Check if already assigned
    const existing = await ctx.db
      .query("tournamentScorers")
      .withIndex("by_tournament_and_user", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("userId", targetUser._id)
      )
      .first();

    if (existing) {
      throw errors.conflict("User is already assigned to this tournament");
    }

    const scorerId = await ctx.db.insert("tournamentScorers", {
      tournamentId: args.tournamentId,
      userId: targetUser._id,
      assignedBy: currentUserId,
      assignedAt: Date.now(),
    });

    return scorerId;
  },
});

/**
 * Assign a scorer by user ID (owner only)
 */
export const assignScorerById = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    userId: v.id("users"),
  },
  returns: v.id("tournamentScorers"),
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw errors.unauthenticated();
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Only tournament owner can assign scorers
    if (tournament.createdBy !== currentUserId) {
      throw errors.unauthorized("Only the tournament owner can assign scorers");
    }

    // Verify user exists
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw errors.notFound("User");
    }

    // Cannot assign yourself
    if (args.userId === currentUserId) {
      throw errors.invalidInput("You don't need to assign yourself - you already have full access as the owner");
    }

    // Check if already assigned
    const existing = await ctx.db
      .query("tournamentScorers")
      .withIndex("by_tournament_and_user", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("userId", args.userId)
      )
      .first();

    if (existing) {
      throw errors.conflict("User is already assigned to this tournament");
    }

    const scorerId = await ctx.db.insert("tournamentScorers", {
      tournamentId: args.tournamentId,
      userId: args.userId,
      assignedBy: currentUserId,
      assignedAt: Date.now(),
    });

    return scorerId;
  },
});

/**
 * Remove a scorer from a tournament (owner only)
 */
export const removeScorer = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw errors.unauthenticated();
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Only tournament owner can remove scorers
    if (tournament.createdBy !== currentUserId) {
      throw errors.unauthorized("Only the tournament owner can remove scorers");
    }

    // Find the assignment
    const assignment = await ctx.db
      .query("tournamentScorers")
      .withIndex("by_tournament_and_user", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("userId", args.userId)
      )
      .first();

    if (!assignment) {
      throw errors.notFound("User assignment for this tournament");
    }

    await ctx.db.delete(assignment._id);
    return null;
  },
});

/**
 * Check if current user is assigned to a tournament
 */
export const isAssigned = query({
  args: { tournamentId: v.id("tournaments") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }

    const assignment = await ctx.db
      .query("tournamentScorers")
      .withIndex("by_tournament_and_user", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("userId", userId)
      )
      .first();

    return !!assignment;
  },
});
