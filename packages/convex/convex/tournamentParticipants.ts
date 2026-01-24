import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { participantTypes } from "./schema";

// ============================================
// Queries
// ============================================

/**
 * List participants for a tournament
 */
export const listParticipants = query({
  args: { tournamentId: v.id("tournaments") },
  returns: v.array(
    v.object({
      _id: v.id("tournamentParticipants"),
      type: participantTypes,
      displayName: v.string(),
      playerName: v.optional(v.string()),
      player1Name: v.optional(v.string()),
      player2Name: v.optional(v.string()),
      teamName: v.optional(v.string()),
      seed: v.optional(v.number()),
      wins: v.number(),
      losses: v.number(),
      draws: v.number(),
      pointsFor: v.number(),
      pointsAgainst: v.number(),
      createdAt: v.number(),
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

    // Check if user is a member of the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", tournament.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      throw new Error("Not authorized");
    }

    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    // Sort by seed (if set) then creation time
    const sorted = [...participants].sort((a, b) => {
      if (a.seed && b.seed) return a.seed - b.seed;
      if (a.seed) return -1;
      if (b.seed) return 1;
      return a.createdAt - b.createdAt;
    });

    return sorted.map((p) => ({
      _id: p._id,
      type: p.type,
      displayName: p.displayName,
      playerName: p.playerName,
      player1Name: p.player1Name,
      player2Name: p.player2Name,
      teamName: p.teamName,
      seed: p.seed,
      wins: p.wins,
      losses: p.losses,
      draws: p.draws,
      pointsFor: p.pointsFor,
      pointsAgainst: p.pointsAgainst,
      createdAt: p.createdAt,
    }));
  },
});

/**
 * Get a single participant
 */
export const getParticipant = query({
  args: { participantId: v.id("tournamentParticipants") },
  returns: v.union(
    v.object({
      _id: v.id("tournamentParticipants"),
      tournamentId: v.id("tournaments"),
      type: participantTypes,
      displayName: v.string(),
      playerName: v.optional(v.string()),
      player1Name: v.optional(v.string()),
      player2Name: v.optional(v.string()),
      teamName: v.optional(v.string()),
      seed: v.optional(v.number()),
      wins: v.number(),
      losses: v.number(),
      draws: v.number(),
      pointsFor: v.number(),
      pointsAgainst: v.number(),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const participant = await ctx.db.get(args.participantId);
    if (!participant) {
      return null;
    }

    const tournament = await ctx.db.get(participant.tournamentId);
    if (!tournament) {
      return null;
    }

    // Check if user is a member of the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", tournament.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      return null;
    }

    return {
      _id: participant._id,
      tournamentId: participant.tournamentId,
      type: participant.type,
      displayName: participant.displayName,
      playerName: participant.playerName,
      player1Name: participant.player1Name,
      player2Name: participant.player2Name,
      teamName: participant.teamName,
      seed: participant.seed,
      wins: participant.wins,
      losses: participant.losses,
      draws: participant.draws,
      pointsFor: participant.pointsFor,
      pointsAgainst: participant.pointsAgainst,
      createdAt: participant.createdAt,
    };
  },
});

// ============================================
// Mutations
// ============================================

/**
 * Add a participant to a tournament (admin-only, name-based)
 * The type is determined by the tournament's participantType
 */
export const addParticipant = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    // For individual tournaments
    playerName: v.optional(v.string()),
    // For doubles tournaments
    player1Name: v.optional(v.string()),
    player2Name: v.optional(v.string()),
    // For team tournaments
    teamName: v.optional(v.string()),
    // Optional seed
    seed: v.optional(v.number()),
  },
  returns: v.id("tournamentParticipants"),
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) {
      throw new Error("Not authenticated");
    }

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check if user is admin/owner of the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", tournament.organizationId).eq("userId", authUserId)
      )
      .first();

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("Not authorized. Only owners and admins can add participants.");
    }

    // Check tournament status
    if (tournament.status !== "draft" && tournament.status !== "registration") {
      throw new Error("Tournament is not open for registration");
    }

    // Check max participants
    const currentParticipants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    if (currentParticipants.length >= tournament.maxParticipants) {
      throw new Error("Tournament is full");
    }

    // Validate and generate displayName based on tournament type
    let displayName: string;
    let participantData: {
      playerName?: string;
      player1Name?: string;
      player2Name?: string;
      teamName?: string;
    } = {};

    switch (tournament.participantType) {
      case "individual":
        if (!args.playerName?.trim()) {
          throw new Error("Player name is required for individual tournaments");
        }
        displayName = args.playerName.trim();
        participantData.playerName = displayName;
        break;

      case "doubles":
        if (!args.player1Name?.trim() || !args.player2Name?.trim()) {
          throw new Error("Both player names are required for doubles tournaments");
        }
        const p1 = args.player1Name.trim();
        const p2 = args.player2Name.trim();
        displayName = `${p1} & ${p2}`;
        participantData.player1Name = p1;
        participantData.player2Name = p2;
        break;

      case "team":
        if (!args.teamName?.trim()) {
          throw new Error("Team name is required for team tournaments");
        }
        displayName = args.teamName.trim();
        participantData.teamName = displayName;
        break;

      default:
        throw new Error("Invalid tournament participant type");
    }

    const participantId = await ctx.db.insert("tournamentParticipants", {
      tournamentId: args.tournamentId,
      type: tournament.participantType,
      displayName,
      ...participantData,
      seed: args.seed,
      wins: 0,
      losses: 0,
      draws: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      createdAt: Date.now(),
    });

    return participantId;
  },
});

