import { query, internalMutation } from "./_generated/server";
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

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 100; // 100 requests per minute per API key

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
  bracketType: v.optional(v.string()),
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
): Promise<{ userId: Id<"users">; keyId: Id<"apiKeys"> } | null> {
  const hashedKey = await hashKey(apiKey);

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
    keyId: keyRecord._id,
  };
}

/**
 * Check if an API key has exceeded its rate limit
 * Returns true if the request should be allowed, false if rate limited
 */
async function checkRateLimit(
  ctx: { db: any },
  keyId: Id<"apiKeys">
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  const rateLimit = await ctx.db
    .query("apiRateLimits")
    .withIndex("by_api_key", (q: any) => q.eq("apiKeyId", keyId))
    .first();

  if (!rateLimit) {
    // No rate limit record - this is the first request
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }

  // Check if the window has expired
  if (rateLimit.windowStart < windowStart) {
    // Window expired, request is allowed
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }

  // Window is still active, check the count
  if (rateLimit.requestCount >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: rateLimit.windowStart + RATE_LIMIT_WINDOW_MS
    };
  }

  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - rateLimit.requestCount - 1,
    resetAt: rateLimit.windowStart + RATE_LIMIT_WINDOW_MS
  };
}

/**
 * Internal mutation to track API usage for rate limiting
 * Called after successful API requests
 */
export const _trackApiUsage = internalMutation({
  args: {
    keyId: v.id("apiKeys"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    const rateLimit = await ctx.db
      .query("apiRateLimits")
      .withIndex("by_api_key", (q) => q.eq("apiKeyId", args.keyId))
      .first();

    if (!rateLimit) {
      // Create new rate limit record
      await ctx.db.insert("apiRateLimits", {
        apiKeyId: args.keyId,
        windowStart: now,
        requestCount: 1,
      });
    } else if (rateLimit.windowStart < windowStart) {
      // Window expired, reset the counter
      // eslint-disable-next-line @convex-dev/explicit-table-ids -- rateLimit._id is typed as Id<"apiRateLimits">
      await ctx.db.patch(rateLimit._id, {
        windowStart: now,
        requestCount: 1,
      });
    } else {
      // Increment the counter
      // eslint-disable-next-line @convex-dev/explicit-table-ids -- rateLimit._id is typed as Id<"apiRateLimits">
      await ctx.db.patch(rateLimit._id, {
        requestCount: rateLimit.requestCount + 1,
      });
    }

    // Also update lastUsedAt on the API key
    // eslint-disable-next-line @convex-dev/explicit-table-ids -- keyId is typed as Id<"apiKeys">
    await ctx.db.patch(args.keyId, {
      lastUsedAt: now,
    });

    return null;
  },
});

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

    // Check rate limit
    const rateLimit = await checkRateLimit(ctx, keyValidation.keyId);
    if (!rateLimit.allowed) {
      return { error: `Rate limit exceeded. Try again after ${new Date(rateLimit.resetAt).toISOString()}` };
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
        bracketType: match.bracketType,
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
    bracketId: v.optional(v.string()),
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

    // Check rate limit
    const rateLimit = await checkRateLimit(ctx, keyValidation.keyId);
    if (!rateLimit.allowed) {
      return { error: `Rate limit exceeded. Try again after ${new Date(rateLimit.resetAt).toISOString()}` };
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
    const bracketId = args.bracketId ? (args.bracketId as Id<"tournamentBrackets">) : undefined;

    if (bracketId !== undefined) {
      // Filter by specific bracket
      if (args.round !== undefined) {
        matches = await ctx.db
          .query("matches")
          .withIndex("by_bracket_and_round", (q) =>
            q.eq("bracketId", bracketId).eq("round", args.round!)
          )
          .collect();
      } else if (args.status !== undefined) {
        matches = await ctx.db
          .query("matches")
          .withIndex("by_bracket_and_status", (q) =>
            q.eq("bracketId", bracketId).eq("status", args.status!)
          )
          .collect();
      } else {
        matches = await ctx.db
          .query("matches")
          .withIndex("by_bracket", (q) => q.eq("bracketId", bracketId))
          .collect();
      }
    } else if (args.round !== undefined) {
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
          bracketType: match.bracketType,
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

    // Check rate limit
    const rateLimit = await checkRateLimit(ctx, keyValidation.keyId);
    if (!rateLimit.allowed) {
      return { error: `Rate limit exceeded. Try again after ${new Date(rateLimit.resetAt).toISOString()}` };
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

/**
 * List brackets for a tournament
 * Requires a valid API key for the user that owns the tournament
 */
export const listBrackets = query({
  args: {
    apiKey: v.string(),
    tournamentId: v.string(),
  },
  returns: v.union(
    v.object({
      brackets: v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          description: v.optional(v.string()),
          format: v.optional(tournamentFormats),
          status: v.union(
            v.literal("draft"),
            v.literal("active"),
            v.literal("completed")
          ),
          displayOrder: v.number(),
          participantCount: v.number(),
          matchCount: v.number(),
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

    // Check rate limit
    const rateLimit = await checkRateLimit(ctx, keyValidation.keyId);
    if (!rateLimit.allowed) {
      return { error: `Rate limit exceeded. Try again after ${new Date(rateLimit.resetAt).toISOString()}` };
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

    // Get all brackets for the tournament
    const brackets = await ctx.db
      .query("tournamentBrackets")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
      .collect();

    // Enrich with counts
    const enrichedBrackets = await Promise.all(
      brackets.map(async (bracket) => {
        const participants = await ctx.db
          .query("tournamentParticipants")
          .withIndex("by_bracket", (q) => q.eq("bracketId", bracket._id))
          .collect();

        const matches = await ctx.db
          .query("matches")
          .withIndex("by_bracket", (q) => q.eq("bracketId", bracket._id))
          .collect();

        return {
          id: bracket._id,
          name: bracket.name,
          description: bracket.description,
          format: bracket.format,
          status: bracket.status,
          displayOrder: bracket.displayOrder,
          participantCount: participants.length,
          matchCount: matches.length,
        };
      })
    );

    // Sort by displayOrder
    enrichedBrackets.sort((a, b) => a.displayOrder - b.displayOrder);

    return { brackets: enrichedBrackets };
  },
});
