import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { volleyballState } from "./schema";
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
// Volleyball Scoring Logic Helpers
// ============================================

type VolleyballStateSnapshot = {
  sets: number[][];
  currentSetPoints: number[];
  servingTeam: number;
  currentSetNumber: number;
  isMatchComplete: boolean;
};

type VolleyballState = {
  sets: number[][];
  currentSetPoints: number[];
  servingTeam: number;
  setsToWin: number;
  pointsPerSet: number;
  pointsPerDecidingSet: number;
  minLeadToWin: number;
  currentSetNumber: number;
  isMatchComplete: boolean;
  history?: VolleyballStateSnapshot[];
};

/**
 * Create a snapshot of the current state for history
 */
function createSnapshot(state: VolleyballState): VolleyballStateSnapshot {
  return {
    sets: state.sets.map(s => [...s]),
    currentSetPoints: [...state.currentSetPoints],
    servingTeam: state.servingTeam,
    currentSetNumber: state.currentSetNumber,
    isMatchComplete: state.isMatchComplete,
  };
}

/**
 * Add current state to history (max 20 entries)
 */
function addToHistory(state: VolleyballState): VolleyballStateSnapshot[] {
  const snapshot = createSnapshot(state);
  const history = state.history ?? [];
  const newHistory = [...history, snapshot];
  // Keep only last 20 states
  if (newHistory.length > 20) {
    return newHistory.slice(-20);
  }
  return newHistory;
}

/**
 * Check if a set is won
 * Regular sets: first to pointsPerSet with minLeadToWin lead
 * Deciding set: first to pointsPerDecidingSet with minLeadToWin lead
 */
function isSetWon(
  points: number[],
  isDecidingSet: boolean,
  pointsPerSet: number,
  pointsPerDecidingSet: number,
  minLeadToWin: number
): { won: boolean; winner: 1 | 2 | null } {
  const targetPoints = isDecidingSet ? pointsPerDecidingSet : pointsPerSet;
  const p1 = points[0] ?? 0;
  const p2 = points[1] ?? 0;
  const lead = Math.abs(p1 - p2);

  if (p1 >= targetPoints && lead >= minLeadToWin) {
    return { won: true, winner: 1 };
  }
  if (p2 >= targetPoints && lead >= minLeadToWin) {
    return { won: true, winner: 2 };
  }

  return { won: false, winner: null };
}

/**
 * Check if the current set is the deciding set
 */
function isDecidingSet(setsWon: number[], setsToWin: number): boolean {
  // Deciding set is when both teams need just 1 more set to win
  const p1Sets = setsWon[0] ?? 0;
  const p2Sets = setsWon[1] ?? 0;
  return p1Sets === setsToWin - 1 && p2Sets === setsToWin - 1;
}

/**
 * Count sets won by each team
 */
function countSetsWon(sets: number[][]): number[] {
  let p1Sets = 0;
  let p2Sets = 0;
  for (const set of sets) {
    const s1 = set[0] ?? 0;
    const s2 = set[1] ?? 0;
    if (s1 > s2) p1Sets++;
    else if (s2 > s1) p2Sets++;
  }
  return [p1Sets, p2Sets];
}

// ============================================
// Queries
// ============================================

/**
 * Get volleyball match state
 */
export const getVolleyballMatch = query({
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
      status: v.string(),
      volleyballState: v.optional(volleyballState),
      myRole: v.union(
        v.literal("owner"),
        v.literal("scorer"),
        v.literal("temp_scorer")
      ),
      sport: v.string(),
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
      tournamentId: match.tournamentId,
      round: match.round,
      matchNumber: match.matchNumber,
      participant1,
      participant2,
      participant1Score: match.participant1Score,
      participant2Score: match.participant2Score,
      winnerId: match.winnerId,
      status: match.status,
      volleyballState: match.volleyballState,
      myRole: role,
      sport: tournament.sport,
    };
  },
});

// ============================================
// Mutations
// ============================================

/**
 * Initialize volleyball state for a match
 * Pulls scoring config from tournament settings
 */
