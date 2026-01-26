import { query } from "./_generated/server";
import { v } from "convex/values";
import {
  matchStatus,
  presetSports,
  tournamentFormats,
  tennisState,
  tennisConfig,
  volleyballState,
  volleyballConfig,
} from "./schema";
import { hashKey } from "./apiKeys";
import type { Id } from "./_generated/dataModel";

// ============================================
// Types for return values
// ============================================

const participantReturn = v.object({
  id: v.string(),
  displayName: v.string(),
  type: v.union(v.literal("individual"), v.literal("doubles"), v.literal("team")),
  // Individual player name
  playerName: v.optional(v.string()),
  // Doubles player names
  player1Name: v.optional(v.string()),
  player2Name: v.optional(v.string()),
  // Team name
  teamName: v.optional(v.string()),
  seed: v.optional(v.number()),
  wins: v.number(),
  losses: v.number(),
  draws: v.number(),
});

const matchReturn = v.object({
  id: v.string(),
  round: v.number(),
  matchNumber: v.number(),
  bracket: v.optional(v.string()),
  court: v.optional(v.string()),
  status: matchStatus,
  scores: v.object({
    participant1: v.number(),
    participant2: v.number(),
  }),
  timestamps: v.object({
    scheduledTime: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  }),
  participant1: v.optional(participantReturn),
  participant2: v.optional(participantReturn),
  winnerId: v.optional(v.string()),
  tennisState: v.optional(tennisState),
  volleyballState: v.optional(volleyballState),
});

const tournamentReturn = v.object({
  id: v.string(),
  name: v.string(),
  sport: presetSports,
  format: tournamentFormats,
  tennisConfig: v.optional(tennisConfig),
  volleyballConfig: v.optional(volleyballConfig),
  courts: v.optional(v.array(v.string())),
});

// ============================================
// Internal helper for API key validation
// ============================================

async function validateApiKeyInternal(
  ctx: { db: any },
  apiKey: string
): Promise<{ userId: Id<"users"> } | null> {
  const hashedKey = hashKey(apiKey);

  const keyRecord = await ctx.db
    .query("apiKeys")
    .withIndex("by_key", (q: any) => q.eq("key", hashedKey))
    .first();

  if (!keyRecord) {
    return null;
  }

  if (!keyRecord.isActive) {
    return null;
  }

  return {
    userId: keyRecord.userId,
  };
}

// ============================================
// Public API Queries
// ============================================

/**
 * Get a single match by ID
 * Requires a valid API key for the user that owns the tournament
 */
