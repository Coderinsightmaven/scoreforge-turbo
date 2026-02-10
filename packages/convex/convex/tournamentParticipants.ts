import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { participantTypes } from "./schema";
import { errors } from "./lib/errors";
import { validateStringLength, MAX_LENGTHS } from "./lib/validation";
import { canManageTournament, canViewTournament } from "./lib/accessControl";
import { assertNotInMaintenance } from "./lib/maintenance";

// ============================================
// Helpers
// ============================================

/**
 * Capitalize a proper name correctly (e.g., "john smith" -> "John Smith")
 * Handles hyphenated names (Mary-Jane) and apostrophe names (O'Brien)
 */
function capitalizeProperName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      // Handle hyphenated names (e.g., "mary-jane" -> "Mary-Jane")
      if (word.includes("-")) {
        return word
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join("-");
      }
      // Handle apostrophe names (e.g., "o'brien" -> "O'Brien")
      if (word.includes("'")) {
        return word
          .split("'")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join("'");
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Format a full name to abbreviated format (e.g., "Joe Berry" -> "J. Berry")
 */
function formatNameAbbreviated(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return fullName; // Single name, return as-is
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  return `${firstName?.[0]?.toUpperCase() ?? ""}. ${lastName}`;
}

/**
 * Format doubles display name (e.g., "J. Berry / M. Lorenz")
 */
function formatDoublesDisplayName(player1: string, player2: string): string {
  return `${formatNameAbbreviated(player1)} / ${formatNameAbbreviated(player2)}`;
}

// ============================================
// Queries
// ============================================

/**
 * List participants for a tournament (optionally filtered by bracket)
 */
export const listParticipants = query({
  args: {
    tournamentId: v.id("tournaments"),
    bracketId: v.optional(v.id("tournamentBrackets")),
  },
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
      isPlaceholder: v.optional(v.boolean()),
      bracketId: v.optional(v.id("tournamentBrackets")),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw errors.unauthenticated();
    }

    const tournament = await ctx.db.get("tournaments", args.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Check if user has access (owner or scorer)
    const hasAccess = await canViewTournament(ctx, tournament, userId);
    if (!hasAccess) {
      throw errors.unauthorized();
    }

    let participants;
    if (args.bracketId !== undefined) {
      // Filter by bracket
      participants = await ctx.db
        .query("tournamentParticipants")
        .withIndex("by_tournament_and_bracket", (q: any) =>
          q.eq("tournamentId", args.tournamentId).eq("bracketId", args.bracketId)
        )
        .collect();
    } else {
      // Get all participants for the tournament
      participants = await ctx.db
        .query("tournamentParticipants")
        .withIndex("by_tournament", (q: any) => q.eq("tournamentId", args.tournamentId))
        .collect();
    }

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
      isPlaceholder: p.isPlaceholder,
      bracketId: p.bracketId,
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

    const participant = await ctx.db.get("tournamentParticipants", args.participantId);
    if (!participant) {
      return null;
    }

    const tournament = await ctx.db.get("tournaments", participant.tournamentId);
    if (!tournament) {
      return null;
    }

    // Check if user has access (owner or scorer)
    const hasAccess = await canViewTournament(ctx, tournament, userId);
    if (!hasAccess) {
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
 * Add a participant to a tournament (owner only)
 * The type is determined by the tournament's participantType or bracket's participantType
 */
export const addParticipant = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    // Required bracket assignment (every tournament has at least one bracket)
    bracketId: v.id("tournamentBrackets"),
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
      throw errors.unauthenticated();
    }
    await assertNotInMaintenance(ctx, authUserId);

    const tournament = await ctx.db.get("tournaments", args.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Only owner can add participants
    const canManage = canManageTournament(tournament, authUserId);
    if (!canManage) {
      throw errors.unauthorized("Only the tournament owner can add participants");
    }

    // Check tournament status
    if (tournament.status !== "draft") {
      throw errors.invalidState("Tournament is not in draft status");
    }

    // Verify the bracket exists and belongs to this tournament
    const bracket = await ctx.db.get("tournamentBrackets", args.bracketId);
    if (!bracket) {
      throw errors.notFound("Bracket");
    }
    if (bracket.tournamentId !== args.tournamentId) {
      throw errors.invalidInput("Bracket does not belong to this tournament");
    }
    if (bracket.status !== "draft") {
      throw errors.invalidState("Bracket is not in draft status");
    }

    // Use bracket's participantType if set, otherwise fallback to tournament
    const participantType = bracket.participantType || tournament.participantType;

    // Validate input lengths
    validateStringLength(args.playerName, "Player name", MAX_LENGTHS.playerName);
    validateStringLength(args.player1Name, "Player 1 name", MAX_LENGTHS.playerName);
    validateStringLength(args.player2Name, "Player 2 name", MAX_LENGTHS.playerName);
    validateStringLength(args.teamName, "Team name", MAX_LENGTHS.teamName);

    // Check bracket's maxParticipants if set
    if (bracket.maxParticipants) {
      const bracketParticipants = await ctx.db
        .query("tournamentParticipants")
        .withIndex("by_bracket", (q: any) => q.eq("bracketId", args.bracketId))
        .collect();
      if (bracketParticipants.length >= bracket.maxParticipants) {
        throw errors.limitExceeded("Bracket is full");
      }
    }

    // Validate and generate displayName based on participant type
    let displayName: string;
    const participantData: {
      playerName?: string;
      player1Name?: string;
      player2Name?: string;
      teamName?: string;
    } = {};

    switch (participantType) {
      case "individual":
        if (!args.playerName?.trim()) {
          throw errors.invalidInput("Player name is required for individual tournaments");
        }
        displayName = capitalizeProperName(args.playerName);
        participantData.playerName = displayName;
        break;

      case "doubles": {
        if (!args.player1Name?.trim() || !args.player2Name?.trim()) {
          throw errors.invalidInput("Both player names are required for doubles tournaments");
        }
        const p1 = capitalizeProperName(args.player1Name);
        const p2 = capitalizeProperName(args.player2Name);
        displayName = formatDoublesDisplayName(p1, p2);
        participantData.player1Name = p1;
        participantData.player2Name = p2;
        break;
      }

      case "team":
        if (!args.teamName?.trim()) {
          throw errors.invalidInput("Team name is required for team tournaments");
        }
        displayName = capitalizeProperName(args.teamName);
        participantData.teamName = displayName;
        break;

      default:
        throw errors.invalidInput("Invalid tournament participant type");
    }

    const participantId = await ctx.db.insert("tournamentParticipants", {
      tournamentId: args.tournamentId,
      bracketId: args.bracketId,
      type: participantType,
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
 * Update a participant's details (before tournament starts, owner only)
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
      throw errors.unauthenticated();
    }

    const participant = await ctx.db.get("tournamentParticipants", args.participantId);
    if (!participant) {
      throw errors.notFound("Participant");
    }

    const tournament = await ctx.db.get("tournaments", participant.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Only owner can update participants
    const canManage = canManageTournament(tournament, userId);
    if (!canManage) {
      throw errors.unauthorized();
    }

    // Can only update before tournament starts
    if (tournament.status !== "draft") {
      throw errors.invalidState("Cannot update participants after tournament has started");
    }

    // Validate input lengths
    validateStringLength(args.playerName, "Player name", MAX_LENGTHS.playerName);
    validateStringLength(args.player1Name, "Player 1 name", MAX_LENGTHS.playerName);
    validateStringLength(args.player2Name, "Player 2 name", MAX_LENGTHS.playerName);
    validateStringLength(args.teamName, "Team name", MAX_LENGTHS.teamName);

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
          updates.playerName = capitalizeProperName(args.playerName);
          updates.displayName = updates.playerName;
        }
        break;

      case "doubles": {
        const updatedP1 = args.player1Name?.trim()
          ? capitalizeProperName(args.player1Name)
          : participant.player1Name;
        const updatedP2 = args.player2Name?.trim()
          ? capitalizeProperName(args.player2Name)
          : participant.player2Name;
        if (args.player1Name !== undefined || args.player2Name !== undefined) {
          updates.player1Name = updatedP1;
          updates.player2Name = updatedP2;
          updates.displayName = formatDoublesDisplayName(updatedP1 ?? "", updatedP2 ?? "");
        }
        break;
      }

      case "team":
        if (args.teamName?.trim()) {
          updates.teamName = capitalizeProperName(args.teamName);
          updates.displayName = updates.teamName;
        }
        break;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch("tournamentParticipants", args.participantId, updates);
    }

    return null;
  },
});

/**
 * Remove a participant from a tournament (before start, owner only)
 */
export const removeParticipant = mutation({
  args: { participantId: v.id("tournamentParticipants") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw errors.unauthenticated();
    }

    const participant = await ctx.db.get("tournamentParticipants", args.participantId);
    if (!participant) {
      throw errors.notFound("Participant");
    }

    const tournament = await ctx.db.get("tournaments", participant.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Only owner can remove participants
    const canManage = canManageTournament(tournament, userId);
    if (!canManage) {
      throw errors.unauthorized("Only the tournament owner can remove participants");
    }

    // Can only remove before tournament starts
    if (tournament.status !== "draft") {
      throw errors.invalidState("Cannot remove participants after tournament has started");
    }

    await ctx.db.delete("tournamentParticipants", args.participantId);
    return null;
  },
});

/**
 * Update participant seeding (before start, owner only)
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
      throw errors.unauthenticated();
    }

    const participant = await ctx.db.get("tournamentParticipants", args.participantId);
    if (!participant) {
      throw errors.notFound("Participant");
    }

    const tournament = await ctx.db.get("tournaments", participant.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Only owner can update seeding
    const canManage = canManageTournament(tournament, userId);
    if (!canManage) {
      throw errors.unauthorized();
    }

    // Can only update seeding before tournament starts
    if (tournament.status !== "draft") {
      throw errors.invalidState("Cannot update seeding after tournament has started");
    }

    await ctx.db.patch("tournamentParticipants", args.participantId, { seed: args.seed });
    return null;
  },
});

/**
 * Batch update seeding for multiple participants (owner only)
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
      throw errors.unauthenticated();
    }

    const tournament = await ctx.db.get("tournaments", args.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Only owner can update seeding
    const canManage = canManageTournament(tournament, userId);
    if (!canManage) {
      throw errors.unauthorized();
    }

    // Can only update seeding before tournament starts
    if (tournament.status !== "draft") {
      throw errors.invalidState("Cannot update seeding after tournament has started");
    }

    // Update all seedings
    for (const { participantId, seed } of args.seedings) {
      const participant = await ctx.db.get("tournamentParticipants", participantId);
      if (participant && participant.tournamentId === args.tournamentId) {
        await ctx.db.patch("tournamentParticipants", participantId, { seed });
      }
    }

    return null;
  },
});

/**
 * Update a placeholder participant's name (for blank bracket feature)
 * This replaces the placeholder with an actual participant name
 */
export const updatePlaceholderName = mutation({
  args: {
    participantId: v.id("tournamentParticipants"),
    displayName: v.string(),
    // Optional: for individual tournaments
    playerName: v.optional(v.string()),
    // Optional: for doubles tournaments
    player1Name: v.optional(v.string()),
    player2Name: v.optional(v.string()),
    // Optional: for team tournaments
    teamName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw errors.unauthenticated();
    }

    const participant = await ctx.db.get("tournamentParticipants", args.participantId);
    if (!participant) {
      throw errors.notFound("Participant");
    }

    const tournament = await ctx.db.get("tournaments", participant.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Only owner can update placeholder names
    const canManage = canManageTournament(tournament, userId);
    if (!canManage) {
      throw errors.unauthorized();
    }

    // Validate input lengths
    validateStringLength(args.displayName, "Display name", MAX_LENGTHS.displayName);
    validateStringLength(args.playerName, "Player name", MAX_LENGTHS.playerName);
    validateStringLength(args.player1Name, "Player 1 name", MAX_LENGTHS.playerName);
    validateStringLength(args.player2Name, "Player 2 name", MAX_LENGTHS.playerName);
    validateStringLength(args.teamName, "Team name", MAX_LENGTHS.teamName);

    // Build updates based on participant type
    const updates: {
      displayName: string;
      isPlaceholder: boolean;
      playerName?: string;
      player1Name?: string;
      player2Name?: string;
      teamName?: string;
    } = {
      displayName: capitalizeProperName(args.displayName),
      isPlaceholder: false, // Mark as no longer a placeholder
    };

    // Add type-specific fields if provided
    switch (participant.type) {
      case "individual":
        if (args.playerName?.trim()) {
          updates.playerName = capitalizeProperName(args.playerName);
        } else {
          updates.playerName = capitalizeProperName(args.displayName);
        }
        break;

      case "doubles":
        if (args.player1Name?.trim()) {
          updates.player1Name = capitalizeProperName(args.player1Name);
        }
        if (args.player2Name?.trim()) {
          updates.player2Name = capitalizeProperName(args.player2Name);
        }
        break;

      case "team":
        if (args.teamName?.trim()) {
          updates.teamName = capitalizeProperName(args.teamName);
        } else {
          updates.teamName = capitalizeProperName(args.displayName);
        }
        break;
    }

    await ctx.db.patch("tournamentParticipants", args.participantId, updates);
    return null;
  },
});
