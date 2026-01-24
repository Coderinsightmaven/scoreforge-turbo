import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  tournamentFormats,
  tournamentStatus,
  presetSports,
  participantTypes,
  tennisConfig,
} from "./schema";
import {
  generateSingleEliminationBracket,
  generateDoubleEliminationBracket,
  generateRoundRobinSchedule,
} from "./lib/bracketGenerator";

// ============================================
// Queries
// ============================================

/**
 * List tournaments for an organization with optional filters
 */
export const listByOrganization = query({
  args: {
    organizationId: v.id("organizations"),
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
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Check if user is a member of the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      return [];
    }

    // Query tournaments
    let tournaments;
    if (args.status) {
      tournaments = await ctx.db
        .query("tournaments")
        .withIndex("by_organization_and_status", (q) =>
          q.eq("organizationId", args.organizationId).eq("status", args.status!)
        )
        .collect();
    } else {
      tournaments = await ctx.db
        .query("tournaments")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId)
        )
        .collect();
    }

    // Get participant counts
    const results = await Promise.all(
      tournaments.map(async (tournament) => {
        const participants = await ctx.db
          .query("tournamentParticipants")
          .withIndex("by_tournament", (q) =>
            q.eq("tournamentId", tournament._id)
          )
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
          participantCount: participants.length,
        };
      })
    );

    return results;
  },
});

/**
 * Get a single tournament with user's role
 */