/**
 * Update a participant's details (before tournament starts)
 */
export const updateParticipant = mutation({
  args: {
    participantId: v.id("tournamentParticipants"),
    // For individual tournaments
    playerName: v.optional(v.string()),
    // For doubles tournaments
    player1Name: v.optional(v.string()),
    player2Name: v.optional(v.string()),
    // For team tournaments
    teamName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const participant = await ctx.db.get(args.participantId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    const tournament = await ctx.db.get(participant.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check user's role
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", tournament.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("Not authorized");
    }

    // Can only update before tournament starts
    if (tournament.status !== "draft" && tournament.status !== "registration") {
      throw new Error("Cannot update participants after tournament has started");
    }

    // Build updates based on participant type
    const updates: {
      displayName?: string;
      playerName?: string;
      player1Name?: string;
      player2Name?: string;
      teamName?: string;
    } = {};

    switch (participant.type) {
      case "individual":
        if (args.playerName?.trim()) {
          updates.playerName = args.playerName.trim();
          updates.displayName = updates.playerName;
        }
        break;

      case "doubles":
        const p1 = args.player1Name?.trim() || participant.player1Name;
        const p2 = args.player2Name?.trim() || participant.player2Name;
        if (args.player1Name !== undefined || args.player2Name !== undefined) {
          updates.player1Name = p1;
          updates.player2Name = p2;
          updates.displayName = `${p1} & ${p2}`;
        }
        break;

      case "team":
        if (args.teamName?.trim()) {
          updates.teamName = args.teamName.trim();
          updates.displayName = updates.teamName;
        }
        break;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.participantId, updates);
    }

    return null;
  },
});

/**
 * Remove a participant from a tournament (before start)
 */
export const removeParticipant = mutation({
  args: { participantId: v.id("tournamentParticipants") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const participant = await ctx.db.get(args.participantId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    const tournament = await ctx.db.get(participant.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check user's role - only admins/owners can remove participants
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", tournament.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("Not authorized to remove participants");
    }

    // Can only remove before tournament starts
    if (tournament.status !== "draft" && tournament.status !== "registration") {
      throw new Error("Cannot remove participants after tournament has started");
    }

    await ctx.db.delete(args.participantId);
    return null;
  },
});

/**
 * Update participant seeding (before start, admin/owner only)
 */
export const updateSeeding = mutation({
  args: {
    participantId: v.id("tournamentParticipants"),
    seed: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const participant = await ctx.db.get(args.participantId);
    if (!participant) {
      throw new Error("Participant not found");
    }

    const tournament = await ctx.db.get(participant.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check user's role
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", tournament.organizationId).eq("userId", userId)
      )
      .first();

    if (
      !membership ||
      (membership.role !== "owner" && membership.role !== "admin")
    ) {
      throw new Error("Not authorized");
    }

    // Can only update seeding before tournament starts
    if (tournament.status !== "draft" && tournament.status !== "registration") {
      throw new Error("Cannot update seeding after tournament has started");
    }

    await ctx.db.patch(args.participantId, { seed: args.seed });
    return null;
  },
});

/**
 * Batch update seeding for multiple participants
 */
export const updateSeedingBatch = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    seedings: v.array(
      v.object({
        participantId: v.id("tournamentParticipants"),
        seed: v.number(),
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

    // Check user's role
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", tournament.organizationId).eq("userId", userId)
      )
      .first();

    if (
      !membership ||
      (membership.role !== "owner" && membership.role !== "admin")
    ) {
      throw new Error("Not authorized");
    }

    // Can only update seeding before tournament starts
    if (tournament.status !== "draft" && tournament.status !== "registration") {
      throw new Error("Cannot update seeding after tournament has started");
    }

    // Update all seedings
    for (const { participantId, seed } of args.seedings) {
      const participant = await ctx.db.get(participantId);
      if (participant && participant.tournamentId === args.tournamentId) {
        await ctx.db.patch(participantId, { seed });
      }
    }

    return null;
  },
});
