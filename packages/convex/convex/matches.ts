import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { matchStatus, tennisState, tennisConfig, volleyballState, volleyballConfig } from "./schema";
import type { Id, Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// ============================================
// Access Control Helpers
// ============================================

/**
 * Check if user can score tournament matches (owner, assigned scorer, or temp scorer)
 */
async function canScoreTournament(
  ctx: { db: any },
  tournament: Doc<"tournaments">,
  userId: Id<"users"> | null,
  tempScorerToken?: string
): Promise<boolean> {
  // Check temp scorer token if provided
  if (tempScorerToken) {
    const session = await ctx.db
      .query("temporaryScorerSessions")
      .withIndex("by_token", (q: any) => q.eq("token", tempScorerToken))
      .first();

    if (session && session.expiresAt > Date.now()) {
      const tempScorer = await ctx.db.get(session.scorerId);
      if (tempScorer && tempScorer.isActive && tempScorer.tournamentId === tournament._id) {
        return true;
      }
    }
    // Invalid token - fall through to check regular auth
  }

  // No userId means not authenticated
  if (!userId) {
    return false;
  }

  // Owner can always score
  if (tournament.createdBy === userId) {
    return true;
  }
  // Check if user is assigned as a scorer
  const scorer = await ctx.db
    .query("tournamentScorers")
    .withIndex("by_tournament_and_user", (q: any) =>
      q.eq("tournamentId", tournament._id).eq("userId", userId)
    )
    .first();
  return scorer !== null;
}

/**
 * Get user's role for a tournament
 */
async function getTournamentRole(
  ctx: { db: any },
  tournament: Doc<"tournaments">,
  userId: Id<"users"> | null,
  tempScorerToken?: string
): Promise<"owner" | "scorer" | "temp_scorer" | null> {
  // Check temp scorer token if provided
  if (tempScorerToken) {
    const session = await ctx.db
      .query("temporaryScorerSessions")
      .withIndex("by_token", (q: any) => q.eq("token", tempScorerToken))
      .first();

    if (session && session.expiresAt > Date.now()) {
      const tempScorer = await ctx.db.get(session.scorerId);
      if (tempScorer && tempScorer.isActive && tempScorer.tournamentId === tournament._id) {
        return "temp_scorer";
      }
    }
  }

  if (!userId) {
    return null;
  }

  if (tournament.createdBy === userId) {
    return "owner";
  }
  const scorer = await ctx.db
    .query("tournamentScorers")
    .withIndex("by_tournament_and_user", (q: any) =>
      q.eq("tournamentId", tournament._id).eq("userId", userId)
    )
    .first();
  return scorer ? "scorer" : null;
}

// ============================================
// Queries
// ============================================

/**
 * List matches for a tournament with optional filters
 */
export const listMatches = query({
  args: {
    tournamentId: v.id("tournaments"),
    bracketId: v.optional(v.id("tournamentBrackets")),
    round: v.optional(v.number()),
    status: v.optional(matchStatus),
    bracketType: v.optional(v.string()),
    tempScorerToken: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id("matches"),
      round: v.number(),
      matchNumber: v.number(),
      bracketId: v.optional(v.id("tournamentBrackets")),
      bracketType: v.optional(v.string()),
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
      court: v.optional(v.string()),
      startedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      sport: v.string(),
      tennisState: v.optional(tennisState),
      volleyballState: v.optional(volleyballState),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      // Return empty array if tournament doesn't exist (e.g., deleted)
      return [];
    }

    // Check if user has access (owner, scorer, or temp scorer)
    const hasAccess = await canScoreTournament(ctx, tournament, userId, args.tempScorerToken);
    if (!hasAccess) {
      return [];
    }

    // Query matches with appropriate index
    let matches;
    if (args.bracketId !== undefined) {
      // Filter by specific bracket
      if (args.round !== undefined) {
        matches = await ctx.db
          .query("matches")
          .withIndex("by_bracket_and_round", (q: any) =>
            q.eq("bracketId", args.bracketId).eq("round", args.round!)
          )
          .collect();
      } else if (args.status !== undefined) {
        matches = await ctx.db
          .query("matches")
          .withIndex("by_bracket_and_status", (q: any) =>
            q.eq("bracketId", args.bracketId).eq("status", args.status!)
          )
          .collect();
      } else {
        matches = await ctx.db
          .query("matches")
          .withIndex("by_bracket", (q: any) => q.eq("bracketId", args.bracketId))
          .collect();
      }
    } else if (args.round !== undefined) {
      matches = await ctx.db
        .query("matches")
        .withIndex("by_tournament_and_round", (q: any) =>
          q.eq("tournamentId", args.tournamentId).eq("round", args.round!)
        )
        .collect();
    } else if (args.status !== undefined) {
      matches = await ctx.db
        .query("matches")
        .withIndex("by_tournament_and_status", (q: any) =>
          q.eq("tournamentId", args.tournamentId).eq("status", args.status!)
        )
        .collect();
    } else if (args.bracketType !== undefined) {
      matches = await ctx.db
        .query("matches")
        .withIndex("by_tournament_and_bracket_type", (q: any) =>
          q.eq("tournamentId", args.tournamentId).eq("bracketType", args.bracketType)
        )
        .collect();
    } else {
      matches = await ctx.db
        .query("matches")
        .withIndex("by_tournament", (q: any) => q.eq("tournamentId", args.tournamentId))
        .collect();
    }

    // Enrich with participant details
    const enriched = await Promise.all(
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
          bracketId: match.bracketId,
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
          startedAt: match.startedAt,
          completedAt: match.completedAt,
          sport: tournament.sport,
          tennisState: match.tennisState,
          volleyballState: match.volleyballState,
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
  args: {
    matchId: v.id("matches"),
    tempScorerToken: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      _id: v.id("matches"),
      tournamentId: v.id("tournaments"),
      round: v.number(),
      matchNumber: v.number(),
      bracketType: v.optional(v.string()),
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
      court: v.optional(v.string()),
      startedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      nextMatchId: v.optional(v.id("matches")),
      myRole: v.union(
        v.literal("owner"),
        v.literal("scorer"),
        v.literal("temp_scorer")
      ),
      sport: v.string(),
      tournamentStatus: v.union(
        v.literal("draft"),
        v.literal("active"),
        v.literal("completed"),
        v.literal("cancelled")
      ),
      tennisState: v.optional(tennisState),
      tennisConfig: v.optional(tennisConfig),
      volleyballState: v.optional(volleyballState),
      volleyballConfig: v.optional(volleyballConfig),
      availableCourts: v.optional(v.array(v.string())),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      return null;
    }

    const tournament = await ctx.db.get(match.tournamentId);
    if (!tournament) {
      return null;
    }

    // Check if user has access (owner, scorer, or temp scorer)
    const role = await getTournamentRole(ctx, tournament, userId, args.tempScorerToken);
    if (!role) {
      return null;
    }

    // Get participant details
    let participant1 = undefined;
    let participant2 = undefined;

    if (match.participant1Id) {
      const p1 = await ctx.db.get(match.participant1Id);
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
      const p2 = await ctx.db.get(match.participant2Id);
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
      startedAt: match.startedAt,
      completedAt: match.completedAt,
      nextMatchId: match.nextMatchId,
      myRole: role,
      sport: tournament.sport,
      tournamentStatus: tournament.status,
      tennisState: match.tennisState,
      tennisConfig: tournament.tennisConfig,
      volleyballState: match.volleyballState,
      volleyballConfig: tournament.volleyballConfig,
      availableCourts: tournament.courts,
    };
  },
});

/**
 * Get live matches from tournaments the user owns or is assigned to score
 */
export const listMyLiveMatches = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("matches"),
      tournamentId: v.id("tournaments"),
      tournamentName: v.string(),
      bracketName: v.optional(v.string()),
      sport: v.string(),
      round: v.number(),
      matchNumber: v.number(),
      bracketType: v.optional(v.string()),
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
      scheduledTime: v.optional(v.number()),
      court: v.optional(v.string()),
      startedAt: v.optional(v.number()),
      tennisState: v.optional(tennisState),
      volleyballState: v.optional(volleyballState),
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
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();

    const assignedTournamentIds = new Set(scorerAssignments.map((a: Doc<"tournamentScorers">) => a.tournamentId));

    // Get tournaments the user owns that are active
    const ownedTournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_created_by_and_status", (q: any) =>
        q.eq("createdBy", userId).eq("status", "active")
      )
      .collect();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = [];
    const processedTournamentIds = new Set<string>();

    // Helper function to get live matches from a tournament
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getLiveMatchesFromTournament = async (tournament: any) => {
      const liveMatches = await ctx.db
        .query("matches")
        .withIndex("by_tournament_and_status", (q: any) =>
          q.eq("tournamentId", tournament._id).eq("status", "live")
        )
        .collect();

      for (const match of liveMatches) {
        let participant1 = undefined;
        let participant2 = undefined;
        let bracketName = undefined;

        if (match.participant1Id) {
          const p1 = await ctx.db.get(match.participant1Id);
          if (p1) {
            participant1 = {
              _id: p1._id,
              displayName: p1.displayName,
            };
          }
        }

        if (match.participant2Id) {
          const p2 = await ctx.db.get(match.participant2Id);
          if (p2) {
            participant2 = {
              _id: p2._id,
              displayName: p2.displayName,
            };
          }
        }

        // Get bracket name if match belongs to a bracket
        if (match.bracketId) {
          const bracket = await ctx.db.get(match.bracketId);
          if (bracket) {
            bracketName = bracket.name;
          }
        }

        results.push({
          _id: match._id,
          tournamentId: tournament._id,
          tournamentName: tournament.name,
          bracketName,
          sport: tournament.sport,
          round: match.round,
          matchNumber: match.matchNumber,
          bracketType: match.bracketType,
          participant1,
          participant2,
          participant1Score: match.participant1Score,
          participant2Score: match.participant2Score,
          status: match.status,
          scheduledTime: match.scheduledTime,
          court: match.court,
          startedAt: match.startedAt,
          tennisState: match.tennisState,
          volleyballState: match.volleyballState,
        });
      }
    };

    // First, process tournaments user owns
    for (const tournament of ownedTournaments) {
      await getLiveMatchesFromTournament(tournament);
      processedTournamentIds.add(tournament._id);
    }

    // Then, process tournaments user is assigned to as scorer
    for (const assignment of scorerAssignments) {
      if (processedTournamentIds.has(assignment.tournamentId)) continue;

      const tournament = await ctx.db.get(assignment.tournamentId);
      if (!tournament || tournament.status !== "active") continue;

      await getLiveMatchesFromTournament(tournament);
      processedTournamentIds.add(tournament._id);
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
 * Update match scores (scorer/owner)
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

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    const tournament = await ctx.db.get(match.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check user's access (owner or scorer can update scores)
    const hasAccess = await canScoreTournament(ctx, tournament, userId);
    if (!hasAccess) {
      throw new Error("Not authorized");
    }

    // Can only update live or scheduled matches
    if (match.status !== "live" && match.status !== "scheduled" && match.status !== "pending") {
      throw new Error("Cannot update score for this match");
    }

    await ctx.db.patch(args.matchId, {
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
  args: {
    matchId: v.id("matches"),
    tempScorerToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    const tournament = await ctx.db.get(match.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Tournament must be active to start matches
    if (tournament.status !== "active") {
      throw new Error("Tournament must be started before matches can begin");
    }

    // Check user's access (owner, scorer, or temp scorer can start matches)
    const hasAccess = await canScoreTournament(ctx, tournament, userId, args.tempScorerToken);
    if (!hasAccess) {
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

    await ctx.db.patch(args.matchId, {
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

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    const tournament = await ctx.db.get(match.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Check user's access (owner or scorer can complete matches)
    const hasAccess = await canScoreTournament(ctx, tournament, userId);
    if (!hasAccess) {
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
    await ctx.db.patch(args.matchId, {
      status: "completed",
      winnerId,
      completedAt: Date.now(),
    });

    // Update participant stats
    if (match.participant1Id) {
      const p1 = await ctx.db.get(match.participant1Id);
      if (p1) {
        const isWinner = winnerId === match.participant1Id;
        const isDraw = !winnerId;
        await ctx.db.patch(match.participant1Id, {
          wins: p1.wins + (isWinner ? 1 : 0),
          losses: p1.losses + (!isWinner && !isDraw ? 1 : 0),
          draws: p1.draws + (isDraw ? 1 : 0),
          pointsFor: p1.pointsFor + match.participant1Score,
          pointsAgainst: p1.pointsAgainst + match.participant2Score,
        });
      }
    }

    if (match.participant2Id) {
      const p2 = await ctx.db.get(match.participant2Id);
      if (p2) {
        const isWinner = winnerId === match.participant2Id;
        const isDraw = !winnerId;
        await ctx.db.patch(match.participant2Id, {
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
      const nextMatch = await ctx.db.get(match.nextMatchId);
      if (nextMatch) {
        const slot = match.nextMatchSlot;
        if (slot === 1) {
          await ctx.db.patch(match.nextMatchId, {
            participant1Id: winnerId,
          });
        } else if (slot === 2) {
          await ctx.db.patch(match.nextMatchId, {
            participant2Id: winnerId,
          });
        }
      }
    }

    // Send loser to losers bracket (for double elimination)
    if (loserId && match.loserNextMatchId) {
      const loserNextMatch = await ctx.db.get(match.loserNextMatchId);
      if (loserNextMatch) {
        const slot = match.loserNextMatchSlot;
        if (slot === 1) {
          await ctx.db.patch(match.loserNextMatchId, {
            participant1Id: loserId,
          });
        } else if (slot === 2) {
          await ctx.db.patch(match.loserNextMatchId, {
            participant2Id: loserId,
          });
        }
      }
    }

    // Check if tournament is complete
    const remainingMatches = await ctx.db
      .query("matches")
      .withIndex("by_tournament_and_status", (q: any) =>
        q.eq("tournamentId", match.tournamentId).eq("status", "pending")
      )
      .first();

    const liveMatches = await ctx.db
      .query("matches")
      .withIndex("by_tournament_and_status", (q: any) =>
        q.eq("tournamentId", match.tournamentId).eq("status", "live")
      )
      .first();

    if (!remainingMatches && !liveMatches) {
      // All matches completed
      await ctx.db.patch(match.tournamentId, {
        status: "completed",
        endDate: Date.now(),
      });

      // Deactivate all temporary scorers for this tournament
      await ctx.runMutation(internal.temporaryScorers.deactivateAllForTournament, {
        tournamentId: match.tournamentId,
      });
    }

    return null;
  },
});

/**
 * Schedule a match (owner only)
 */
export const scheduleMatch = mutation({
  args: {
    matchId: v.id("matches"),
    scheduledTime: v.number(),
    court: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    const tournament = await ctx.db.get(match.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Only owner can schedule matches
    if (tournament.createdBy !== userId) {
      throw new Error("Not authorized");
    }

    // Can only schedule pending matches
    if (match.status !== "pending") {
      throw new Error("Match cannot be scheduled");
    }

    await ctx.db.patch(args.matchId, {
      status: "scheduled",
      scheduledTime: args.scheduledTime,
      court: args.court,
    });

    return null;
  },
});

/**
 * Update match court assignment (owner only)
 */
export const updateMatchCourt = mutation({
  args: {
    matchId: v.id("matches"),
    court: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    const tournament = await ctx.db.get(match.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    // Only owner can update court
    if (tournament.createdBy !== userId) {
      throw new Error("Not authorized");
    }

    // Can only update court for pending, scheduled, or live matches
    if (match.status === "completed" || match.status === "bye") {
      throw new Error("Cannot update court for this match");
    }

    await ctx.db.patch(args.matchId, {
      court: args.court,
    });

    return null;
  },
});
