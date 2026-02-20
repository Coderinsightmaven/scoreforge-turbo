import { getCurrentUser } from "./users";
import { query, mutation, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { tennisState } from "./schema";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { errors } from "./lib/errors";
import { canScoreTournament, getTournamentRole } from "./lib/accessControl";
import { assertNotInMaintenance } from "./lib/maintenance";
import { assertCourtAvailableForLiveMatch } from "./lib/courtAvailability";
import {
  type TennisState,
  addToHistory,
  processGamePoint,
  processTiebreakPoint,
  processSetGame,
  processMatchSet,
  getNextServer,
} from "./lib/tennisScoring";
export { pointToString } from "./lib/tennisScoring";

const DEFAULT_SET_TIEBREAK_TARGET = 7;
const DEFAULT_FINAL_SET_TIEBREAK_TARGET = 7;
const DEFAULT_MATCH_TIEBREAK_TARGET = 10;

type ResolvedTennisConfig = {
  isAdScoring: boolean;
  setsToWin: number;
  setTiebreakTarget: number;
  finalSetTiebreakTarget: number;
  useMatchTiebreak: boolean;
  matchTiebreakTarget: number;
};

function resolveTennisConfig(tournament: Doc<"tournaments">): ResolvedTennisConfig {
  const config = tournament.tennisConfig;
  if (!config) {
    throw errors.invalidState(
      "Tournament does not have tennis configuration. Please update the tournament settings"
    );
  }

  const isDoubles = tournament.participantType === "doubles";

  return {
    isAdScoring: config.isAdScoring,
    setsToWin: config.setsToWin,
    setTiebreakTarget: config.setTiebreakTarget ?? DEFAULT_SET_TIEBREAK_TARGET,
    finalSetTiebreakTarget: config.finalSetTiebreakTarget ?? DEFAULT_FINAL_SET_TIEBREAK_TARGET,
    useMatchTiebreak: config.useMatchTiebreak ?? isDoubles,
    matchTiebreakTarget: config.matchTiebreakTarget ?? DEFAULT_MATCH_TIEBREAK_TARGET,
  };
}

function getNextFirstServerOfSet(firstServerOfSet: number, setScore: number[]): number {
  const totalGames = (setScore[0] ?? 0) + (setScore[1] ?? 0);
  if (totalGames % 2 === 0) {
    return firstServerOfSet;
  }
  return firstServerOfSet === 1 ? 2 : 1;
}

function isDecidingSet(state: TennisState): boolean {
  const { p1Sets, p2Sets } = countSetsWon(state.sets);
  return p1Sets === state.setsToWin - 1 && p2Sets === state.setsToWin - 1;
}

function normalizeTennisState(state: TennisState, resolved: ResolvedTennisConfig): TennisState {
  const setTiebreakTarget = state.setTiebreakTarget ?? resolved.setTiebreakTarget;
  const finalSetTiebreakTarget = state.finalSetTiebreakTarget ?? resolved.finalSetTiebreakTarget;
  const matchTiebreakTarget = state.matchTiebreakTarget ?? resolved.matchTiebreakTarget;
  const useMatchTiebreak = state.useMatchTiebreak ?? resolved.useMatchTiebreak;
  const tiebreakMode = state.tiebreakMode ?? (state.isTiebreak ? "set" : undefined);

  const tiebreakTarget =
    state.tiebreakTarget ??
    (state.isTiebreak
      ? tiebreakMode === "match"
        ? matchTiebreakTarget
        : isDecidingSet(state)
          ? finalSetTiebreakTarget
          : setTiebreakTarget
      : setTiebreakTarget);

  return {
    ...state,
    setTiebreakTarget,
    finalSetTiebreakTarget,
    useMatchTiebreak,
    matchTiebreakTarget,
    tiebreakTarget,
    tiebreakMode,
  };
}

// ============================================
// Match Completion Helpers
// ============================================

function countSetsWon(sets: number[][]): { p1Sets: number; p2Sets: number } {
  return {
    p1Sets: sets.filter((s) => (s[0] ?? 0) > (s[1] ?? 0)).length,
    p2Sets: sets.filter((s) => (s[1] ?? 0) > (s[0] ?? 0)).length,
  };
}

async function updateParticipantStats(
  ctx: MutationCtx,
  match: Doc<"matches">,
  matchWinner: 1 | 2,
  p1Sets: number,
  p2Sets: number
) {
  if (match.participant1Id) {
    const p1 = await ctx.db.get("tournamentParticipants", match.participant1Id);
    if (p1) {
      await ctx.db.patch("tournamentParticipants", match.participant1Id, {
        wins: p1.wins + (matchWinner === 1 ? 1 : 0),
        losses: p1.losses + (matchWinner === 2 ? 1 : 0),
        pointsFor: p1.pointsFor + p1Sets,
        pointsAgainst: p1.pointsAgainst + p2Sets,
      });
    }
  }
  if (match.participant2Id) {
    const p2 = await ctx.db.get("tournamentParticipants", match.participant2Id);
    if (p2) {
      await ctx.db.patch("tournamentParticipants", match.participant2Id, {
        wins: p2.wins + (matchWinner === 2 ? 1 : 0),
        losses: p2.losses + (matchWinner === 1 ? 1 : 0),
        pointsFor: p2.pointsFor + p2Sets,
        pointsAgainst: p2.pointsAgainst + p1Sets,
      });
    }
  }
}

/**
 * Reverse participant stats when undoing a match completion.
 * Decrements the wins/losses and pointsFor/pointsAgainst that were added when the match was completed.
 */
async function reverseParticipantStats(ctx: MutationCtx, match: Doc<"matches">) {
  if (!match.winnerId) return;

  const matchWinner = match.winnerId === match.participant1Id ? 1 : 2;
  const { p1Sets, p2Sets } = countSetsWon(match.tennisState?.sets ?? []);

  if (match.participant1Id) {
    const p1 = await ctx.db.get("tournamentParticipants", match.participant1Id);
    if (p1) {
      await ctx.db.patch("tournamentParticipants", match.participant1Id, {
        wins: Math.max(0, p1.wins - (matchWinner === 1 ? 1 : 0)),
        losses: Math.max(0, p1.losses - (matchWinner === 2 ? 1 : 0)),
        pointsFor: Math.max(0, p1.pointsFor - p1Sets),
        pointsAgainst: Math.max(0, p1.pointsAgainst - p2Sets),
      });
    }
  }
  if (match.participant2Id) {
    const p2 = await ctx.db.get("tournamentParticipants", match.participant2Id);
    if (p2) {
      await ctx.db.patch("tournamentParticipants", match.participant2Id, {
        wins: Math.max(0, p2.wins - (matchWinner === 2 ? 1 : 0)),
        losses: Math.max(0, p2.losses - (matchWinner === 1 ? 1 : 0)),
        pointsFor: Math.max(0, p2.pointsFor - p2Sets),
        pointsAgainst: Math.max(0, p2.pointsAgainst - p1Sets),
      });
    }
  }
}

/**
 * Reverse bracket advancement when undoing a match completion.
 * Removes the winner/loser from the next match slots they were advanced to.
 */
async function reverseBracketAdvancement(ctx: MutationCtx, match: Doc<"matches">) {
  const winnerId = match.winnerId;
  const loserId = match.participant1Id === winnerId ? match.participant2Id : match.participant1Id;

  // Remove winner from next match
  if (winnerId && match.nextMatchId) {
    const nextMatch = await ctx.db.get("matches", match.nextMatchId);
    if (nextMatch) {
      const slot = match.nextMatchSlot;
      if (slot === 1 && nextMatch.participant1Id === winnerId) {
        await ctx.db.patch("matches", match.nextMatchId, { participant1Id: undefined });
      } else if (slot === 2 && nextMatch.participant2Id === winnerId) {
        await ctx.db.patch("matches", match.nextMatchId, { participant2Id: undefined });
      }
    }
  }

  // Remove loser from loser bracket match (double elimination)
  if (loserId && match.loserNextMatchId) {
    const loserNextMatch = await ctx.db.get("matches", match.loserNextMatchId);
    if (loserNextMatch) {
      const loserSlot = match.loserNextMatchSlot;
      if (loserSlot === 1 && loserNextMatch.participant1Id === loserId) {
        await ctx.db.patch("matches", match.loserNextMatchId, { participant1Id: undefined });
      } else if (loserSlot === 2 && loserNextMatch.participant2Id === loserId) {
        await ctx.db.patch("matches", match.loserNextMatchId, { participant2Id: undefined });
      }
    }
  }
}

async function advanceBracket(ctx: MutationCtx, match: Doc<"matches">, matchWinner: 1 | 2) {
  const winnerId = matchWinner === 1 ? match.participant1Id : match.participant2Id;
  const loserId = matchWinner === 1 ? match.participant2Id : match.participant1Id;

  // Advance winner
  if (winnerId && match.nextMatchId) {
    const nextMatch = await ctx.db.get("matches", match.nextMatchId);
    if (nextMatch) {
      const slot = match.nextMatchSlot;
      if (slot === 1) {
        await ctx.db.patch("matches", match.nextMatchId, { participant1Id: winnerId });
      } else if (slot === 2) {
        await ctx.db.patch("matches", match.nextMatchId, { participant2Id: winnerId });
      }
    }
  }

  // Advance loser (double elimination)
  if (loserId && match.loserNextMatchId) {
    const loserNextMatch = await ctx.db.get("matches", match.loserNextMatchId);
    if (loserNextMatch) {
      const loserSlot = match.loserNextMatchSlot;
      if (loserSlot === 1) {
        await ctx.db.patch("matches", match.loserNextMatchId, { participant1Id: loserId });
      } else if (loserSlot === 2) {
        await ctx.db.patch("matches", match.loserNextMatchId, { participant2Id: loserId });
      }
    }
  }
}

// ============================================
// Queries
// ============================================

/**
 * Get tennis match state
 */
export const getTennisMatch = query({
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
      tennisState: v.optional(tennisState),
      myRole: v.union(v.literal("owner"), v.literal("scorer"), v.literal("temp_scorer")),
      sport: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user?._id ?? null;

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
      tournamentId: match.tournamentId,
      round: match.round,
      matchNumber: match.matchNumber,
      participant1,
      participant2,
      participant1Score: match.participant1Score,
      participant2Score: match.participant2Score,
      winnerId: match.winnerId,
      status: match.status,
      tennisState: match.tennisState,
      myRole: role,
      sport: tournament.sport,
    };
  },
});

