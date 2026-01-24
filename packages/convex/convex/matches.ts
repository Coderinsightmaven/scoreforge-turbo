import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { matchStatus, tennisState, tennisConfig } from "./schema";

// ============================================
// Queries
// ============================================

/**
 * List matches for a tournament with optional filters
 */
export const listMatches = query({
  args: {
    tournamentId: v.id("tournaments"),
    round: v.optional(v.number()),
    status: v.optional(matchStatus),
    bracket: v.optional(v.string()),
  },
  returns: v.array(
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
      status: matchStatus,
      scheduledTime: v.optional(v.number()),
      startedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
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
        q.eq("organizationId", tournament.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      throw new Error("Not authorized");
    }

    // Query matches with appropriate index
    let matches;
    if (args.round !== undefined) {
      matches = await ctx.db
        .query("matches")
        .withIndex("by_tournament_and_round", (q) =>
          q.eq("tournamentId", args.tournamentId).eq("round", args.round!)
        )
        .collect();
    } else if (args.status !== undefined) {
      matches = await ctx.db
        .query("matches")
        .withIndex("by_tournament_and_status", (q) =>
          q.eq("tournamentId", args.tournamentId).eq("status", args.status!)
        )
        .collect();
    } else if (args.bracket !== undefined) {
      matches = await ctx.db
        .query("matches")
        .withIndex("by_tournament_and_bracket", (q) =>
          q.eq("tournamentId", args.tournamentId).eq("bracket", args.bracket)
        )
        .collect();
    } else {
      matches = await ctx.db
        .query("matches")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
        .collect();
    }

    // Enrich with participant details
    const enriched = await Promise.all(
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
          scheduledTime: match.scheduledTime,
          startedAt: match.startedAt,
          completedAt: match.completedAt,
        };
      })
    );

    // Sort by round, then match number
    enriched.sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      return a.matchNumber - b.matchNumber;
    });

    return enriched;
  },
});

/**
 * Get a single match with full details
 */