export const initVolleyballMatch = mutation({
  args: {
    matchId: v.id("matches"),
    firstServer: v.number(), // 1 or 2
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

    // Tournament must be active to initialize matches
    if (tournament.status !== "active") {
      throw new Error("Tournament must be started before matches can begin");
    }

    // Check user's access (owner, scorer, or temp scorer can init matches)
    const hasAccess = await canScoreTournament(ctx, tournament, userId, args.tempScorerToken);
    if (!hasAccess) {
      throw new Error("Not authorized");
    }

    // Validate first server
    if (args.firstServer !== 1 && args.firstServer !== 2) {
      throw new Error("First server must be 1 or 2");
    }

    // Get volleyball config from tournament
    if (!tournament.volleyballConfig) {
      throw new Error("Tournament does not have volleyball configuration. Please update the tournament settings.");
    }

    const { setsToWin, pointsPerSet, pointsPerDecidingSet, minLeadToWin } = tournament.volleyballConfig;

    // Initialize volleyball state
    const volleyballState: VolleyballState = {
      sets: [],
      currentSetPoints: [0, 0],
      servingTeam: args.firstServer,
      setsToWin,
      pointsPerSet,
      pointsPerDecidingSet,
      minLeadToWin,
      currentSetNumber: 1,
      isMatchComplete: false,
    };

    await ctx.db.patch(args.matchId, {
      volleyballState,
      participant1Score: 0,
      participant2Score: 0,
    });

    // Check if scoring logs are enabled for this user
    const userScoringLogs = await ctx.db
      .query("userScoringLogs")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();

    // Log the action if logging is enabled for this user
    if (userScoringLogs?.enabled === true) {
      let participant1Name: string | undefined;
      let participant2Name: string | undefined;
      if (match.participant1Id) {
        const p1 = await ctx.db.get(match.participant1Id);
        participant1Name = p1?.displayName;
      }
      if (match.participant2Id) {
        const p2 = await ctx.db.get(match.participant2Id);
        participant2Name = p2?.displayName;
      }

      await ctx.scheduler.runAfter(0, internal.scoringLogs.logScoringAction, {
        tournamentId: match.tournamentId,
        matchId: args.matchId,
        action: "init_match",
        actorId: userId ?? undefined,
        sport: "volleyball",
        details: { firstServer: args.firstServer },
        stateAfter: JSON.stringify(volleyballState),
        participant1Name,
        participant2Name,
        round: match.round,
        matchNumber: match.matchNumber,
      });
    }

    return null;
  },
});

/**
 * Score a point in a volleyball match
 */
export const scoreVolleyballPoint = mutation({
  args: {
    matchId: v.id("matches"),
    winnerTeam: v.number(), // 1 or 2
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

    // Check user's access (owner, scorer, or temp scorer can score)
    const hasAccess = await canScoreTournament(ctx, tournament, userId, args.tempScorerToken);
    if (!hasAccess) {
      throw new Error("Not authorized");
    }

    if (match.status !== "live") {
      throw new Error("Match is not live");
    }

    if (!match.volleyballState) {
      throw new Error("Volleyball state not initialized");
    }

    if (match.volleyballState.isMatchComplete) {
      throw new Error("Match is already complete");
    }

    const winner = args.winnerTeam as 1 | 2;
    if (winner !== 1 && winner !== 2) {
      throw new Error("Winner must be 1 or 2");
    }

    // Check if scoring logs are enabled for this user
    const userScoringLogs = await ctx.db
      .query("userScoringLogs")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();
    const loggingEnabled = userScoringLogs?.enabled === true;
    const stateBefore = loggingEnabled ? JSON.stringify(match.volleyballState) : undefined;

    // Helper to log scoring action
    const logAction = async (stateAfter: VolleyballState) => {
      if (!loggingEnabled) return;

      let participant1Name: string | undefined;
      let participant2Name: string | undefined;
      if (match.participant1Id) {
        const p1 = await ctx.db.get(match.participant1Id);
        participant1Name = p1?.displayName;
      }
      if (match.participant2Id) {
        const p2 = await ctx.db.get(match.participant2Id);
        participant2Name = p2?.displayName;
      }

      await ctx.scheduler.runAfter(0, internal.scoringLogs.logScoringAction, {
        tournamentId: match.tournamentId,
        matchId: args.matchId,
        action: "score_point",
        actorId: userId ?? undefined,
        sport: "volleyball",
        details: { team: winner },
        stateBefore,
        stateAfter: JSON.stringify(stateAfter),
        participant1Name,
        participant2Name,
        round: match.round,
        matchNumber: match.matchNumber,
      });
    };

    const state: VolleyballState = { ...match.volleyballState };

    // Save current state to history before making changes
    state.history = addToHistory(state);

    // Add point to winner
    const newPoints = [...state.currentSetPoints];
    newPoints[winner - 1] = (newPoints[winner - 1] ?? 0) + 1;
    state.currentSetPoints = newPoints;

    // Check if point scorer gets serve (side out)
    if (winner !== state.servingTeam) {
      state.servingTeam = winner;
    }

    // Check if set is won
    const setsWon = countSetsWon(state.sets);
    const isDeciding = isDecidingSet(setsWon, state.setsToWin);
    const { won, winner: setWinner } = isSetWon(
      newPoints,
      isDeciding,
      state.pointsPerSet,
      state.pointsPerDecidingSet,
      state.minLeadToWin
    );

    if (won && setWinner) {
      // Set is complete - save it and check for match win
      state.sets = [...state.sets, [...newPoints]];
      state.currentSetPoints = [0, 0];
      state.currentSetNumber++;

      const newSetsWon = countSetsWon(state.sets);
      const p1SetsWon = newSetsWon[0] ?? 0;
      const p2SetsWon = newSetsWon[1] ?? 0;

      // Check for match win
      if (p1SetsWon >= state.setsToWin || p2SetsWon >= state.setsToWin) {
        state.isMatchComplete = true;
        const matchWinner = p1SetsWon >= state.setsToWin ? 1 : 2;
        const winnerId = matchWinner === 1 ? match.participant1Id : match.participant2Id;

        await ctx.db.patch(args.matchId, {
          volleyballState: state,
          participant1Score: p1SetsWon,
          participant2Score: p2SetsWon,
          winnerId,
          status: "completed",
          completedAt: Date.now(),
        });

        // Update participant stats
        if (match.participant1Id) {
          const p1 = await ctx.db.get(match.participant1Id);
          if (p1) {
            await ctx.db.patch(match.participant1Id, {
              wins: p1.wins + (matchWinner === 1 ? 1 : 0),
              losses: p1.losses + (matchWinner === 2 ? 1 : 0),
              pointsFor: p1.pointsFor + p1SetsWon,
              pointsAgainst: p1.pointsAgainst + p2SetsWon,
            });
          }
        }
        if (match.participant2Id) {
          const p2 = await ctx.db.get(match.participant2Id);
          if (p2) {
            await ctx.db.patch(match.participant2Id, {
              wins: p2.wins + (matchWinner === 2 ? 1 : 0),
              losses: p2.losses + (matchWinner === 1 ? 1 : 0),
              pointsFor: p2.pointsFor + p2SetsWon,
              pointsAgainst: p2.pointsAgainst + p1SetsWon,
            });
          }
        }

        // Handle bracket advancement
        if (winnerId && match.nextMatchId) {
          const nextMatch = await ctx.db.get(match.nextMatchId);
          if (nextMatch) {
            const slot = match.nextMatchSlot;
            if (slot === 1) {
              await ctx.db.patch(match.nextMatchId, { participant1Id: winnerId });
            } else if (slot === 2) {
              await ctx.db.patch(match.nextMatchId, { participant2Id: winnerId });
            }
          }
        }

        await logAction(state);

        // Check if tournament is now complete (deactivates temp scorers)
        await ctx.runMutation(internal.tournaments.checkAndCompleteTournament, {
          tournamentId: match.tournamentId,
        });

        return null;
      }
    }

    // Update match with new state
    const setsWonNow = countSetsWon(state.sets);
    await ctx.db.patch(args.matchId, {
      volleyballState: state,
      participant1Score: setsWonNow[0] ?? 0,
      participant2Score: setsWonNow[1] ?? 0,
    });

    await logAction(state);
    return null;
  },
});