export const getTournament = query({
  args: { tournamentId: v.id("tournaments") },
  returns: v.union(
    v.object({
      _id: v.id("tournaments"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      name: v.string(),
      description: v.optional(v.string()),
      sport: presetSports,
      format: tournamentFormats,
      participantType: participantTypes,
      maxParticipants: v.number(),
      status: tournamentStatus,
      registrationStartDate: v.optional(v.number()),
      registrationEndDate: v.optional(v.number()),
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
      createdBy: v.id("users"),
      participantCount: v.number(),
      myRole: v.union(
        v.literal("owner"),
        v.literal("admin"),
        v.literal("scorer")
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const tournament = await ctx.db.get("tournaments", args.tournamentId);
    if (!tournament) {
      return null;
    }

    // Check if user is a member of the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q
          .eq("organizationId", tournament.organizationId)
          .eq("userId", userId)
      )
      .first();

    if (!membership) {
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
      organizationId: tournament.organizationId,
      name: tournament.name,
      description: tournament.description,
      sport: tournament.sport,
      format: tournament.format,
      participantType: tournament.participantType,
      maxParticipants: tournament.maxParticipants,
      status: tournament.status,
      registrationStartDate: tournament.registrationStartDate,
      registrationEndDate: tournament.registrationEndDate,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      scoringConfig: tournament.scoringConfig,
      tennisConfig: tournament.tennisConfig,
      createdBy: tournament.createdBy,
      participantCount: participants.length,
      myRole: membership.role,
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
        nextMatchId: v.optional(v.id("matches")),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const tournament = await ctx.db.get("tournaments", args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check if user is a member of the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q
          .eq("organizationId", tournament.organizationId)
          .eq("userId", userId)
      )
      .first();

    if (!membership) {
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
          const p1 = await ctx.db.get("tournamentParticipants", match.participant1Id);
          if (p1) {
            participant1 = {
              _id: p1._id,
              displayName: p1.displayName,
              seed: p1.seed,
            };
          }
        }

        if (match.participant2Id) {
          const p2 = await ctx.db.get("tournamentParticipants", match.participant2Id);
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
          nextMatchId: match.nextMatchId,
        };
      })
    );

    return {
      format: tournament.format,
      matches: matchesWithParticipants,
    };
  },
});

/**
 * List tournaments the user is assigned to score
 * - Owners/admins see all tournaments in their orgs
 * - Scorers only see tournaments they're explicitly assigned to
 */
export const listMyTournaments = query({
  args: {
    status: v.optional(tournamentStatus),
  },
  returns: v.array(
    v.object({
      _id: v.id("tournaments"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      organizationName: v.string(),
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
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Get tournaments user is explicitly assigned to as scorer
    const scorerAssignments = await ctx.db
      .query("tournamentScorers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const assignedTournamentIds = new Set(scorerAssignments.map((a) => a.tournamentId));

    // Get all organizations the user is a member of
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (memberships.length === 0 && assignedTournamentIds.size === 0) {
      return [];
    }

    const results = [];
    const processedTournamentIds = new Set<string>();

    // First, process tournaments user is assigned to as scorer
    for (const assignment of scorerAssignments) {
      const tournament = await ctx.db.get("tournaments", assignment.tournamentId);
      if (!tournament) continue;
      if (args.status && tournament.status !== args.status) continue;

      const org = await ctx.db.get("organizations", tournament.organizationId);
      if (!org) continue;

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
        organizationId: tournament.organizationId,
        organizationName: org.name,
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
      });

      processedTournamentIds.add(tournament._id);
    }

    // For owners/admins, also show all tournaments in their orgs
    for (const membership of memberships) {
      // Only owners and admins see all tournaments
      if (membership.role !== "owner" && membership.role !== "admin") {
        continue;
      }

      const org = await ctx.db.get("organizations", membership.organizationId);
      if (!org) continue;

      let tournaments;
      if (args.status) {
        tournaments = await ctx.db
          .query("tournaments")
          .withIndex("by_organization_and_status", (q) =>
            q.eq("organizationId", membership.organizationId).eq("status", args.status!)
          )
          .collect();
      } else {
        tournaments = await ctx.db
          .query("tournaments")
          .withIndex("by_organization", (q) =>
            q.eq("organizationId", membership.organizationId)
          )
          .collect();
      }

      for (const tournament of tournaments) {
        // Skip if already processed
        if (processedTournamentIds.has(tournament._id)) continue;

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
          organizationId: tournament.organizationId,
          organizationName: org.name,
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
        });

        processedTournamentIds.add(tournament._id);
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

    const tournament = await ctx.db.get("tournaments", args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check if user is a member of the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q
          .eq("organizationId", tournament.organizationId)
          .eq("userId", userId)
      )
      .first();

    if (!membership) {
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
 * Create a new tournament (owner/admin only)
 */
export const createTournament = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    sport: presetSports,
    format: tournamentFormats,
    participantType: participantTypes,
    maxParticipants: v.number(),
    registrationStartDate: v.optional(v.number()),
    registrationEndDate: v.optional(v.number()),
    startDate: v.optional(v.number()),
    scoringConfig: v.optional(
      v.object({
        pointsPerWin: v.optional(v.number()),
        pointsPerDraw: v.optional(v.number()),
        pointsPerLoss: v.optional(v.number()),
      })
    ),
    // Tennis-specific configuration (required when sport is tennis)
    tennisConfig: v.optional(tennisConfig),
  },
  returns: v.id("tournaments"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check user's role
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (
      !membership ||
      (membership.role !== "owner" && membership.role !== "admin")
    ) {
      throw new Error("Not authorized. Only owners and admins can create tournaments.");
    }

    // Validate tennis config for tennis tournaments
    if (args.sport === "tennis" && !args.tennisConfig) {
      throw new Error("Tennis configuration is required for tennis tournaments");
    }

    const tournamentId = await ctx.db.insert("tournaments", {
      organizationId: args.organizationId,
      name: args.name,
      description: args.description,
      sport: args.sport,
      format: args.format,
      participantType: args.participantType,
      maxParticipants: args.maxParticipants,
      status: "draft",
      registrationStartDate: args.registrationStartDate,
      registrationEndDate: args.registrationEndDate,
      startDate: args.startDate,
      scoringConfig: args.scoringConfig,
      tennisConfig: args.tennisConfig,
      createdBy: userId,
    });

    return tournamentId;
  },
});

/**
 * Update tournament details (owner/admin only)
 */
export const updateTournament = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    maxParticipants: v.optional(v.number()),
    registrationStartDate: v.optional(v.number()),
    registrationEndDate: v.optional(v.number()),
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

    const tournament = await ctx.db.get("tournaments", args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check user's role
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q
          .eq("organizationId", tournament.organizationId)
          .eq("userId", userId)
      )
      .first();

    if (
      !membership ||
      (membership.role !== "owner" && membership.role !== "admin")
    ) {
      throw new Error("Not authorized");
    }

    // Can only update draft or registration status tournaments
    if (tournament.status !== "draft" && tournament.status !== "registration") {
      throw new Error("Cannot update tournament after it has started");
    }

    const updates: Partial<typeof tournament> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.maxParticipants !== undefined)
      updates.maxParticipants = args.maxParticipants;
    if (args.registrationStartDate !== undefined)
      updates.registrationStartDate = args.registrationStartDate;
    if (args.registrationEndDate !== undefined)
      updates.registrationEndDate = args.registrationEndDate;
    if (args.startDate !== undefined) updates.startDate = args.startDate;
    if (args.scoringConfig !== undefined)
      updates.scoringConfig = args.scoringConfig;

    await ctx.db.patch("tournaments", args.tournamentId, updates);
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

    const tournament = await ctx.db.get("tournaments", args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check user's role
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q
          .eq("organizationId", tournament.organizationId)
          .eq("userId", userId)
      )
      .first();

    if (!membership || membership.role !== "owner") {
      throw new Error("Only the owner can delete tournaments");
    }

    // Delete all matches
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    for (const match of matches) {
      await ctx.db.delete("matches", match._id);
    }

    // Delete all participants
    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    for (const participant of participants) {
      await ctx.db.delete("tournamentParticipants", participant._id);
    }

    // Delete the tournament
    await ctx.db.delete("tournaments", args.tournamentId);
    return null;
  },
});

