import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { tennisState } from "./schema";

// ============================================
// Tennis Scoring Logic Helpers
// ============================================

type TennisState = {
  sets: number[][];
  currentSetGames: number[];
  currentGamePoints: number[];
  servingParticipant: number;
  firstServerOfSet: number;
  isAdScoring: boolean;
  setsToWin: number;
  isTiebreak: boolean;
  tiebreakPoints: number[];
  isMatchComplete: boolean;
};

/**
 * Convert numeric point value to tennis terminology
 */
export function pointToString(
  point: number,
  opponentPoint: number,
  isDeuce: boolean,
  isAdScoring: boolean
): string {
  if (isDeuce) {
    if (point === opponentPoint) return "40";
    if (point > opponentPoint) return isAdScoring ? "Ad" : "40";
    return "40";
  }

  const pointNames = ["0", "15", "30", "40"];
  return pointNames[Math.min(point, 3)] || "40";
}

/**
 * Check if game is at deuce
 */
function isDeuce(p1Points: number, p2Points: number): boolean {
  return p1Points >= 3 && p2Points >= 3;
}

/**
 * Process a point won in a regular game
 * Returns: { gameOver: boolean, winnerParticipant: 1 | 2 | null, newPoints: [number, number] }
 */
function processGamePoint(
  state: TennisState,
  winnerParticipant: 1 | 2
): { gameOver: boolean; gameWinner: 1 | 2 | null; newPoints: number[] } {
  const [p1Points, p2Points] = state.currentGamePoints;
  const winnerIdx = winnerParticipant - 1;
  const loserIdx = 1 - winnerIdx;

  const newPoints = [...state.currentGamePoints];
  newPoints[winnerIdx]++;

  // Check if deuce situation
  if (isDeuce(newPoints[0], newPoints[1])) {
    // At deuce or advantage situation
    if (state.isAdScoring) {
      // Ad scoring: need 2-point lead to win
      if (newPoints[winnerIdx] >= 4 && newPoints[winnerIdx] - newPoints[loserIdx] >= 2) {
        return { gameOver: true, gameWinner: winnerParticipant, newPoints: [0, 0] };
      }
      // If opponent had advantage and we scored, back to deuce (3-3)
      if (newPoints[loserIdx] >= 4) {
        return { gameOver: false, gameWinner: null, newPoints: [3, 3] };
      }
      return { gameOver: false, gameWinner: null, newPoints };
    } else {
      // No-Ad scoring: at deuce (3-3), next point wins
      if (newPoints[0] === 3 && newPoints[1] === 3) {
        // Just reached deuce, game continues to deciding point
        return { gameOver: false, gameWinner: null, newPoints };
      }
      // One player has 4, they win
      if (newPoints[winnerIdx] === 4) {
        return { gameOver: true, gameWinner: winnerParticipant, newPoints: [0, 0] };
      }
      return { gameOver: false, gameWinner: null, newPoints };
    }
  }

  // Regular game progression
  if (newPoints[winnerIdx] >= 4) {
    return { gameOver: true, gameWinner: winnerParticipant, newPoints: [0, 0] };
  }

  return { gameOver: false, gameWinner: null, newPoints };
}

/**
 * Process a point won in a tiebreak
 * Returns: { tiebreakOver: boolean, winner: 1 | 2 | null, newPoints: [number, number] }
 */
function processTiebreakPoint(
  state: TennisState,
  winnerParticipant: 1 | 2
): { tiebreakOver: boolean; tiebreakWinner: 1 | 2 | null; newPoints: number[] } {
  const newPoints = [...state.tiebreakPoints];
  newPoints[winnerParticipant - 1]++;

  const [p1, p2] = newPoints;
  // Tiebreak: first to 7 with 2-point lead
  if ((p1 >= 7 || p2 >= 7) && Math.abs(p1 - p2) >= 2) {
    const tiebreakWinner: 1 | 2 = p1 > p2 ? 1 : 2;
    return { tiebreakOver: true, tiebreakWinner, newPoints: [0, 0] };
  }

  return { tiebreakOver: false, tiebreakWinner: null, newPoints };
}

/**
 * Process a game won and update set state
 * Returns: { setOver: boolean, setWinner: 1 | 2 | null, newGames: [number, number], startTiebreak: boolean }
 */
function processSetGame(
  state: TennisState,
  gameWinner: 1 | 2
): { setOver: boolean; setWinner: 1 | 2 | null; newGames: number[]; startTiebreak: boolean } {
  const newGames = [...state.currentSetGames];
  newGames[gameWinner - 1]++;

  const [p1, p2] = newGames;

  // Check for tiebreak at 6-6
  if (p1 === 6 && p2 === 6) {
    return { setOver: false, setWinner: null, newGames, startTiebreak: true };
  }

  // Check for set win (first to 6 with 2-game lead, or 7-6 after tiebreak)
  if ((p1 >= 6 || p2 >= 6) && Math.abs(p1 - p2) >= 2) {
    const setWinner: 1 | 2 = p1 > p2 ? 1 : 2;
    return { setOver: true, setWinner, newGames: [0, 0], startTiebreak: false };
  }

  return { setOver: false, setWinner: null, newGames, startTiebreak: false };
}

