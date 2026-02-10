import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { matchStatus, tennisState, tennisConfig } from "./schema";
import type { Id, Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { errors } from "./lib/errors";
import { canScoreTournament, getTournamentRole } from "./lib/accessControl";
import { MAX_LENGTHS, validateStringLength } from "./lib/validation";
import { assertNotInMaintenance } from "./lib/maintenance";

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
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const tournament = await ctx.db.get("tournaments", args.tournamentId);
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

    // Enrich with participant details using the pre-fetched map
    const enriched = matches.map((match: Doc<"matches">) => {
      let participant1 = undefined;
      let participant2 = undefined;

      if (match.participant1Id) {
        const p1 = participantMap.get(match.participant1Id);
        if (p1) {
          participant1 = {
            _id: p1._id,
            displayName: p1.displayName,
            seed: p1.seed,
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
      };
    });

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
      myRole: v.union(v.literal("owner"), v.literal("scorer"), v.literal("temp_scorer")),
      sport: v.string(),
      tournamentStatus: v.union(
        v.literal("draft"),
        v.literal("active"),
        v.literal("completed"),
        v.literal("cancelled")
      ),
      tennisState: v.optional(tennisState),
      tennisConfig: v.optional(tennisConfig),
      availableCourts: v.optional(v.array(v.string())),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const match = await ctx.db.get("matches", args.matchId);
    if (!match) {
      return null;
    }

    const tournament = await ctx.db.get("tournaments", match.tournamentId);
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

    // Get tournaments the user owns that are active
    const ownedTournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_created_by_and_status", (q: any) =>
        q.eq("createdBy", userId).eq("status", "active")
      )
      .collect();

    const results: Array<{
      _id: Id<"matches">;
      tournamentId: Id<"tournaments">;
      tournamentName: string;
      bracketName: string | undefined;
      sport: Doc<"tournaments">["sport"];
      round: number;
      matchNumber: number;
      bracketType: string | undefined;
      participant1: { _id: Id<"tournamentParticipants">; displayName: string } | undefined;
      participant2: { _id: Id<"tournamentParticipants">; displayName: string } | undefined;
      participant1Score: number;
      participant2Score: number;
      status: Doc<"matches">["status"];
      scheduledTime: number | undefined;
      court: string | undefined;
      startedAt: number | undefined;
      tennisState: Doc<"matches">["tennisState"];
    }> = [];
    const processedTournamentIds = new Set<string>();

    // Helper function to get live matches from a tournament

    const getLiveMatchesFromTournament = async (tournament: any) => {
      const liveMatches = await ctx.db
        .query("matches")
        .withIndex("by_tournament_and_status", (q: any) =>
          q.eq("tournamentId", tournament._id).eq("status", "live")
        )
        .collect();

      if (liveMatches.length === 0) return;

      // Collect all unique participant and bracket IDs
      const participantIds = new Set<Id<"tournamentParticipants">>();
      const bracketIds = new Set<Id<"tournamentBrackets">>();

      for (const match of liveMatches) {
        if (match.participant1Id) participantIds.add(match.participant1Id);
        if (match.participant2Id) participantIds.add(match.participant2Id);
        if (match.bracketId) bracketIds.add(match.bracketId);
      }

      // Batch-fetch all participants and brackets in parallel
      const [participantDocs, bracketDocs] = await Promise.all([
        Promise.all([...participantIds].map((id) => ctx.db.get("tournamentParticipants", id))),
        Promise.all([...bracketIds].map((id) => ctx.db.get("tournamentBrackets", id))),
      ]);

      // Build lookup maps
      const participantMap = new Map<Id<"tournamentParticipants">, Doc<"tournamentParticipants">>();
      for (const doc of participantDocs) {
        if (doc) participantMap.set(doc._id, doc);
      }

      const bracketMap = new Map<Id<"tournamentBrackets">, Doc<"tournamentBrackets">>();
      for (const doc of bracketDocs) {
        if (doc) bracketMap.set(doc._id, doc);
      }

      // Enrich matches from the maps
      for (const match of liveMatches) {
        let participant1 = undefined;
        let participant2 = undefined;
        let bracketName = undefined;

        if (match.participant1Id) {
          const p1 = participantMap.get(match.participant1Id);
          if (p1) {
            participant1 = {
              _id: p1._id,
              displayName: p1.displayName,
            };
          }
        }

        if (match.participant2Id) {
          const p2 = participantMap.get(match.participant2Id);
          if (p2) {
            participant2 = {
              _id: p2._id,
              displayName: p2.displayName,
            };
          }
        }

        if (match.bracketId) {
          const bracket = bracketMap.get(match.bracketId);
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

      const tournament = await ctx.db.get("tournaments", assignment.tournamentId);
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
 * Create a standalone one-off match with ad-hoc participant names (owner only)
 */
export const createOneOffMatch = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    participant1Name: v.string(),
    participant2Name: v.string(),
    court: v.optional(v.string()),
  },
  returns: v.id("matches"),
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

    if (tournament.createdBy !== userId) {
      throw errors.unauthorized("Only the tournament owner can create one-off matches");
    }

    if (tournament.status !== "active") {
      throw errors.invalidState("Tournament must be active to create one-off matches");
    }

    const participant1Name = args.participant1Name.trim();
    const participant2Name = args.participant2Name.trim();
    if (!participant1Name || !participant2Name) {
      throw errors.invalidInput("Both participant names are required");
    }

    validateStringLength(participant1Name, "Participant name", MAX_LENGTHS.displayName);
    validateStringLength(participant2Name, "Participant name", MAX_LENGTHS.displayName);

    const normalizedCourt = args.court?.trim() || undefined;
    validateStringLength(normalizedCourt, "Court", MAX_LENGTHS.courtName);

    if (
      normalizedCourt &&
      tournament.courts &&
      tournament.courts.length > 0 &&
      !tournament.courts.includes(normalizedCourt)
    ) {
      throw errors.invalidInput("Selected court is not configured for this tournament");
    }

    const now = Date.now();
    const roundZeroMatches = await ctx.db
      .query("matches")
      .withIndex("by_tournament_and_round", (q: any) =>
        q.eq("tournamentId", args.tournamentId).eq("round", 0)
      )
      .collect();
    const nextMatchNumber =
      roundZeroMatches.reduce((max, match) => Math.max(max, match.matchNumber), 0) + 1;

    const makeParticipantInsert = (displayName: string) => {
      const base = {
        tournamentId: args.tournamentId,
        type: tournament.participantType,
        displayName,
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: now,
      };

      if (tournament.participantType === "individual") {
        return { ...base, playerName: displayName };
      }
      if (tournament.participantType === "team") {
        return { ...base, teamName: displayName };
      }
      return { ...base, player1Name: displayName };
    };

    const participant1Id = await ctx.db.insert(
      "tournamentParticipants",
      makeParticipantInsert(participant1Name)
    );
    const participant2Id = await ctx.db.insert(
      "tournamentParticipants",
      makeParticipantInsert(participant2Name)
    );

    const matchId = await ctx.db.insert("matches", {
      tournamentId: args.tournamentId,
      round: 0,
      matchNumber: nextMatchNumber,
      bracketType: "one_off",
      participant1Id,
      participant2Id,
      participant1Score: 0,
      participant2Score: 0,
      status: "pending",
      court: normalizedCourt,
    });

    return matchId;
  },
});

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
      throw errors.unauthenticated();
    }

    const match = await ctx.db.get("matches", args.matchId);
    if (!match) {
      throw errors.notFound("Match");
    }

    const tournament = await ctx.db.get("tournaments", match.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Check user's access (owner or scorer can update scores)
    const hasAccess = await canScoreTournament(ctx, tournament, userId);
    if (!hasAccess) {
      throw errors.unauthorized();
    }

    // Validate score bounds (prevent data corruption)
    const MAX_SCORE = 999;
    const MIN_SCORE = 0;
    if (args.participant1Score < MIN_SCORE || args.participant1Score > MAX_SCORE) {
      throw errors.invalidInput(`Score must be between ${MIN_SCORE} and ${MAX_SCORE}`);
    }
    if (args.participant2Score < MIN_SCORE || args.participant2Score > MAX_SCORE) {
      throw errors.invalidInput(`Score must be between ${MIN_SCORE} and ${MAX_SCORE}`);
    }
    if (!Number.isInteger(args.participant1Score) || !Number.isInteger(args.participant2Score)) {
      throw errors.invalidInput("Scores must be whole numbers");
    }

    // Can only update live or scheduled matches
    if (match.status !== "live" && match.status !== "scheduled" && match.status !== "pending") {
      throw errors.invalidState("Cannot update score for this match");
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
  args: {
    matchId: v.id("matches"),
    tempScorerToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    await assertNotInMaintenance(ctx, userId);

    const match = await ctx.db.get("matches", args.matchId);
    if (!match) {
      throw errors.notFound("Match");
    }

    const tournament = await ctx.db.get("tournaments", match.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Tournament must be active to start matches
    if (tournament.status !== "active") {
      throw errors.invalidState("Tournament must be started before matches can begin");
    }

    // Check user's access (owner, scorer, or temp scorer can start matches)
    const hasAccess = await canScoreTournament(ctx, tournament, userId, args.tempScorerToken);
    if (!hasAccess) {
      throw errors.unauthorized();
    }

    // Can only start pending or scheduled matches
    if (match.status !== "pending" && match.status !== "scheduled") {
      throw errors.invalidState("Match cannot be started");
    }

    // Need both participants
    if (!match.participant1Id || !match.participant2Id) {
      throw errors.invalidState("Both participants must be assigned before starting");
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
      throw errors.unauthenticated();
    }

    const match = await ctx.db.get("matches", args.matchId);
    if (!match) {
      throw errors.notFound("Match");
    }

    const tournament = await ctx.db.get("tournaments", match.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Check user's access (owner or scorer can complete matches)
    const hasAccess = await canScoreTournament(ctx, tournament, userId);
    if (!hasAccess) {
      throw errors.unauthorized();
    }

    // Can only complete live matches
    if (match.status !== "live") {
      throw errors.invalidState("Match is not live");
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
        throw errors.invalidInput("Cannot complete match with tied score in elimination format");
      }
    } else {
      loserId = winnerId === match.participant1Id ? match.participant2Id : match.participant1Id;
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
      await ctx.db.patch("tournaments", match.tournamentId, {
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
      throw errors.unauthenticated();
    }

    const match = await ctx.db.get("matches", args.matchId);
    if (!match) {
      throw errors.notFound("Match");
    }

    const tournament = await ctx.db.get("tournaments", match.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Only owner can schedule matches
    if (tournament.createdBy !== userId) {
      throw errors.unauthorized();
    }

    // Can only schedule pending matches
    if (match.status !== "pending") {
      throw errors.invalidState("Match cannot be scheduled");
    }

    await ctx.db.patch("matches", args.matchId, {
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
      throw errors.unauthenticated();
    }

    const match = await ctx.db.get("matches", args.matchId);
    if (!match) {
      throw errors.notFound("Match");
    }

    const tournament = await ctx.db.get("tournaments", match.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Only owner can update court
    if (tournament.createdBy !== userId) {
      throw errors.unauthorized();
    }

    // Can only update court for pending, scheduled, or live matches
    if (match.status === "completed" || match.status === "bye") {
      throw errors.invalidState("Cannot update court for this match");
    }

    await ctx.db.patch("matches", args.matchId, {
      court: args.court,
    });

    return null;
  },
});