export const getMatch = query({
  args: { matchId: v.id("matches") },
  returns: v.union(
    v.object({
      _id: v.id("matches"),
      tournamentId: v.id("tournaments"),
      round: v.number(),
      matchNumber: v.number(),
      bracket: v.optional(v.string()),
      bracketPosition: v.optional(v.number()),
      participant1: v.optional(
        v.object({
          _id: v.id("tournamentParticipants"),
          displayName: v.string(),
          seed: v.optional(v.number()),
          wins: v.number(),
          losses: v.number(),
        })
      ),
      participant2: v.optional(
        v.object({
          _id: v.id("tournamentParticipants"),
          displayName: v.string(),
          seed: v.optional(v.number()),
          wins: v.number(),
          losses: v.number(),
        })
      ),
      participant1Score: v.number(),
      participant2Score: v.number(),
      winnerId: v.optional(v.id("tournamentParticipants")),
      status: matchStatus,
      scheduledTime: v.optional(v.number()),
      startedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      nextMatchId: v.optional(v.id("matches")),
      myRole: v.union(
        v.literal("owner"),
        v.literal("admin"),
        v.literal("scorer")
      ),
      sport: v.string(),
      tennisState: v.optional(tennisState),
      tennisConfig: v.optional(tennisConfig),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const match = await ctx.db.get("matches", args.matchId);
    if (!match) {
      return null;
    }

    const tournament = await ctx.db.get("tournaments", match.tournamentId);
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

    // Get participant details
    let participant1 = undefined;
    let participant2 = undefined;

    if (match.participant1Id) {
      const p1 = await ctx.db.get("tournamentParticipants", match.participant1Id);
      if (p1) {
        participant1 = {
          _id: p1._id,
          displayName: p1.displayName,
          seed: p1.seed,
          wins: p1.wins,
          losses: p1.losses,
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
          wins: p2.wins,
          losses: p2.losses,
        };
      }
    }

    return {
      _id: match._id,
      tournamentId: match.tournamentId,
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
      startedAt: match.startedAt,
      completedAt: match.completedAt,
      nextMatchId: match.nextMatchId,
      myRole: membership.role,
      sport: tournament.sport,
      tennisState: match.tennisState,
      tennisConfig: tournament.tennisConfig,
    };
  },
});

/**
 * Get live matches from tournaments the user is assigned to score
 * - Owners/admins see all live matches in their orgs
 * - Scorers only see live matches from tournaments they're assigned to
 */
export const listMyLiveMatches = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("matches"),
      tournamentId: v.id("tournaments"),
      tournamentName: v.string(),
      round: v.number(),
      matchNumber: v.number(),
      bracket: v.optional(v.string()),
      participant1: v.optional(
        v.object({
          _id: v.id("tournamentParticipants"),
          displayName: v.string(),
        })
      ),
      participant2: v.optional(
        v.object({
          _id: v.id("tournamentParticipants"),
          displayName: v.string(),
        })
      ),
      participant1Score: v.number(),
      participant2Score: v.number(),
      status: matchStatus,
      startedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = [];
    const processedTournamentIds = new Set<string>();

    // Helper function to get live matches from a tournament
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getLiveMatchesFromTournament = async (tournament: any) => {
      const liveMatches = await ctx.db
        .query("matches")
        .withIndex("by_tournament_and_status", (q) =>
          q.eq("tournamentId", tournament._id).eq("status", "live")
        )
        .collect();

      for (const match of liveMatches) {
        let participant1 = undefined;
        let participant2 = undefined;

        if (match.participant1Id) {
          const p1 = await ctx.db.get("tournamentParticipants", match.participant1Id);
          if (p1) {
            participant1 = {
              _id: p1._id,
              displayName: p1.displayName,
            };
          }
        }

        if (match.participant2Id) {
          const p2 = await ctx.db.get("tournamentParticipants", match.participant2Id);
          if (p2) {
            participant2 = {
              _id: p2._id,
              displayName: p2.displayName,
            };
          }
        }

        results.push({
          _id: match._id,
          tournamentId: tournament._id,
          tournamentName: tournament.name,
          round: match.round,
          matchNumber: match.matchNumber,
          bracket: match.bracket,
          participant1,
          participant2,
          participant1Score: match.participant1Score,
          participant2Score: match.participant2Score,
          status: match.status,
          startedAt: match.startedAt,
        });
      }
    };

    // First, process tournaments user is assigned to as scorer
    for (const assignment of scorerAssignments) {
      const tournament = await ctx.db.get("tournaments", assignment.tournamentId);
      if (!tournament || tournament.status !== "active") continue;

      await getLiveMatchesFromTournament(tournament);
      processedTournamentIds.add(tournament._id);
    }

    // For owners/admins, also show live matches from all tournaments in their orgs
    for (const membership of memberships) {
      // Only owners and admins see all tournaments
      if (membership.role !== "owner" && membership.role !== "admin") {
        continue;
      }

      const tournaments = await ctx.db
        .query("tournaments")
        .withIndex("by_organization_and_status", (q) =>
          q.eq("organizationId", membership.organizationId).eq("status", "active")
        )
        .collect();

      for (const tournament of tournaments) {
        // Skip if already processed
        if (processedTournamentIds.has(tournament._id)) continue;

        await getLiveMatchesFromTournament(tournament);
        processedTournamentIds.add(tournament._id);
      }
    }

    // Sort by startedAt (most recent first)
    results.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));

    return results;
  },
});

// ============================================
// Mutations
// ============================================

/**
 * Update match scores (scorer/admin/owner)
 */