/**
 * Process a set won and check for match completion
 */
function processMatchSet(
  state: TennisState,
  setWinner: 1 | 2,
  setScore: number[]
): { matchOver: boolean; matchWinner: 1 | 2 | null; newSets: number[][] } {
  const newSets = [...state.sets, setScore];

  // Count sets won by each player
  let p1Sets = 0;
  let p2Sets = 0;
  for (const set of newSets) {
    if (set[0] > set[1]) p1Sets++;
    else p2Sets++;
  }

  // Check for match win
  if (p1Sets >= state.setsToWin) {
    return { matchOver: true, matchWinner: 1, newSets };
  }
  if (p2Sets >= state.setsToWin) {
    return { matchOver: true, matchWinner: 2, newSets };
  }

  return { matchOver: false, matchWinner: null, newSets };
}

/**
 * Calculate next server after a game
 * In regular games: alternates every game
 * In tiebreak: alternates every 2 points (after first point)
 */
function getNextServer(state: TennisState, isTiebreakPoint: boolean = false): number {
  if (isTiebreakPoint) {
    // In tiebreak, server changes after first point, then every 2 points
    const totalPoints = state.tiebreakPoints[0] + state.tiebreakPoints[1];
    if (totalPoints === 0) return state.servingParticipant;
    // After first point, change server
    if (totalPoints === 1) return state.servingParticipant === 1 ? 2 : 1;
    // Then every 2 points
    const pointsSinceFirst = totalPoints - 1;
    const serverChanges = Math.floor(pointsSinceFirst / 2) + 1;
    const startServer = state.firstServerOfSet;
    return serverChanges % 2 === 0 ? startServer : (startServer === 1 ? 2 : 1);
  }

  // Regular game: alternate from previous server
  return state.servingParticipant === 1 ? 2 : 1;
}

// ============================================
// Queries
// ============================================

/**
 * Get tennis match state
 */