export const getMatch = query({
  args: {
    apiKey: v.string(),
    matchId: v.string(),
  },
  returns: v.union(
    v.object({
      match: matchReturn,
      tournament: tournamentReturn,
    }),
    v.object({
      error: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    // Validate API key
    const keyValidation = await validateApiKeyInternal(ctx, args.apiKey);
    if (!keyValidation) {
      return { error: "Invalid or inactive API key" };
    }

    // Parse match ID
    let matchId: Id<"matches">;
    try {
      matchId = args.matchId as Id<"matches">;
    } catch {
      return { error: "Invalid match ID format" };
    }

    // Get the match
    const match = await ctx.db.get("matches", matchId);
    if (!match) {
      return { error: "Match not found" };
    }

    // Get the tournament
    const tournament = await ctx.db.get("tournaments", match.tournamentId);
    if (!tournament) {
      return { error: "Tournament not found" };
    }

    // Verify the user owns this tournament
    if (tournament.createdBy !== keyValidation.userId) {
      return { error: "API key not authorized for this tournament" };
    }

    // Get participant details
    let participant1 = undefined;
    let participant2 = undefined;

    if (match.participant1Id) {
      const p1 = await ctx.db.get("tournamentParticipants", match.participant1Id);
      if (p1) {
        participant1 = {
          id: p1._id,
          displayName: p1.displayName,
          type: p1.type,
          playerName: p1.playerName,
          player1Name: p1.player1Name,
          player2Name: p1.player2Name,
          teamName: p1.teamName,
          seed: p1.seed,
          wins: p1.wins,
          losses: p1.losses,
          draws: p1.draws,
        };
      }
    }

    if (match.participant2Id) {
      const p2 = await ctx.db.get("tournamentParticipants", match.participant2Id);
      if (p2) {
        participant2 = {
          id: p2._id,
          displayName: p2.displayName,
          type: p2.type,
          playerName: p2.playerName,
          player1Name: p2.player1Name,
          player2Name: p2.player2Name,
          teamName: p2.teamName,
          seed: p2.seed,
          wins: p2.wins,
          losses: p2.losses,
          draws: p2.draws,
        };
      }
    }

    return {
      match: {
        id: match._id,
        round: match.round,
        matchNumber: match.matchNumber,
        bracket: match.bracket,
        court: match.court,
        status: match.status,
        scores: {
          participant1: match.participant1Score,
          participant2: match.participant2Score,
        },
        timestamps: {
          scheduledTime: match.scheduledTime,
          startedAt: match.startedAt,
          completedAt: match.completedAt,
        },
        participant1,
        participant2,
        winnerId: match.winnerId,
        tennisState: match.tennisState,
        volleyballState: match.volleyballState,
      },
      tournament: {
        id: tournament._id,
        name: tournament.name,
        sport: tournament.sport,
        format: tournament.format,
        tennisConfig: tournament.tennisConfig,
        volleyballConfig: tournament.volleyballConfig,
        courts: tournament.courts,
      },
    };
  },
});

/**
 * List matches for a tournament
 * Requires a valid API key for the user that owns the tournament
 */
export const listMatches = query({
  args: {
    apiKey: v.string(),
    tournamentId: v.string(),
    status: v.optional(matchStatus),
    round: v.optional(v.number()),
    court: v.optional(v.string()),
    sortBy: v.optional(v.union(v.literal("round"), v.literal("court"), v.literal("scheduledTime"))),
  },
  returns: v.union(
    v.object({
      matches: v.array(matchReturn),
      tournament: tournamentReturn,
    }),
    v.object({
      error: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    // Validate API key
    const keyValidation = await validateApiKeyInternal(ctx, args.apiKey);
    if (!keyValidation) {
      return { error: "Invalid or inactive API key" };
    }

    // Parse tournament ID
    let tournamentId: Id<"tournaments">;
    try {
      tournamentId = args.tournamentId as Id<"tournaments">;
    } catch {
      return { error: "Invalid tournament ID format" };
    }

    // Get the tournament
    const tournament = await ctx.db.get("tournaments", tournamentId);
    if (!tournament) {
      return { error: "Tournament not found" };
    }

    // Verify the user owns this tournament
    if (tournament.createdBy !== keyValidation.userId) {
      return { error: "API key not authorized for this tournament" };
    }

    // Query matches with appropriate filters
    let matches;
    if (args.round !== undefined) {
      matches = await ctx.db
        .query("matches")
        .withIndex("by_tournament_and_round", (q) =>
          q.eq("tournamentId", tournamentId).eq("round", args.round!)
        )
        .collect();
    } else if (args.status !== undefined) {
      matches = await ctx.db
        .query("matches")
        .withIndex("by_tournament_and_status", (q) =>
          q.eq("tournamentId", tournamentId).eq("status", args.status!)
        )
        .collect();
    } else {
      matches = await ctx.db
        .query("matches")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
        .collect();
    }

    // Filter by court if specified
    if (args.court !== undefined) {
      matches = matches.filter((m) => m.court === args.court);
    }

    // Enrich with participant details
    const enrichedMatches = await Promise.all(
      matches.map(async (match) => {
        let participant1 = undefined;
        let participant2 = undefined;

        if (match.participant1Id) {
          const p1 = await ctx.db.get("tournamentParticipants", match.participant1Id);
          if (p1) {
            participant1 = {
              id: p1._id,
              displayName: p1.displayName,
              type: p1.type,
              playerName: p1.playerName,
              player1Name: p1.player1Name,
              player2Name: p1.player2Name,
              teamName: p1.teamName,
              seed: p1.seed,
              wins: p1.wins,
              losses: p1.losses,
              draws: p1.draws,
            };
          }
        }

        if (match.participant2Id) {
          const p2 = await ctx.db.get("tournamentParticipants", match.participant2Id);
          if (p2) {
            participant2 = {
              id: p2._id,
              displayName: p2.displayName,
              type: p2.type,
              playerName: p2.playerName,
              player1Name: p2.player1Name,
              player2Name: p2.player2Name,
              teamName: p2.teamName,
              seed: p2.seed,
              wins: p2.wins,
              losses: p2.losses,
              draws: p2.draws,
            };
          }
        }

        return {
          id: match._id,
          round: match.round,
          matchNumber: match.matchNumber,
          bracket: match.bracket,
          court: match.court,
          status: match.status,
          scores: {
            participant1: match.participant1Score,
            participant2: match.participant2Score,
          },
          timestamps: {
            scheduledTime: match.scheduledTime,
            startedAt: match.startedAt,
            completedAt: match.completedAt,
          },
          participant1,
          participant2,
          winnerId: match.winnerId,
          tennisState: match.tennisState,
          volleyballState: match.volleyballState,
        };
      })
    );

    // Sort matches based on sortBy parameter
    const sortBy = args.sortBy || "round";
    enrichedMatches.sort((a, b) => {
      if (sortBy === "court") {
        // Sort by court name (nulls last), then by match number
        if (!a.court && !b.court) return a.matchNumber - b.matchNumber;
        if (!a.court) return 1;
        if (!b.court) return -1;
        const courtCompare = a.court.localeCompare(b.court);
        if (courtCompare !== 0) return courtCompare;
        return a.matchNumber - b.matchNumber;
      } else if (sortBy === "scheduledTime") {
        // Sort by scheduled time (nulls last), then by match number
        const aTime = a.timestamps.scheduledTime;
        const bTime = b.timestamps.scheduledTime;
        if (!aTime && !bTime) return a.matchNumber - b.matchNumber;
        if (!aTime) return 1;
        if (!bTime) return -1;
        if (aTime !== bTime) return aTime - bTime;
        return a.matchNumber - b.matchNumber;
      } else {
        // Default: sort by round, then match number
        if (a.round !== b.round) return a.round - b.round;
        return a.matchNumber - b.matchNumber;
      }
    });

    return {
      matches: enrichedMatches,
      tournament: {
        id: tournament._id,
        name: tournament.name,
        sport: tournament.sport,
        format: tournament.format,
        tennisConfig: tournament.tennisConfig,
        volleyballConfig: tournament.volleyballConfig,
        courts: tournament.courts,
      },
    };
  },
});

/**
 * List all tournaments for the user
 * Useful for discovering available tournaments
 */
export const listTournaments = query({
  args: {
    apiKey: v.string(),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("active"),
        v.literal("completed"),
        v.literal("cancelled")
      )
    ),
  },
  returns: v.union(
    v.object({
      tournaments: v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          description: v.optional(v.string()),
          sport: presetSports,
          format: tournamentFormats,
          status: v.union(
            v.literal("draft"),
            v.literal("active"),
            v.literal("completed"),
            v.literal("cancelled")
          ),
          participantCount: v.number(),
          startDate: v.optional(v.number()),
          endDate: v.optional(v.number()),
        })
      ),
    }),
    v.object({
      error: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    // Validate API key
    const keyValidation = await validateApiKeyInternal(ctx, args.apiKey);
    if (!keyValidation) {
      return { error: "Invalid or inactive API key" };
    }

    // Query tournaments owned by this user
    let tournaments;
    if (args.status) {
      tournaments = await ctx.db
        .query("tournaments")
        .withIndex("by_created_by_and_status", (q) =>
          q
            .eq("createdBy", keyValidation.userId)
            .eq("status", args.status!)
        )
        .collect();
    } else {
      tournaments = await ctx.db
        .query("tournaments")
        .withIndex("by_created_by", (q) =>
          q.eq("createdBy", keyValidation.userId)
        )
        .collect();
    }

    // Get participant counts
    const results = await Promise.all(
      tournaments.map(async (tournament) => {
        const participants = await ctx.db
          .query("tournamentParticipants")
          .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
          .collect();

        return {
          id: tournament._id,
          name: tournament.name,
          description: tournament.description,
          sport: tournament.sport,
          format: tournament.format,
          status: tournament.status,
          participantCount: participants.length,
          startDate: tournament.startDate,
          endDate: tournament.endDate,
        };
      })
    );

    return { tournaments: results };
  },
});