export const updateScore = mutation({
  args: {
    matchId: v.id("matches"),
    participant1Score: v.number(),
    participant2Score: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const match = await ctx.db.get("matches", args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    const tournament = await ctx.db.get("tournaments", match.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check user's role (all roles can update scores)
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", tournament.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      throw new Error("Not authorized");
    }

    // Can only update live or scheduled matches
    if (match.status !== "live" && match.status !== "scheduled" && match.status !== "pending") {
      throw new Error("Cannot update score for this match");
    }

    await ctx.db.patch("matches", args.matchId, {
      participant1Score: args.participant1Score,
      participant2Score: args.participant2Score,
    });

    return null;
  },
});

/**
 * Start a match (set to live)
 */
export const startMatch = mutation({
  args: { matchId: v.id("matches") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const match = await ctx.db.get("matches", args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    const tournament = await ctx.db.get("tournaments", match.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check user's role (all roles can start matches)
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", tournament.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      throw new Error("Not authorized");
    }

    // Can only start pending or scheduled matches
    if (match.status !== "pending" && match.status !== "scheduled") {
      throw new Error("Match cannot be started");
    }

    // Need both participants
    if (!match.participant1Id || !match.participant2Id) {
      throw new Error("Both participants must be assigned before starting");
    }

    await ctx.db.patch("matches", args.matchId, {
      status: "live",
      startedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Complete a match and advance winner
 */
export const completeMatch = mutation({
  args: {
    matchId: v.id("matches"),
    winnerId: v.optional(v.id("tournamentParticipants")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const match = await ctx.db.get("matches", args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    const tournament = await ctx.db.get("tournaments", match.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check user's role (all roles can complete matches)
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", tournament.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      throw new Error("Not authorized");
    }

    // Can only complete live matches
    if (match.status !== "live") {
      throw new Error("Match is not live");
    }

    // Determine winner based on scores if not provided
    let winnerId = args.winnerId;
    let loserId: typeof winnerId = undefined;

    if (!winnerId) {
      if (match.participant1Score > match.participant2Score) {
        winnerId = match.participant1Id;
        loserId = match.participant2Id;
      } else if (match.participant2Score > match.participant1Score) {
        winnerId = match.participant2Id;
        loserId = match.participant1Id;
      } else if (tournament.format !== "round_robin") {
        throw new Error("Cannot complete match with tied score in elimination format");
      }
    } else {
      loserId =
        winnerId === match.participant1Id
          ? match.participant2Id
          : match.participant1Id;
    }

    // Update match
    await ctx.db.patch("matches", args.matchId, {
      status: "completed",
      winnerId,
      completedAt: Date.now(),
    });

    // Update participant stats
    if (match.participant1Id) {
      const p1 = await ctx.db.get("tournamentParticipants", match.participant1Id);
      if (p1) {
        const isWinner = winnerId === match.participant1Id;
        const isDraw = !winnerId;
        await ctx.db.patch("tournamentParticipants", match.participant1Id, {
          wins: p1.wins + (isWinner ? 1 : 0),
          losses: p1.losses + (!isWinner && !isDraw ? 1 : 0),
          draws: p1.draws + (isDraw ? 1 : 0),
          pointsFor: p1.pointsFor + match.participant1Score,
          pointsAgainst: p1.pointsAgainst + match.participant2Score,
        });
      }
    }

    if (match.participant2Id) {
      const p2 = await ctx.db.get("tournamentParticipants", match.participant2Id);
      if (p2) {
        const isWinner = winnerId === match.participant2Id;
        const isDraw = !winnerId;
        await ctx.db.patch("tournamentParticipants", match.participant2Id, {
          wins: p2.wins + (isWinner ? 1 : 0),
          losses: p2.losses + (!isWinner && !isDraw ? 1 : 0),
          draws: p2.draws + (isDraw ? 1 : 0),
          pointsFor: p2.pointsFor + match.participant2Score,
          pointsAgainst: p2.pointsAgainst + match.participant1Score,
        });
      }
    }

    // Advance winner to next match (for elimination brackets)
    if (winnerId && match.nextMatchId) {
      const nextMatch = await ctx.db.get("matches", match.nextMatchId);
      if (nextMatch) {
        const slot = match.nextMatchSlot;
        if (slot === 1) {
          await ctx.db.patch("matches", match.nextMatchId, {
            participant1Id: winnerId,
          });
        } else if (slot === 2) {
          await ctx.db.patch("matches", match.nextMatchId, {
            participant2Id: winnerId,
          });
        }
      }
    }

    // Send loser to losers bracket (for double elimination)
    if (loserId && match.loserNextMatchId) {
      const loserNextMatch = await ctx.db.get("matches", match.loserNextMatchId);
      if (loserNextMatch) {
        const slot = match.loserNextMatchSlot;
        if (slot === 1) {
          await ctx.db.patch("matches", match.loserNextMatchId, {
            participant1Id: loserId,
          });
        } else if (slot === 2) {
          await ctx.db.patch("matches", match.loserNextMatchId, {
            participant2Id: loserId,
          });
        }
      }
    }

    // Check if tournament is complete
    const remainingMatches = await ctx.db
      .query("matches")
      .withIndex("by_tournament_and_status", (q) =>
        q.eq("tournamentId", match.tournamentId).eq("status", "pending")
      )
      .first();

    const liveMatches = await ctx.db
      .query("matches")
      .withIndex("by_tournament_and_status", (q) =>
        q.eq("tournamentId", match.tournamentId).eq("status", "live")
      )
      .first();

    if (!remainingMatches && !liveMatches) {
      // All matches completed
      await ctx.db.patch("tournaments", match.tournamentId, {
        status: "completed",
        endDate: Date.now(),
      });
    }

    return null;
  },
});

/**
 * Schedule a match
 */
export const scheduleMatch = mutation({
  args: {
    matchId: v.id("matches"),
    scheduledTime: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const match = await ctx.db.get("matches", args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    const tournament = await ctx.db.get("tournaments", match.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check user's role (only admin/owner can schedule)
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

    // Can only schedule pending matches
    if (match.status !== "pending") {
      throw new Error("Match cannot be scheduled");
    }

    await ctx.db.patch("matches", args.matchId, {
      status: "scheduled",
      scheduledTime: args.scheduledTime,
    });

    return null;
  },
});