export const getTennisMatch = query({
  args: { matchId: v.id("matches") },
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
      myRole: v.union(
        v.literal("owner"),
        v.literal("admin"),
        v.literal("scorer")
      ),
      sport: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      return null;
    }

    const tournament = await ctx.db.get(match.tournamentId);
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
      tennisState: match.tennisState,
      myRole: membership.role,
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

    // Check user's role
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", tournament.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      throw new Error("Not authorized");
    }

    // Validate first server
    if (args.firstServer !== 1 && args.firstServer !== 2) {
      throw new Error("First server must be 1 or 2");
    }

    // Get tennis config from tournament
    if (!tournament.tennisConfig) {
      throw new Error("Tournament does not have tennis configuration. Please update the tournament settings.");
    }

    const { isAdScoring, setsToWin } = tournament.tennisConfig;

    // Initialize tennis state
    const tennisState: TennisState = {
      sets: [],
      currentSetGames: [0, 0],
      currentGamePoints: [0, 0],
      servingParticipant: args.firstServer,
      firstServerOfSet: args.firstServer,
      isAdScoring,
      setsToWin,
      isTiebreak: false,
      tiebreakPoints: [0, 0],
      isMatchComplete: false,
    };

    await ctx.db.patch(args.matchId, {
      tennisState,
      participant1Score: 0,
      participant2Score: 0,
    });

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

    // Check user's role
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", tournament.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      throw new Error("Not authorized");
    }

    if (match.status !== "live") {
      throw new Error("Match is not live");
    }

    if (!match.tennisState) {
      throw new Error("Tennis state not initialized");
    }

    if (match.tennisState.isMatchComplete) {
      throw new Error("Match is already complete");
    }

    const winner = args.winnerParticipant as 1 | 2;
    if (winner !== 1 && winner !== 2) {
      throw new Error("Winner must be 1 or 2");
    }

    let state: TennisState = { ...match.tennisState };

    // Process based on whether we're in a tiebreak or regular game
    if (state.isTiebreak) {
      const { tiebreakOver, tiebreakWinner, newPoints } = processTiebreakPoint(state, winner);

      if (tiebreakOver && tiebreakWinner) {
        // Tiebreak won - update games and check set
        const finalSetGames = [...state.currentSetGames];
        finalSetGames[tiebreakWinner - 1]++;

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

        if (matchOver) {
          state.isMatchComplete = true;
          // Update match winner and scores
          const winnerId = matchWinner === 1 ? match.participant1Id : match.participant2Id;
          const p1Sets = newSets.filter(s => s[0] > s[1]).length;
          const p2Sets = newSets.filter(s => s[1] > s[0]).length;

          await ctx.db.patch(args.matchId, {
            tennisState: state,
            participant1Score: p1Sets,
            participant2Score: p2Sets,
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
                pointsFor: p1.pointsFor + p1Sets,
                pointsAgainst: p1.pointsAgainst + p2Sets,
              });
            }
          }
          if (match.participant2Id) {
            const p2 = await ctx.db.get(match.participant2Id);
            if (p2) {
              await ctx.db.patch(match.participant2Id, {
                wins: p2.wins + (matchWinner === 2 ? 1 : 0),
                losses: p2.losses + (matchWinner === 1 ? 1 : 0),
                pointsFor: p2.pointsFor + p2Sets,
                pointsAgainst: p2.pointsAgainst + p1Sets,
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

          return null;
        } else {
          // New set starts - alternate first server
          state.firstServerOfSet = state.firstServerOfSet === 1 ? 2 : 1;
          state.servingParticipant = state.firstServerOfSet;
        }
      } else {
        // Tiebreak continues
        state.tiebreakPoints = newPoints;
        // Server changes: after first point, then every 2 points
        const totalPoints = newPoints[0] + newPoints[1];
        if (totalPoints > 0) {
          const pointsSinceFirst = totalPoints;
          if (pointsSinceFirst === 1 || (pointsSinceFirst > 1 && (pointsSinceFirst - 1) % 2 === 0)) {
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
          // Server for tiebreak is whoever would serve next in rotation
          state.servingParticipant = getNextServer(state);
        } else if (setOver && setWinner) {
          // Set won - check for match
          const { matchOver, matchWinner, newSets } = processMatchSet(
            state,
            setWinner,
            state.currentSetGames.map((g, i) => i === setWinner - 1 ? g + 1 : g)
          );

          state.sets = newSets;
          state.currentSetGames = [0, 0];
          state.currentGamePoints = [0, 0];

          if (matchOver && matchWinner) {
            state.isMatchComplete = true;
            const winnerId = matchWinner === 1 ? match.participant1Id : match.participant2Id;
            const p1Sets = newSets.filter(s => s[0] > s[1]).length;
            const p2Sets = newSets.filter(s => s[1] > s[0]).length;

            await ctx.db.patch(args.matchId, {
              tennisState: state,
              participant1Score: p1Sets,
              participant2Score: p2Sets,
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
                  pointsFor: p1.pointsFor + p1Sets,
                  pointsAgainst: p1.pointsAgainst + p2Sets,
                });
              }
            }
            if (match.participant2Id) {
              const p2 = await ctx.db.get(match.participant2Id);
              if (p2) {
                await ctx.db.patch(match.participant2Id, {
                  wins: p2.wins + (matchWinner === 2 ? 1 : 0),
                  losses: p2.losses + (matchWinner === 1 ? 1 : 0),
                  pointsFor: p2.pointsFor + p2Sets,
                  pointsAgainst: p2.pointsAgainst + p1Sets,
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

            return null;
          } else {
            // New set - alternate first server
            state.firstServerOfSet = state.firstServerOfSet === 1 ? 2 : 1;
            state.servingParticipant = state.firstServerOfSet;
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
    const p1Sets = state.sets.filter(s => s[0] > s[1]).length;
    const p2Sets = state.sets.filter(s => s[1] > s[0]).length;

    await ctx.db.patch(args.matchId, {
      tennisState: state,
      participant1Score: p1Sets,
      participant2Score: p2Sets,
    });

    return null;
  },
});

/**
 * Undo the last point scored (for corrections)
 * This is a simplified version - for a full undo system, you'd need to track point history
 */
export const undoTennisPoint = mutation({
  args: {
    matchId: v.id("matches"),
    // For undo, we need to know what state to restore to
    // In a real implementation, you'd store point history
    // For now, we'll just decrement points which may not be accurate for game/set boundaries
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

    // Check user's role (only admin/owner can undo)
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", tournament.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("Not authorized - only admins can undo points");
    }

    // For now, just notify that full undo is not implemented
    throw new Error("Point history undo not yet implemented. Use manual score adjustment.");
  },
});

/**
 * Change the serving player (for corrections)
 */
export const setTennisServer = mutation({
  args: {
    matchId: v.id("matches"),
    servingParticipant: v.number(), // 1 or 2
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

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", tournament.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      throw new Error("Not authorized");
    }

    if (!match.tennisState) {
      throw new Error("Tennis state not initialized");
    }

    if (args.servingParticipant !== 1 && args.servingParticipant !== 2) {
      throw new Error("Server must be 1 or 2");
    }

    await ctx.db.patch(args.matchId, {
      tennisState: {
        ...match.tennisState,
        servingParticipant: args.servingParticipant,
      },
    });

    return null;
  },
});