// ============================================
// Mutations
// ============================================

/**
 * Initialize tennis state for a match
 * Pulls scoring config from tournament settings
 */
export const initTennisMatch = mutation({
  args: {
    matchId: v.id("matches"),
    firstServer: v.number(), // 1 or 2
    tempScorerToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user?._id ?? null;
    await assertNotInMaintenance(ctx, userId);

    const match = await ctx.db.get("matches", args.matchId);
    if (!match) {
      throw errors.notFound("Match");
    }

    const tournament = await ctx.db.get("tournaments", match.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Tournament must be active to initialize matches
    if (tournament.status !== "active") {
      throw errors.invalidState("Tournament must be started before matches can begin");
    }

    // Check user's access (owner, scorer, or temp scorer can init matches)
    const hasAccess = await canScoreTournament(ctx, tournament, userId, args.tempScorerToken);
    if (!hasAccess) {
      throw errors.unauthorized();
    }

    // Validate both participants are assigned (prevent initializing with TBD participants)
    if (!match.participant1Id || !match.participant2Id) {
      throw errors.invalidState("Both participants must be assigned before initializing the match");
    }

    // Validate first server
    if (args.firstServer !== 1 && args.firstServer !== 2) {
      throw errors.invalidInput("First server must be 1 or 2");
    }

    const resolvedConfig = resolveTennisConfig(tournament);

    // Initialize tennis state
    const tennisState: TennisState = {
      sets: [],
      currentSetGames: [0, 0],
      currentGamePoints: [0, 0],
      servingParticipant: args.firstServer,
      firstServerOfSet: args.firstServer,
      isAdScoring: resolvedConfig.isAdScoring,
      setsToWin: resolvedConfig.setsToWin,
      setTiebreakTarget: resolvedConfig.setTiebreakTarget,
      finalSetTiebreakTarget: resolvedConfig.finalSetTiebreakTarget,
      useMatchTiebreak: resolvedConfig.useMatchTiebreak,
      matchTiebreakTarget: resolvedConfig.matchTiebreakTarget,
      isTiebreak: false,
      tiebreakPoints: [0, 0],
      tiebreakTarget: resolvedConfig.setTiebreakTarget,
      tiebreakMode: undefined,
      isMatchComplete: false,
      // Stat tracking
      aces: [0, 0],
      doubleFaults: [0, 0],
      faultState: 0,
    };

    await ctx.db.patch("matches", args.matchId, {
      tennisState,
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
      // Get participant names
      let participant1Name: string | undefined;
      let participant2Name: string | undefined;
      if (match.participant1Id) {
        const p1 = await ctx.db.get("tournamentParticipants", match.participant1Id);
        participant1Name = p1?.displayName;
      }
      if (match.participant2Id) {
        const p2 = await ctx.db.get("tournamentParticipants", match.participant2Id);
        participant2Name = p2?.displayName;
      }

      await ctx.scheduler.runAfter(0, internal.scoringLogs.logScoringAction, {
        tournamentId: match.tournamentId,
        matchId: args.matchId,
        action: "init_match",
        actorId: userId ?? undefined,
        sport: "tennis",
        details: { firstServer: args.firstServer },
        stateAfter: JSON.stringify(tennisState),
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
 * Score a point in a tennis match
 */
export const scoreTennisPoint = mutation({
  args: {
    matchId: v.id("matches"),
    winnerParticipant: v.number(), // 1 or 2
    tempScorerToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user?._id ?? null;
    await assertNotInMaintenance(ctx, userId);

    const match = await ctx.db.get("matches", args.matchId);
    if (!match) {
      throw errors.notFound("Match");
    }

    const tournament = await ctx.db.get("tournaments", match.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Check user's access (owner, scorer, or temp scorer can score)
    const hasAccess = await canScoreTournament(ctx, tournament, userId, args.tempScorerToken);
    if (!hasAccess) {
      throw errors.unauthorized();
    }

    // Validate both participants are assigned (prevent scoring with TBD participants)
    if (!match.participant1Id || !match.participant2Id) {
      throw errors.invalidState("Both participants must be assigned before scoring");
    }

    if (match.status !== "live") {
      throw errors.invalidState("Match is not live");
    }

    if (!match.tennisState) {
      throw errors.invalidState("Tennis state not initialized");
    }

    if (match.tennisState.isMatchComplete) {
      throw errors.invalidState("Match is already complete");
    }

    const winner = args.winnerParticipant as 1 | 2;
    if (winner !== 1 && winner !== 2) {
      throw errors.invalidInput("Winner must be 1 or 2");
    }

    // Check if scoring logs are enabled for this user
    const userScoringLogs = await ctx.db
      .query("userScoringLogs")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();
    const loggingEnabled = userScoringLogs?.enabled === true;
    const stateBefore = loggingEnabled ? JSON.stringify(match.tennisState) : undefined;

    // Helper to log scoring action
    const logAction = async (stateAfter: TennisState) => {
      if (!loggingEnabled) return;

      let participant1Name: string | undefined;
      let participant2Name: string | undefined;
      if (match.participant1Id) {
        const p1 = await ctx.db.get("tournamentParticipants", match.participant1Id);
        participant1Name = p1?.displayName;
      }
      if (match.participant2Id) {
        const p2 = await ctx.db.get("tournamentParticipants", match.participant2Id);
        participant2Name = p2?.displayName;
      }

      await ctx.scheduler.runAfter(0, internal.scoringLogs.logScoringAction, {
        tournamentId: match.tournamentId,
        matchId: args.matchId,
        action: "score_point",
        actorId: userId ?? undefined,
        sport: "tennis",
        details: { winnerParticipant: winner },
        stateBefore,
        stateAfter: JSON.stringify(stateAfter),
        participant1Name,
        participant2Name,
        round: match.round,
        matchNumber: match.matchNumber,
      });
    };

    const resolvedConfig = resolveTennisConfig(tournament);
    const state: TennisState = normalizeTennisState({ ...match.tennisState }, resolvedConfig);

    // Save current state to history before making changes
    state.history = addToHistory(state);

    // Reset fault state on normal point
    state.faultState = 0;

    // Set match start timestamp on first point
    if (!state.matchStartedTimestamp) {
      state.matchStartedTimestamp = Date.now();
    }

    // Process based on whether we're in a tiebreak or regular game
    if (state.isTiebreak) {
      const { tiebreakOver, tiebreakWinner, newPoints } = processTiebreakPoint(state, winner);

      if (tiebreakOver && tiebreakWinner) {
        if (state.tiebreakMode === "match") {
          const matchTiebreakScore = [...newPoints];

          const { matchOver, matchWinner, newSets } = processMatchSet(
            state,
            tiebreakWinner,
            matchTiebreakScore
          );

          state.sets = newSets;
          state.currentSetGames = [0, 0];
          state.currentGamePoints = [0, 0];
          state.isTiebreak = false;
          state.tiebreakPoints = [0, 0];
          state.tiebreakMode = undefined;

          if (matchOver) {
            state.isMatchComplete = true;
            const winnerId = matchWinner === 1 ? match.participant1Id : match.participant2Id;
            const { p1Sets, p2Sets } = countSetsWon(newSets);

            await ctx.db.patch("matches", args.matchId, {
              tennisState: state,
              participant1Score: p1Sets,
              participant2Score: p2Sets,
              winnerId,
              status: "completed",
              completedAt: Date.now(),
            });

            await updateParticipantStats(ctx, match, matchWinner as 1 | 2, p1Sets, p2Sets);
            await advanceBracket(ctx, match, matchWinner as 1 | 2);
            await logAction(state);

            await ctx.runMutation(internal.tournaments.checkAndCompleteTournament, {
              tournamentId: match.tournamentId,
            });

            return null;
          }

          const nextFirstServer = getNextFirstServerOfSet(
            state.firstServerOfSet,
            matchTiebreakScore
          );
          state.firstServerOfSet = nextFirstServer;
          state.servingParticipant = nextFirstServer;
        } else {
          // Tiebreak won - update games and check set
          const finalSetGames = [...state.currentSetGames];
          finalSetGames[tiebreakWinner - 1] = (finalSetGames[tiebreakWinner - 1] ?? 0) + 1;

          // Process set win (tiebreak winner wins set 7-6)
          const { matchOver, matchWinner, newSets } = processMatchSet(
            state,
            tiebreakWinner,
            finalSetGames
          );

          state.sets = newSets;
          state.currentSetGames = [0, 0];
          state.currentGamePoints = [0, 0];
          state.isTiebreak = false;
          state.tiebreakPoints = [0, 0];
          state.tiebreakMode = undefined;

          if (matchOver) {
            state.isMatchComplete = true;
            const winnerId = matchWinner === 1 ? match.participant1Id : match.participant2Id;
            const { p1Sets, p2Sets } = countSetsWon(newSets);

            await ctx.db.patch("matches", args.matchId, {
              tennisState: state,
              participant1Score: p1Sets,
              participant2Score: p2Sets,
              winnerId,
              status: "completed",
              completedAt: Date.now(),
            });

            await updateParticipantStats(ctx, match, matchWinner as 1 | 2, p1Sets, p2Sets);
            await advanceBracket(ctx, match, matchWinner as 1 | 2);
            await logAction(state);

            await ctx.runMutation(internal.tournaments.checkAndCompleteTournament, {
              tournamentId: match.tournamentId,
            });

            return null;
          }

          const nextFirstServer = getNextFirstServerOfSet(state.firstServerOfSet, finalSetGames);
          state.firstServerOfSet = nextFirstServer;
          state.servingParticipant = nextFirstServer;
        }
      } else {
        // Tiebreak continues
        state.tiebreakPoints = newPoints;
        // Server changes: after first point, then every 2 points
        const totalPoints = (newPoints[0] ?? 0) + (newPoints[1] ?? 0);
        if (totalPoints > 0) {
          const pointsSinceFirst = totalPoints;
          if (
            pointsSinceFirst === 1 ||
            (pointsSinceFirst > 1 && (pointsSinceFirst - 1) % 2 === 0)
          ) {
            state.servingParticipant = state.servingParticipant === 1 ? 2 : 1;
          }
        }
      }
    } else {
      // Regular game
      const { gameOver, gameWinner, newPoints } = processGamePoint(state, winner);

      if (gameOver && gameWinner) {
        // Game won - update set
        const { setOver, setWinner, newGames, startTiebreak } = processSetGame(state, gameWinner);

        if (startTiebreak) {
          // Start tiebreak
          state.currentSetGames = newGames;
          state.currentGamePoints = [0, 0];
          state.isTiebreak = true;
          state.tiebreakPoints = [0, 0];
          state.tiebreakMode = "set";
          state.tiebreakTarget = isDecidingSet(state)
            ? (state.finalSetTiebreakTarget ?? state.setTiebreakTarget)
            : state.setTiebreakTarget;
          // Server for tiebreak is whoever would serve next in rotation
          state.servingParticipant = getNextServer(state);
        } else if (setOver && setWinner) {
          // Set won - check for match
          const setScore = state.currentSetGames.map((g, i) => (i === setWinner - 1 ? g + 1 : g));
          const { matchOver, matchWinner, newSets } = processMatchSet(state, setWinner, setScore);

          state.sets = newSets;
          state.currentSetGames = [0, 0];
          state.currentGamePoints = [0, 0];

          if (matchOver && matchWinner) {
            state.isMatchComplete = true;
            const winnerId = matchWinner === 1 ? match.participant1Id : match.participant2Id;
            const { p1Sets, p2Sets } = countSetsWon(newSets);

            await ctx.db.patch("matches", args.matchId, {
              tennisState: state,
              participant1Score: p1Sets,
              participant2Score: p2Sets,
              winnerId,
              status: "completed",
              completedAt: Date.now(),
            });

            await updateParticipantStats(ctx, match, matchWinner, p1Sets, p2Sets);
            await advanceBracket(ctx, match, matchWinner);
            await logAction(state);

            await ctx.runMutation(internal.tournaments.checkAndCompleteTournament, {
              tournamentId: match.tournamentId,
            });

            return null;
          } else {
            const { p1Sets, p2Sets } = countSetsWon(newSets);
            const shouldStartMatchTiebreak =
              state.useMatchTiebreak === true &&
              p1Sets === state.setsToWin - 1 &&
              p2Sets === state.setsToWin - 1;

            if (shouldStartMatchTiebreak) {
              state.isTiebreak = true;
              state.tiebreakPoints = [0, 0];
              state.tiebreakMode = "match";
              state.tiebreakTarget = state.matchTiebreakTarget ?? DEFAULT_MATCH_TIEBREAK_TARGET;
              state.servingParticipant = getNextServer(state);
            } else {
              const nextFirstServer = getNextFirstServerOfSet(state.firstServerOfSet, setScore);
              state.firstServerOfSet = nextFirstServer;
              state.servingParticipant = nextFirstServer;
            }
          }
        } else {
          // Set continues
          state.currentSetGames = newGames;
          state.currentGamePoints = [0, 0];
          state.servingParticipant = getNextServer(state);
        }
      } else {
        // Game continues
        state.currentGamePoints = newPoints;
      }
    }

    // Update match with new state
    const { p1Sets, p2Sets } = countSetsWon(state.sets);

    await ctx.db.patch("matches", args.matchId, {
      tennisState: state,
      participant1Score: p1Sets,
      participant2Score: p2Sets,
    });

    await logAction(state);
    return null;
  },
});

/**
 * Score an ace — awards point to the serving participant and tracks the ace stat
 */
export const scoreTennisAce = mutation({
  args: {
    matchId: v.id("matches"),
    tempScorerToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user?._id ?? null;
    await assertNotInMaintenance(ctx, userId);

    const match = await ctx.db.get("matches", args.matchId);
    if (!match) {
      throw errors.notFound("Match");
    }

    const tournament = await ctx.db.get("tournaments", match.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Check user's access (owner, scorer, or temp scorer can score)
    const hasAccess = await canScoreTournament(ctx, tournament, userId, args.tempScorerToken);
    if (!hasAccess) {
      throw errors.unauthorized();
    }

    // Validate both participants are assigned
    if (!match.participant1Id || !match.participant2Id) {
      throw errors.invalidState("Both participants must be assigned before scoring");
    }

    if (match.status !== "live") {
      throw errors.invalidState("Match is not live");
    }

    if (!match.tennisState) {
      throw errors.invalidState("Tennis state not initialized");
    }

    if (match.tennisState.isMatchComplete) {
      throw errors.invalidState("Match is already complete");
    }

    // Check if scoring logs are enabled for this user
    const userScoringLogs = await ctx.db
      .query("userScoringLogs")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();
    const loggingEnabled = userScoringLogs?.enabled === true;
    const stateBefore = loggingEnabled ? JSON.stringify(match.tennisState) : undefined;

    // Helper to log scoring action
    const logAction = async (action: "ace", stateAfter: TennisState, details: object) => {
      if (!loggingEnabled) return;

      let participant1Name: string | undefined;
      let participant2Name: string | undefined;
      if (match.participant1Id) {
        const p1 = await ctx.db.get("tournamentParticipants", match.participant1Id);
        participant1Name = p1?.displayName;
      }
      if (match.participant2Id) {
        const p2 = await ctx.db.get("tournamentParticipants", match.participant2Id);
        participant2Name = p2?.displayName;
      }

      await ctx.scheduler.runAfter(0, internal.scoringLogs.logScoringAction, {
        tournamentId: match.tournamentId,
        matchId: args.matchId,
        action,
        actorId: userId ?? undefined,
        sport: "tennis",
        details,
        stateBefore,
        stateAfter: JSON.stringify(stateAfter),
        participant1Name,
        participant2Name,
        round: match.round,
        matchNumber: match.matchNumber,
      });
    };

    const resolvedConfig = resolveTennisConfig(tournament);
    const state: TennisState = normalizeTennisState({ ...match.tennisState }, resolvedConfig);

    // Save current state to history before making changes
    state.history = addToHistory(state);

    // The ace winner is the serving participant
    const winner = state.servingParticipant as 1 | 2;

    // Increment ace counter for the server
    const serverIdx = winner - 1;
    if (!state.aces) state.aces = [0, 0];
    state.aces[serverIdx] = (state.aces[serverIdx] ?? 0) + 1;

    // Reset fault state on ace
    state.faultState = 0;

    // Set match start timestamp on first point
    if (!state.matchStartedTimestamp) {
      state.matchStartedTimestamp = Date.now();
    }

    // Process the point (same scoring logic as scoreTennisPoint)
    if (state.isTiebreak) {
      const { tiebreakOver, tiebreakWinner, newPoints } = processTiebreakPoint(state, winner);

      if (tiebreakOver && tiebreakWinner) {
        if (state.tiebreakMode === "match") {
          const matchTiebreakScore = [...newPoints];

          const { matchOver, matchWinner, newSets } = processMatchSet(
            state,
            tiebreakWinner,
            matchTiebreakScore
          );

          state.sets = newSets;
          state.currentSetGames = [0, 0];
          state.currentGamePoints = [0, 0];
          state.isTiebreak = false;
          state.tiebreakPoints = [0, 0];
          state.tiebreakMode = undefined;

          if (matchOver) {
            state.isMatchComplete = true;
            const winnerId = matchWinner === 1 ? match.participant1Id : match.participant2Id;
            const { p1Sets, p2Sets } = countSetsWon(newSets);

            await ctx.db.patch("matches", args.matchId, {
              tennisState: state,
              participant1Score: p1Sets,
              participant2Score: p2Sets,
              winnerId,
              status: "completed",
              completedAt: Date.now(),
            });

            await updateParticipantStats(ctx, match, matchWinner as 1 | 2, p1Sets, p2Sets);
            await advanceBracket(ctx, match, matchWinner as 1 | 2);
            await logAction("ace", state, { servingParticipant: winner });

            await ctx.runMutation(internal.tournaments.checkAndCompleteTournament, {
              tournamentId: match.tournamentId,
            });

            return null;
          }

          const nextFirstServer = getNextFirstServerOfSet(
            state.firstServerOfSet,
            matchTiebreakScore
          );
          state.firstServerOfSet = nextFirstServer;
          state.servingParticipant = nextFirstServer;
        } else {
          // Tiebreak won - update games and check set
          const finalSetGames = [...state.currentSetGames];
          finalSetGames[tiebreakWinner - 1] = (finalSetGames[tiebreakWinner - 1] ?? 0) + 1;

          // Process set win (tiebreak winner wins set 7-6)
          const { matchOver, matchWinner, newSets } = processMatchSet(
            state,
            tiebreakWinner,
            finalSetGames
          );

          state.sets = newSets;
          state.currentSetGames = [0, 0];
          state.currentGamePoints = [0, 0];
          state.isTiebreak = false;
          state.tiebreakPoints = [0, 0];
          state.tiebreakMode = undefined;

          if (matchOver) {
            state.isMatchComplete = true;
            const winnerId = matchWinner === 1 ? match.participant1Id : match.participant2Id;
            const { p1Sets, p2Sets } = countSetsWon(newSets);

            await ctx.db.patch("matches", args.matchId, {
              tennisState: state,
              participant1Score: p1Sets,
              participant2Score: p2Sets,
              winnerId,
              status: "completed",
              completedAt: Date.now(),
            });

            await updateParticipantStats(ctx, match, matchWinner as 1 | 2, p1Sets, p2Sets);
            await advanceBracket(ctx, match, matchWinner as 1 | 2);
            await logAction("ace", state, { servingParticipant: winner });

            await ctx.runMutation(internal.tournaments.checkAndCompleteTournament, {
              tournamentId: match.tournamentId,
            });

            return null;
          }

          const nextFirstServer = getNextFirstServerOfSet(state.firstServerOfSet, finalSetGames);
          state.firstServerOfSet = nextFirstServer;
          state.servingParticipant = nextFirstServer;
        }
      } else {
        // Tiebreak continues
        state.tiebreakPoints = newPoints;
        // Server changes: after first point, then every 2 points
        const totalPoints = (newPoints[0] ?? 0) + (newPoints[1] ?? 0);
        if (totalPoints > 0) {
          const pointsSinceFirst = totalPoints;
          if (
            pointsSinceFirst === 1 ||
            (pointsSinceFirst > 1 && (pointsSinceFirst - 1) % 2 === 0)
          ) {
            state.servingParticipant = state.servingParticipant === 1 ? 2 : 1;
          }
        }
      }
    } else {
      // Regular game
      const { gameOver, gameWinner, newPoints } = processGamePoint(state, winner);

      if (gameOver && gameWinner) {
        // Game won - update set
        const { setOver, setWinner, newGames, startTiebreak } = processSetGame(state, gameWinner);

        if (startTiebreak) {
          // Start tiebreak
          state.currentSetGames = newGames;
          state.currentGamePoints = [0, 0];
          state.isTiebreak = true;
          state.tiebreakPoints = [0, 0];
          state.tiebreakMode = "set";
          state.tiebreakTarget = isDecidingSet(state)
            ? (state.finalSetTiebreakTarget ?? state.setTiebreakTarget)
            : state.setTiebreakTarget;
          // Server for tiebreak is whoever would serve next in rotation
          state.servingParticipant = getNextServer(state);
        } else if (setOver && setWinner) {
          // Set won - check for match
          const setScore = state.currentSetGames.map((g, i) => (i === setWinner - 1 ? g + 1 : g));
          const { matchOver, matchWinner, newSets } = processMatchSet(state, setWinner, setScore);

          state.sets = newSets;
          state.currentSetGames = [0, 0];
          state.currentGamePoints = [0, 0];

          if (matchOver && matchWinner) {
            state.isMatchComplete = true;
            const winnerId = matchWinner === 1 ? match.participant1Id : match.participant2Id;
            const { p1Sets, p2Sets } = countSetsWon(newSets);

            await ctx.db.patch("matches", args.matchId, {
              tennisState: state,
              participant1Score: p1Sets,
              participant2Score: p2Sets,
              winnerId,
              status: "completed",
              completedAt: Date.now(),
            });

            await updateParticipantStats(ctx, match, matchWinner, p1Sets, p2Sets);
            await advanceBracket(ctx, match, matchWinner);
            await logAction("ace", state, { servingParticipant: winner });

            await ctx.runMutation(internal.tournaments.checkAndCompleteTournament, {
              tournamentId: match.tournamentId,
            });

            return null;
          } else {
            const { p1Sets, p2Sets } = countSetsWon(newSets);
            const shouldStartMatchTiebreak =
              state.useMatchTiebreak === true &&
              p1Sets === state.setsToWin - 1 &&
              p2Sets === state.setsToWin - 1;

            if (shouldStartMatchTiebreak) {
              state.isTiebreak = true;
              state.tiebreakPoints = [0, 0];
              state.tiebreakMode = "match";
              state.tiebreakTarget = state.matchTiebreakTarget ?? DEFAULT_MATCH_TIEBREAK_TARGET;
              state.servingParticipant = getNextServer(state);
            } else {
              const nextFirstServer = getNextFirstServerOfSet(state.firstServerOfSet, setScore);
              state.firstServerOfSet = nextFirstServer;
              state.servingParticipant = nextFirstServer;
            }
          }
        } else {
          // Set continues
          state.currentSetGames = newGames;
          state.currentGamePoints = [0, 0];
          state.servingParticipant = getNextServer(state);
        }
      } else {
        // Game continues
        state.currentGamePoints = newPoints;
      }
    }

    // Update match with new state
    const { p1Sets, p2Sets } = countSetsWon(state.sets);

    await ctx.db.patch("matches", args.matchId, {
      tennisState: state,
      participant1Score: p1Sets,
      participant2Score: p2Sets,
    });

    await logAction("ace", state, { servingParticipant: winner });
    return null;
  },
});

/**
 * Score a fault — first tap records a fault, second tap records a double fault
 * and awards a point to the receiver
 */
export const scoreTennisFault = mutation({
  args: {
    matchId: v.id("matches"),
    tempScorerToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user?._id ?? null;
    await assertNotInMaintenance(ctx, userId);

    const match = await ctx.db.get("matches", args.matchId);
    if (!match) {
      throw errors.notFound("Match");
    }

    const tournament = await ctx.db.get("tournaments", match.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Check user's access (owner, scorer, or temp scorer can score)
    const hasAccess = await canScoreTournament(ctx, tournament, userId, args.tempScorerToken);
    if (!hasAccess) {
      throw errors.unauthorized();
    }

    // Validate both participants are assigned
    if (!match.participant1Id || !match.participant2Id) {
      throw errors.invalidState("Both participants must be assigned before scoring");
    }

    if (match.status !== "live") {
      throw errors.invalidState("Match is not live");
    }

    if (!match.tennisState) {
      throw errors.invalidState("Tennis state not initialized");
    }

    if (match.tennisState.isMatchComplete) {
      throw errors.invalidState("Match is already complete");
    }

    // Check if scoring logs are enabled for this user
    const userScoringLogs = await ctx.db
      .query("userScoringLogs")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();
    const loggingEnabled = userScoringLogs?.enabled === true;
    const stateBefore = loggingEnabled ? JSON.stringify(match.tennisState) : undefined;

    // Helper to log scoring action
    const logAction = async (
      action: "fault" | "double_fault",
      stateAfter: TennisState,
      details: object
    ) => {
      if (!loggingEnabled) return;

      let participant1Name: string | undefined;
      let participant2Name: string | undefined;
      if (match.participant1Id) {
        const p1 = await ctx.db.get("tournamentParticipants", match.participant1Id);
        participant1Name = p1?.displayName;
      }
      if (match.participant2Id) {
        const p2 = await ctx.db.get("tournamentParticipants", match.participant2Id);
        participant2Name = p2?.displayName;
      }

      await ctx.scheduler.runAfter(0, internal.scoringLogs.logScoringAction, {
        tournamentId: match.tournamentId,
        matchId: args.matchId,
        action,
        actorId: userId ?? undefined,
        sport: "tennis",
        details,
        stateBefore,
        stateAfter: JSON.stringify(stateAfter),
        participant1Name,
        participant2Name,
        round: match.round,
        matchNumber: match.matchNumber,
      });
    };

    const resolvedConfig = resolveTennisConfig(tournament);
    const state: TennisState = normalizeTennisState({ ...match.tennisState }, resolvedConfig);

    // Save current state to history before making changes
    state.history = addToHistory(state);

    const currentFaultState = state.faultState ?? 0;
    const serverIdx = (state.servingParticipant as 1 | 2) - 1;

    if (currentFaultState === 0) {
      // First fault — record it but don't score a point
      state.faultState = 1;

      // Set match start timestamp on first point/fault
      if (!state.matchStartedTimestamp) {
        state.matchStartedTimestamp = Date.now();
      }

      await ctx.db.patch("matches", args.matchId, {
        tennisState: state,
      });

      await logAction("fault", state, { servingParticipant: state.servingParticipant });
      return null;
    }

    // Double fault — award point to receiver
    if (!state.doubleFaults) state.doubleFaults = [0, 0];
    state.doubleFaults[serverIdx] = (state.doubleFaults[serverIdx] ?? 0) + 1;

    // Reset fault state
    state.faultState = 0;

    // Set match start timestamp if not set
    if (!state.matchStartedTimestamp) {
      state.matchStartedTimestamp = Date.now();
    }

    // The receiver (opposite of server) wins the point
    const winner: 1 | 2 = state.servingParticipant === 1 ? 2 : 1;

    // Process the point (same scoring logic as scoreTennisPoint)
    if (state.isTiebreak) {
      const { tiebreakOver, tiebreakWinner, newPoints } = processTiebreakPoint(state, winner);

      if (tiebreakOver && tiebreakWinner) {
        if (state.tiebreakMode === "match") {
          const matchTiebreakScore = [...newPoints];

          const { matchOver, matchWinner, newSets } = processMatchSet(
            state,
            tiebreakWinner,
            matchTiebreakScore
          );

          state.sets = newSets;
          state.currentSetGames = [0, 0];
          state.currentGamePoints = [0, 0];
          state.isTiebreak = false;
          state.tiebreakPoints = [0, 0];
          state.tiebreakMode = undefined;

          if (matchOver) {
            state.isMatchComplete = true;
            const winnerId = matchWinner === 1 ? match.participant1Id : match.participant2Id;
            const { p1Sets, p2Sets } = countSetsWon(newSets);

            await ctx.db.patch("matches", args.matchId, {
              tennisState: state,
              participant1Score: p1Sets,
              participant2Score: p2Sets,
              winnerId,
              status: "completed",
              completedAt: Date.now(),
            });

            await updateParticipantStats(ctx, match, matchWinner as 1 | 2, p1Sets, p2Sets);
            await advanceBracket(ctx, match, matchWinner as 1 | 2);
            await logAction("double_fault", state, {
              servingParticipant: state.servingParticipant,
            });

            await ctx.runMutation(internal.tournaments.checkAndCompleteTournament, {
              tournamentId: match.tournamentId,
            });

            return null;
          }

          const nextFirstServer = getNextFirstServerOfSet(
            state.firstServerOfSet,
            matchTiebreakScore
          );
          state.firstServerOfSet = nextFirstServer;
          state.servingParticipant = nextFirstServer;
        } else {
          // Tiebreak won - update games and check set
          const finalSetGames = [...state.currentSetGames];
          finalSetGames[tiebreakWinner - 1] = (finalSetGames[tiebreakWinner - 1] ?? 0) + 1;

          // Process set win (tiebreak winner wins set 7-6)
          const { matchOver, matchWinner, newSets } = processMatchSet(
            state,
            tiebreakWinner,
            finalSetGames
          );

          state.sets = newSets;
          state.currentSetGames = [0, 0];
          state.currentGamePoints = [0, 0];
          state.isTiebreak = false;
          state.tiebreakPoints = [0, 0];
          state.tiebreakMode = undefined;

          if (matchOver) {
            state.isMatchComplete = true;
            const winnerId = matchWinner === 1 ? match.participant1Id : match.participant2Id;
            const { p1Sets, p2Sets } = countSetsWon(newSets);

            await ctx.db.patch("matches", args.matchId, {
              tennisState: state,
              participant1Score: p1Sets,
              participant2Score: p2Sets,
              winnerId,
              status: "completed",
              completedAt: Date.now(),
            });

            await updateParticipantStats(ctx, match, matchWinner as 1 | 2, p1Sets, p2Sets);
            await advanceBracket(ctx, match, matchWinner as 1 | 2);
            await logAction("double_fault", state, {
              servingParticipant: state.servingParticipant,
            });

            await ctx.runMutation(internal.tournaments.checkAndCompleteTournament, {
              tournamentId: match.tournamentId,
            });

            return null;
          }

          const nextFirstServer = getNextFirstServerOfSet(state.firstServerOfSet, finalSetGames);
          state.firstServerOfSet = nextFirstServer;
          state.servingParticipant = nextFirstServer;
        }
      } else {
        // Tiebreak continues
        state.tiebreakPoints = newPoints;
        // Server changes: after first point, then every 2 points
        const totalPoints = (newPoints[0] ?? 0) + (newPoints[1] ?? 0);
        if (totalPoints > 0) {
          const pointsSinceFirst = totalPoints;
          if (
            pointsSinceFirst === 1 ||
            (pointsSinceFirst > 1 && (pointsSinceFirst - 1) % 2 === 0)
          ) {
            state.servingParticipant = state.servingParticipant === 1 ? 2 : 1;
          }
        }
      }
    } else {
      // Regular game
      const { gameOver, gameWinner, newPoints } = processGamePoint(state, winner);

      if (gameOver && gameWinner) {
        // Game won - update set
        const { setOver, setWinner, newGames, startTiebreak } = processSetGame(state, gameWinner);

        if (startTiebreak) {
          // Start tiebreak
          state.currentSetGames = newGames;
          state.currentGamePoints = [0, 0];
          state.isTiebreak = true;
          state.tiebreakPoints = [0, 0];
          state.tiebreakMode = "set";
          state.tiebreakTarget = isDecidingSet(state)
            ? (state.finalSetTiebreakTarget ?? state.setTiebreakTarget)
            : state.setTiebreakTarget;
          // Server for tiebreak is whoever would serve next in rotation
          state.servingParticipant = getNextServer(state);
        } else if (setOver && setWinner) {
          // Set won - check for match
          const setScore = state.currentSetGames.map((g, i) => (i === setWinner - 1 ? g + 1 : g));
          const { matchOver, matchWinner, newSets } = processMatchSet(state, setWinner, setScore);

          state.sets = newSets;
          state.currentSetGames = [0, 0];
          state.currentGamePoints = [0, 0];

          if (matchOver && matchWinner) {
            state.isMatchComplete = true;
            const winnerId = matchWinner === 1 ? match.participant1Id : match.participant2Id;
            const { p1Sets, p2Sets } = countSetsWon(newSets);

            await ctx.db.patch("matches", args.matchId, {
              tennisState: state,
              participant1Score: p1Sets,
              participant2Score: p2Sets,
              winnerId,
              status: "completed",
              completedAt: Date.now(),
            });

            await updateParticipantStats(ctx, match, matchWinner, p1Sets, p2Sets);
            await advanceBracket(ctx, match, matchWinner);
            await logAction("double_fault", state, {
              servingParticipant: state.servingParticipant,
            });

            await ctx.runMutation(internal.tournaments.checkAndCompleteTournament, {
              tournamentId: match.tournamentId,
            });

            return null;
          } else {
            const { p1Sets, p2Sets } = countSetsWon(newSets);
            const shouldStartMatchTiebreak =
              state.useMatchTiebreak === true &&
              p1Sets === state.setsToWin - 1 &&
              p2Sets === state.setsToWin - 1;

            if (shouldStartMatchTiebreak) {
              state.isTiebreak = true;
              state.tiebreakPoints = [0, 0];
              state.tiebreakMode = "match";
              state.tiebreakTarget = state.matchTiebreakTarget ?? DEFAULT_MATCH_TIEBREAK_TARGET;
              state.servingParticipant = getNextServer(state);
            } else {
              const nextFirstServer = getNextFirstServerOfSet(state.firstServerOfSet, setScore);
              state.firstServerOfSet = nextFirstServer;
              state.servingParticipant = nextFirstServer;
            }
          }
        } else {
          // Set continues
          state.currentSetGames = newGames;
          state.currentGamePoints = [0, 0];
          state.servingParticipant = getNextServer(state);
        }
      } else {
        // Game continues
        state.currentGamePoints = newPoints;
      }
    }

    // Update match with new state
    const { p1Sets, p2Sets } = countSetsWon(state.sets);

    await ctx.db.patch("matches", args.matchId, {
      tennisState: state,
      participant1Score: p1Sets,
      participant2Score: p2Sets,
    });

    await logAction("double_fault", state, { servingParticipant: state.servingParticipant });
    return null;
  },
});

/**
 * Undo the last point scored.
 * If the match was completed by the last point, this also:
 * - Reverts match status from "completed" to "live"
 * - Clears winnerId and completedAt
 * - Reverses participant stats (wins/losses/pointsFor/pointsAgainst)
 * - Removes the winner/loser from the next bracket match slots
 * - Reverts tournament status if it was auto-completed
 */
export const undoTennisPoint = mutation({
  args: {
    matchId: v.id("matches"),
    tempScorerToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user?._id ?? null;

    const match = await ctx.db.get("matches", args.matchId);
    if (!match) {
      throw errors.notFound("Match");
    }

    const tournament = await ctx.db.get("tournaments", match.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Check user's access (owner, scorer, or temp scorer can undo)
    const hasAccess = await canScoreTournament(ctx, tournament, userId, args.tempScorerToken);
    if (!hasAccess) {
      throw errors.unauthorized();
    }

    // Allow undo on both "live" and "completed" matches (to undo the match-ending point)
    if (match.status !== "live" && match.status !== "completed") {
      throw errors.invalidState("Match must be live or completed to undo a point");
    }

    if (!match.tennisState) {
      throw errors.invalidState("Tennis state not initialized");
    }

    const history = match.tennisState.history;
    if (!history || history.length === 0) {
      const hasNoProgress =
        match.tennisState.sets.length === 0 &&
        (match.tennisState.currentSetGames[0] ?? 0) === 0 &&
        (match.tennisState.currentSetGames[1] ?? 0) === 0 &&
        (match.tennisState.currentGamePoints[0] ?? 0) === 0 &&
        (match.tennisState.currentGamePoints[1] ?? 0) === 0 &&
        (match.tennisState.tiebreakPoints[0] ?? 0) === 0 &&
        (match.tennisState.tiebreakPoints[1] ?? 0) === 0 &&
        !match.tennisState.isMatchComplete;
      if (hasNoProgress) {
        return null;
      }
      throw errors.invalidState("No history available to undo");
    }

    // Get the previous state from history
    const previousSnapshot = history[history.length - 1]!;
    const newHistory = history.slice(0, -1);

    // Restore the previous state
    const restoredState: TennisState = {
      ...match.tennisState,
      sets: previousSnapshot.sets,
      currentSetGames: previousSnapshot.currentSetGames,
      currentGamePoints: previousSnapshot.currentGamePoints,
      servingParticipant: previousSnapshot.servingParticipant,
      firstServerOfSet: previousSnapshot.firstServerOfSet,
      isTiebreak: previousSnapshot.isTiebreak,
      tiebreakPoints: previousSnapshot.tiebreakPoints,
      tiebreakTarget: previousSnapshot.tiebreakTarget ?? match.tennisState.tiebreakTarget,
      tiebreakMode: previousSnapshot.tiebreakMode ?? match.tennisState.tiebreakMode,
      isMatchComplete: previousSnapshot.isMatchComplete,
      history: newHistory,
      // Restore stat fields from snapshot (fall back to current if snapshot doesn't have them)
      aces: previousSnapshot.aces ?? match.tennisState.aces,
      doubleFaults: previousSnapshot.doubleFaults ?? match.tennisState.doubleFaults,
      faultState: previousSnapshot.faultState ?? match.tennisState.faultState ?? 0,
    };

    // Calculate sets won for score display
    const p1Sets = restoredState.sets.filter((s) => (s[0] ?? 0) > (s[1] ?? 0)).length;
    const p2Sets = restoredState.sets.filter((s) => (s[1] ?? 0) > (s[0] ?? 0)).length;

    // Determine if we're undoing a match completion
    const isUndoingCompletion = match.status === "completed" && !previousSnapshot.isMatchComplete;

    if (isUndoingCompletion) {
      await assertCourtAvailableForLiveMatch(ctx, {
        tournamentId: match.tournamentId,
        court: match.court,
        excludeMatchId: match._id,
      });

      // Revert match status, winnerId, and completedAt
      await ctx.db.patch("matches", args.matchId, {
        tennisState: restoredState,
        participant1Score: p1Sets,
        participant2Score: p2Sets,
        status: "live",
        winnerId: undefined,
        completedAt: undefined,
      });

      // Reverse participant stats
      await reverseParticipantStats(ctx, match);

      // Reverse bracket advancement (remove participants from next match slots)
      await reverseBracketAdvancement(ctx, match);

      // If tournament was auto-completed, revert it back to active
      if (tournament.status === "completed") {
        await ctx.db.patch("tournaments", match.tournamentId, {
          status: "active",
          endDate: undefined,
        });
      }
    } else {
      await ctx.db.patch("matches", args.matchId, {
        tennisState: restoredState,
        participant1Score: p1Sets,
        participant2Score: p2Sets,
      });
    }

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
        const p1 = await ctx.db.get("tournamentParticipants", match.participant1Id);
        participant1Name = p1?.displayName;
      }
      if (match.participant2Id) {
        const p2 = await ctx.db.get("tournamentParticipants", match.participant2Id);
        participant2Name = p2?.displayName;
      }

      await ctx.scheduler.runAfter(0, internal.scoringLogs.logScoringAction, {
        tournamentId: match.tournamentId,
        matchId: args.matchId,
        action: "undo",
        actorId: userId ?? undefined,
        sport: "tennis",
        details: {},
        stateBefore: JSON.stringify(match.tennisState),
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

/**
 * Change the serving player (for corrections)
 */
export const setTennisServer = mutation({
  args: {
    matchId: v.id("matches"),
    servingParticipant: v.number(), // 1 or 2
    tempScorerToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const userId = user?._id ?? null;

    const match = await ctx.db.get("matches", args.matchId);
    if (!match) {
      throw errors.notFound("Match");
    }

    const tournament = await ctx.db.get("tournaments", match.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Check user's access (owner, scorer, or temp scorer can change server)
    const hasAccess = await canScoreTournament(ctx, tournament, userId, args.tempScorerToken);
    if (!hasAccess) {
      throw errors.unauthorized();
    }

    if (!match.tennisState) {
      throw errors.invalidState("Tennis state not initialized");
    }

    if (args.servingParticipant !== 1 && args.servingParticipant !== 2) {
      throw errors.invalidInput("Server must be 1 or 2");
    }

    const newState = {
      ...match.tennisState,
      servingParticipant: args.servingParticipant,
    };

    await ctx.db.patch("matches", args.matchId, {
      tennisState: newState,
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
        const p1 = await ctx.db.get("tournamentParticipants", match.participant1Id);
        participant1Name = p1?.displayName;
      }
      if (match.participant2Id) {
        const p2 = await ctx.db.get("tournamentParticipants", match.participant2Id);
        participant2Name = p2?.displayName;
      }

      await ctx.scheduler.runAfter(0, internal.scoringLogs.logScoringAction, {
        tournamentId: match.tournamentId,
        matchId: args.matchId,
        action: "set_server",
        actorId: userId ?? undefined,
        sport: "tennis",
        details: { servingParticipant: args.servingParticipant },
        stateBefore: JSON.stringify(match.tennisState),
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