/**
 * Change the serving team (for corrections)
 */
export const setVolleyballServer = mutation({
  args: {
    matchId: v.id("matches"),
    servingTeam: v.number(), // 1 or 2
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

    // Check user's access (owner or scorer can change server)
    const hasAccess = await canScoreTournament(ctx, tournament, userId);
    if (!hasAccess) {
      throw new Error("Not authorized");
    }

    if (!match.volleyballState) {
      throw new Error("Volleyball state not initialized");
    }

    if (args.servingTeam !== 1 && args.servingTeam !== 2) {
      throw new Error("Server must be 1 or 2");
    }

    const newState = {
      ...match.volleyballState,
      servingTeam: args.servingTeam,
    };

    await ctx.db.patch(args.matchId, {
      volleyballState: newState,
    });

    // Check if scoring logs are enabled for this user
    const userScoringLogs = await ctx.db
      .query("userScoringLogs")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();

    // Log the set_server action if logging is enabled for this user
    if (userScoringLogs?.enabled === true) {
      let participant1Name: string | undefined;
      let participant2Name: string | undefined;
      if (match.participant1Id) {
        const p1 = await ctx.db.get(match.participant1Id);
        participant1Name = p1?.displayName;
      }
      if (match.participant2Id) {
        const p2 = await ctx.db.get(match.participant2Id);
        participant2Name = p2?.displayName;
      }

      await ctx.scheduler.runAfter(0, internal.scoringLogs.logScoringAction, {
        tournamentId: match.tournamentId,
        matchId: args.matchId,
        action: "set_server",
        actorId: userId ?? undefined,
        sport: "volleyball",
        details: { servingParticipant: args.servingTeam },
        stateBefore: JSON.stringify(match.volleyballState),
        stateAfter: JSON.stringify(newState),
        participant1Name,
        participant2Name,
        round: match.round,
        matchNumber: match.matchNumber,
      });
    }

    return null;
  },
});