/**
 * Start a tournament - generates bracket/schedule (owner/admin only)
 */
export const startTournament = mutation({
  args: { tournamentId: v.id("tournaments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const tournament = await ctx.db.get("tournaments", args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check user's role
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q
          .eq("organizationId", tournament.organizationId)
          .eq("userId", userId)
      )
      .first();

    if (
      !membership ||
      (membership.role !== "owner" && membership.role !== "admin")
    ) {
      throw new Error("Not authorized");
    }

    // Can only start draft or registration status tournaments
    if (tournament.status !== "draft" && tournament.status !== "registration") {
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
      const match = matchData[i];
      const matchId = await ctx.db.insert("matches", {
        tournamentId: args.tournamentId,
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
        await ctx.db.patch("matches", matchId, updates);
      }
    }

    // Process bye matches - auto-advance winners
    for (let i = 0; i < matchData.length; i++) {
      const match = matchData[i];
      if (match.status === "bye") {
        const matchId = matchIdMap.get(i)!;
        const fullMatch = await ctx.db.get("matches", matchId);
        if (!fullMatch) continue;

        // The non-null participant wins the bye
        const winnerId = match.participant1Id || match.participant2Id;
        if (winnerId && fullMatch.nextMatchId) {
          // Update winner
          await ctx.db.patch("matches", matchId, {
            winnerId,
            completedAt: Date.now(),
          });

          // Advance to next match
          const nextMatch = await ctx.db.get("matches", fullMatch.nextMatchId);
          if (nextMatch) {
            const slot = fullMatch.nextMatchSlot;
            if (slot === 1) {
              await ctx.db.patch("matches", fullMatch.nextMatchId, {
                participant1Id: winnerId,
              });
            } else if (slot === 2) {
              await ctx.db.patch("matches", fullMatch.nextMatchId, {
                participant2Id: winnerId,
              });
            }
          }
        }
      }
    }

    // Update tournament status
    await ctx.db.patch("tournaments", args.tournamentId, {
      status: "active",
      startDate: Date.now(),
    });

    return null;
  },
});

/**
 * Open tournament for registration (owner/admin only)
 */
export const openRegistration = mutation({
  args: { tournamentId: v.id("tournaments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const tournament = await ctx.db.get("tournaments", args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check user's role
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q
          .eq("organizationId", tournament.organizationId)
          .eq("userId", userId)
      )
      .first();

    if (
      !membership ||
      (membership.role !== "owner" && membership.role !== "admin")
    ) {
      throw new Error("Not authorized");
    }

    if (tournament.status !== "draft") {
      throw new Error("Tournament is not in draft status");
    }

    await ctx.db.patch("tournaments", args.tournamentId, {
      status: "registration",
      registrationStartDate: Date.now(),
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

    const tournament = await ctx.db.get("tournaments", args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check user's role
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q
          .eq("organizationId", tournament.organizationId)
          .eq("userId", userId)
      )
      .first();

    if (!membership || membership.role !== "owner") {
      throw new Error("Only the owner can cancel tournaments");
    }

    if (tournament.status === "completed" || tournament.status === "cancelled") {
      throw new Error("Tournament is already completed or cancelled");
    }

    await ctx.db.patch("tournaments", args.tournamentId, {
      status: "cancelled",
    });

    return null;
  },
});