/**
 * Adjust score manually (for corrections)
 */
export const adjustVolleyballScore = mutation({
  args: {
    matchId: v.id("matches"),
    team: v.number(), // 1 or 2
    adjustment: v.number(), // positive or negative
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

    // Only owner can adjust scores
    if (tournament.createdBy !== userId) {
      throw new Error("Not authorized - only the tournament owner can adjust scores");
    }

    if (!match.volleyballState) {
      throw new Error("Volleyball state not initialized");
    }

    if (match.volleyballState.isMatchComplete) {
      throw new Error("Cannot adjust score of completed match");
    }

    const team = args.team as 1 | 2;
    if (team !== 1 && team !== 2) {
      throw new Error("Team must be 1 or 2");
    }

    const newPoints = [...match.volleyballState.currentSetPoints];
    newPoints[team - 1] = Math.max(0, (newPoints[team - 1] ?? 0) + args.adjustment);

    const newState = {
      ...match.volleyballState,
      currentSetPoints: newPoints,
    };

    await ctx.db.patch(args.matchId, {
      volleyballState: newState,
    });

    // Check if scoring logs are enabled for this user
    const userScoringLogs = await ctx.db
      .query("userScoringLogs")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();

    // Log the adjust_score action if logging is enabled for this user
    if (userScoringLogs?.enabled === true) {
      let participant1Name: string | undefined;
      let participant2Name: string | undefined;
      if (match.participant1Id) {
        const p1 = await ctx.db.get(match.participant1Id);
        participant1Name = p1?.displayName;
      }
      if (match.participant2Id) {
        const p2 = await ctx.db.get(match.participant2Id);
        participant2Name = p2?.displayName;
      }

      await ctx.scheduler.runAfter(0, internal.scoringLogs.logScoringAction, {
        tournamentId: match.tournamentId,
        matchId: args.matchId,
        action: "adjust_score",
        actorId: userId ?? undefined,
        sport: "volleyball",
        details: { team: args.team, adjustment: args.adjustment },
        stateBefore: JSON.stringify(match.volleyballState),
        stateAfter: JSON.stringify(newState),
        participant1Name,
        participant2Name,
        round: match.round,
        matchNumber: match.matchNumber,
      });
    }

    return null;
  },
});

/**
 * Undo the last point scored
 */
export const undoVolleyballPoint = mutation({
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

    // Check user's access (owner, scorer, or temp scorer can undo)
    const hasAccess = await canScoreTournament(ctx, tournament, userId, args.tempScorerToken);
    if (!hasAccess) {
      throw new Error("Not authorized");
    }

    if (!match.volleyballState) {
      throw new Error("Volleyball state not initialized");
    }

    const history = match.volleyballState.history;
    if (!history || history.length === 0) {
      throw new Error("No history available to undo");
    }

    // Get the previous state from history
    const previousSnapshot = history[history.length - 1]!;
    const newHistory = history.slice(0, -1);

    // Restore the previous state
    const restoredState: VolleyballState = {
      ...match.volleyballState,
      sets: previousSnapshot.sets,
      currentSetPoints: previousSnapshot.currentSetPoints,
      servingTeam: previousSnapshot.servingTeam,
      currentSetNumber: previousSnapshot.currentSetNumber,
      isMatchComplete: previousSnapshot.isMatchComplete,
      history: newHistory,
    };

    // Calculate sets won for score display
    const setsWon = countSetsWon(restoredState.sets);

    await ctx.db.patch(args.matchId, {
      volleyballState: restoredState,
      participant1Score: setsWon[0] ?? 0,
      participant2Score: setsWon[1] ?? 0,
    });

    // Check if scoring logs are enabled for this user
    const userScoringLogs = await ctx.db
      .query("userScoringLogs")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();

    // Log the undo action if logging is enabled for this user
    if (userScoringLogs?.enabled === true) {
      let participant1Name: string | undefined;
      let participant2Name: string | undefined;
      if (match.participant1Id) {
        const p1 = await ctx.db.get(match.participant1Id);
        participant1Name = p1?.displayName;
      }
      if (match.participant2Id) {
        const p2 = await ctx.db.get(match.participant2Id);
        participant2Name = p2?.displayName;
      }

      await ctx.scheduler.runAfter(0, internal.scoringLogs.logScoringAction, {
        tournamentId: match.tournamentId,
        matchId: args.matchId,
        action: "undo",
        actorId: userId ?? undefined,
        sport: "volleyball",
        details: {},
        stateBefore: JSON.stringify(match.volleyballState),
        stateAfter: JSON.stringify(restoredState),
        participant1Name,
        participant2Name,
        round: match.round,
        matchNumber: match.matchNumber,
      });
    }

    return null;
  },
});
