import { describe, it, expect } from "vitest";
import { getTestContext } from "./testSetup";
import { api } from "../convex/_generated/api";

// ============================================
// Test Helpers
// ============================================

/**
 * Create a user and return the userId and an authenticated test client.
 */
async function setupUser(
  t: ReturnType<typeof getTestContext>,
  overrides: { name?: string; email?: string } = {}
) {
  const subject = `test|${overrides.email ?? "test@example.com"}|${Math.random().toString(36).slice(2)}`;
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      name: overrides.name ?? "Test User",
      email: overrides.email ?? "test@example.com",
      externalId: subject,
    });
  });
  const asUser = t.withIdentity({ subject });
  return { userId, asUser };
}

/**
 * Create a tournament with an active match ready for tennis scoring.
 * Returns all IDs and an authenticated test client for the tournament owner.
 */
async function setupTennisMatch(
  t: ReturnType<typeof getTestContext>,
  options: {
    isAdScoring?: boolean;
    setsToWin?: number;
    setTiebreakTarget?: number;
    finalSetTiebreakTarget?: number;
    useMatchTiebreak?: boolean;
    matchTiebreakTarget?: number;
    tournamentStatus?: "draft" | "active" | "completed" | "cancelled";
    matchStatus?: "pending" | "scheduled" | "live" | "completed" | "bye";
    omitParticipant2?: boolean;
    omitTennisConfig?: boolean;
    participantType?: "individual" | "doubles" | "team";
  } = {}
) {
  const subject = `test|tennis-owner|${Math.random().toString(36).slice(2)}`;
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      name: "Test User",
      email: "test@example.com",
      externalId: subject,
    });
  });
  const asUser = t.withIdentity({ subject });

  const data = await t.run(async (ctx) => {
    const tournamentId = await ctx.db.insert("tournaments", {
      createdBy: userId,
      name: "Tennis Tournament",
      sport: "tennis",
      format: "single_elimination",
      participantType: options.participantType ?? "individual",
      maxParticipants: 8,
      status: options.tournamentStatus ?? "active",
      tennisConfig: options.omitTennisConfig
        ? undefined
        : {
            isAdScoring: options.isAdScoring ?? true,
            setsToWin: options.setsToWin ?? 2,
            setTiebreakTarget: options.setTiebreakTarget,
            finalSetTiebreakTarget: options.finalSetTiebreakTarget,
            useMatchTiebreak: options.useMatchTiebreak,
            matchTiebreakTarget: options.matchTiebreakTarget,
          },
    });
    const bracketId = await ctx.db.insert("tournamentBrackets", {
      tournamentId,
      name: "Main Draw",
      status: "active",
      displayOrder: 1,
      createdAt: Date.now(),
    });
    const p1Id = await ctx.db.insert("tournamentParticipants", {
      tournamentId,
      bracketId,
      type: "individual",
      displayName: "Player 1",
      seed: 1,
      wins: 0,
      losses: 0,
      draws: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      createdAt: Date.now(),
    });
    const p2Id = options.omitParticipant2
      ? undefined
      : await ctx.db.insert("tournamentParticipants", {
          tournamentId,
          bracketId,
          type: "individual",
          displayName: "Player 2",
          seed: 2,
          wins: 0,
          losses: 0,
          draws: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          createdAt: Date.now(),
        });
    const matchId = await ctx.db.insert("matches", {
      tournamentId,
      bracketId,
      round: 1,
      matchNumber: 1,
      participant1Id: p1Id,
      participant2Id: p2Id,
      participant1Score: 0,
      participant2Score: 0,
      status: options.matchStatus ?? "live",
      startedAt: Date.now(),
      bracketType: "winners",
    });
    return { tournamentId, bracketId, p1Id, p2Id, matchId };
  });

  return { userId, asUser, ...data };
}

/**
 * Initialize a tennis match and return the setup data.
 * Convenience wrapper that calls initTennisMatch after setup.
 */
async function setupAndInitMatch(
  t: ReturnType<typeof getTestContext>,
  options: {
    isAdScoring?: boolean;
    setsToWin?: number;
    firstServer?: number;
    setTiebreakTarget?: number;
    finalSetTiebreakTarget?: number;
    useMatchTiebreak?: boolean;
    matchTiebreakTarget?: number;
    participantType?: "individual" | "doubles" | "team";
  } = {}
) {
  const setup = await setupTennisMatch(t, {
    isAdScoring: options.isAdScoring,
    setsToWin: options.setsToWin,
    setTiebreakTarget: options.setTiebreakTarget,
    finalSetTiebreakTarget: options.finalSetTiebreakTarget,
    useMatchTiebreak: options.useMatchTiebreak,
    matchTiebreakTarget: options.matchTiebreakTarget,
    participantType: options.participantType,
  });
  await setup.asUser.mutation(api.tennis.initTennisMatch, {
    matchId: setup.matchId,
    firstServer: options.firstServer ?? 1,
  });
  return setup;
}

/**
 * Score a sequence of points for one participant.
 * Used to quickly advance game state in tests.
 */
async function scorePoints(
  asUser: ReturnType<ReturnType<typeof getTestContext>["withIdentity"]>,
  matchId: any,
  winner: number,
  count: number
) {
  for (let i = 0; i < count; i++) {
    await asUser.mutation(api.tennis.scoreTennisPoint, {
      matchId,
      winnerParticipant: winner,
    });
  }
}

/**
 * Score a complete game for a participant (4 points: 0->15->30->40->game).
 * Assumes no deuce scenario (opponent has < 3 points in this game).
 */
async function scoreGame(
  asUser: ReturnType<ReturnType<typeof getTestContext>["withIdentity"]>,
  matchId: any,
  winner: number
) {
  await scorePoints(asUser, matchId, winner, 4);
}

/**
 * Score a complete set 6-0 for a participant (6 straight games).
 */
async function scoreSet6_0(
  asUser: ReturnType<ReturnType<typeof getTestContext>["withIdentity"]>,
  matchId: any,
  winner: number
) {
  for (let i = 0; i < 6; i++) {
    await scoreGame(asUser, matchId, winner);
  }
}

/**
 * Read the current tennis state from the database directly.
 */
async function getTennisState(t: ReturnType<typeof getTestContext>, matchId: any) {
  return await t.run(async (ctx) => {
    const match = await ctx.db.get(matchId);
    return match?.tennisState;
  });
}

/**
 * Read the full match document from the database.
 */
async function getMatch(t: ReturnType<typeof getTestContext>, matchId: any) {
  return await t.run(async (ctx) => {
    return await ctx.db.get(matchId);
  });
}

// ============================================
// Tests: getTennisMatch
// ============================================

describe("getTennisMatch", () => {
  it("returns null for non-existent match", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupTennisMatch(t);
    // Delete the match so the ID no longer resolves
    await t.run(async (ctx) => {
      await ctx.db.delete(matchId);
    });
    const result = await asUser.query(api.tennis.getTennisMatch, { matchId });
    expect(result).toBeNull();
  });

  it("returns null for unauthenticated user", async () => {
    const t = getTestContext();
    const { matchId } = await setupTennisMatch(t);
    // Query without identity
    const result = await t.query(api.tennis.getTennisMatch, { matchId });
    expect(result).toBeNull();
  });

  it("returns null for unauthorized user (not owner, scorer, or temp scorer)", async () => {
    const t = getTestContext();
    const { matchId } = await setupTennisMatch(t);
    // Create a different user who has no relation to the tournament
    const { asUser: otherUser } = await setupUser(t, {
      name: "Other User",
      email: "other@example.com",
    });
    const result = await otherUser.query(api.tennis.getTennisMatch, { matchId });
    expect(result).toBeNull();
  });

  it("returns match data with participant details for owner", async () => {
    const t = getTestContext();
    const { asUser, matchId, tournamentId, p1Id, p2Id } = await setupTennisMatch(t);
    const result = await asUser.query(api.tennis.getTennisMatch, { matchId });
    expect(result).not.toBeNull();
    expect(result!._id).toBe(matchId);
    expect(result!.tournamentId).toBe(tournamentId);
    expect(result!.round).toBe(1);
    expect(result!.matchNumber).toBe(1);
    expect(result!.status).toBe("live");
    expect(result!.sport).toBe("tennis");
    expect(result!.myRole).toBe("owner");
    expect(result!.participant1).toBeDefined();
    expect(result!.participant1!._id).toBe(p1Id);
    expect(result!.participant1!.displayName).toBe("Player 1");
    expect(result!.participant1!.seed).toBe(1);
    expect(result!.participant2).toBeDefined();
    expect(result!.participant2!._id).toBe(p2Id);
    expect(result!.participant2!.displayName).toBe("Player 2");
  });

  it("returns match with tennisState after initialization", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t);
    const result = await asUser.query(api.tennis.getTennisMatch, { matchId });
    expect(result).not.toBeNull();
    expect(result!.tennisState).toBeDefined();
    expect(result!.tennisState!.sets).toEqual([]);
    expect(result!.tennisState!.currentSetGames).toEqual([0, 0]);
    expect(result!.tennisState!.currentGamePoints).toEqual([0, 0]);
    expect(result!.tennisState!.servingParticipant).toBe(1);
  });

  it("returns match for assigned scorer with role=scorer", async () => {
    const t = getTestContext();
    const { matchId, tournamentId, userId } = await setupTennisMatch(t);
    // Create a scorer user and assign them
    const scorerSubject = `test|scorer@example.com|${Math.random().toString(36).slice(2)}`;
    const scorerUserId = await t.run(async (ctx) => {
      const sId = await ctx.db.insert("users", {
        name: "Scorer",
        email: "scorer@example.com",
        externalId: scorerSubject,
      });
      await ctx.db.insert("tournamentScorers", {
        tournamentId,
        userId: sId,
        assignedBy: userId,
        assignedAt: Date.now(),
      });
      return sId;
    });
    const asScorer = t.withIdentity({ subject: scorerSubject });
    const result = await asScorer.query(api.tennis.getTennisMatch, { matchId });
    expect(result).not.toBeNull();
    expect(result!.myRole).toBe("scorer");
  });
});

// ============================================
// Tests: initTennisMatch
// ============================================

describe("initTennisMatch", () => {
  it("initializes tennis state with correct config from tournament", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupTennisMatch(t, {
      isAdScoring: true,
      setsToWin: 3,
    });

    await asUser.mutation(api.tennis.initTennisMatch, {
      matchId,
      firstServer: 2,
    });

    const state = await getTennisState(t, matchId);
    expect(state).toBeDefined();
    expect(state!.sets).toEqual([]);
    expect(state!.currentSetGames).toEqual([0, 0]);
    expect(state!.currentGamePoints).toEqual([0, 0]);
    expect(state!.servingParticipant).toBe(2);
    expect(state!.firstServerOfSet).toBe(2);
    expect(state!.isAdScoring).toBe(true);
    expect(state!.setsToWin).toBe(3);
    expect(state!.isTiebreak).toBe(false);
    expect(state!.tiebreakPoints).toEqual([0, 0]);
    expect(state!.isMatchComplete).toBe(false);
  });

  it("resets scores to 0 on initialization", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupTennisMatch(t);

    // Pre-set some scores to verify they get reset
    await t.run(async (ctx) => {
      await ctx.db.patch(matchId, { participant1Score: 5, participant2Score: 3 });
    });

    await asUser.mutation(api.tennis.initTennisMatch, {
      matchId,
      firstServer: 1,
    });

    const match = await getMatch(t, matchId);
    expect(match!.participant1Score).toBe(0);
    expect(match!.participant2Score).toBe(0);
  });

  it("throws for invalid firstServer value (not 1 or 2)", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupTennisMatch(t);

    await expect(
      asUser.mutation(api.tennis.initTennisMatch, { matchId, firstServer: 3 })
    ).rejects.toThrow("First server must be 1 or 2");

    await expect(
      asUser.mutation(api.tennis.initTennisMatch, { matchId, firstServer: 0 })
    ).rejects.toThrow("First server must be 1 or 2");
  });

  it("throws when tournament is not active", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupTennisMatch(t, { tournamentStatus: "draft" });

    await expect(
      asUser.mutation(api.tennis.initTennisMatch, { matchId, firstServer: 1 })
    ).rejects.toThrow("Tournament must be started");
  });

  it("throws when tournament has no tennis config", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupTennisMatch(t, { omitTennisConfig: true });

    await expect(
      asUser.mutation(api.tennis.initTennisMatch, { matchId, firstServer: 1 })
    ).rejects.toThrow("tennis configuration");
  });

  it("throws when participant2 is not assigned", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupTennisMatch(t, { omitParticipant2: true });

    await expect(
      asUser.mutation(api.tennis.initTennisMatch, { matchId, firstServer: 1 })
    ).rejects.toThrow("Both participants must be assigned");
  });

  it("throws when user is not authorized", async () => {
    const t = getTestContext();
    const { matchId } = await setupTennisMatch(t);
    const { asUser: otherUser } = await setupUser(t, {
      name: "Other",
      email: "other@example.com",
    });

    await expect(
      otherUser.mutation(api.tennis.initTennisMatch, { matchId, firstServer: 1 })
    ).rejects.toThrow();
  });

  it("uses no-ad scoring config from tournament", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupTennisMatch(t, {
      isAdScoring: false,
      setsToWin: 2,
    });

    await asUser.mutation(api.tennis.initTennisMatch, { matchId, firstServer: 1 });

    const state = await getTennisState(t, matchId);
    expect(state!.isAdScoring).toBe(false);
    expect(state!.setsToWin).toBe(2);
  });
});

// ============================================
// Tests: scoreTennisPoint - Basic Game Flow
// ============================================

describe("scoreTennisPoint - basic game", () => {
  it("increments points: 0->15->30->40->game", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t);

    // Point 1: 15-0
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });
    let state = await getTennisState(t, matchId);
    expect(state!.currentGamePoints).toEqual([1, 0]);

    // Point 2: 30-0
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });
    state = await getTennisState(t, matchId);
    expect(state!.currentGamePoints).toEqual([2, 0]);

    // Point 3: 40-0
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });
    state = await getTennisState(t, matchId);
    expect(state!.currentGamePoints).toEqual([3, 0]);

    // Point 4: Game won -> set games update to 1-0
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });
    state = await getTennisState(t, matchId);
    expect(state!.currentGamePoints).toEqual([0, 0]);
    expect(state!.currentSetGames).toEqual([1, 0]);
  });

  it("tracks history for each scored point", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t);

    // Score one point
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });
    let state = await getTennisState(t, matchId);
    expect(state!.history).toBeDefined();
    expect(state!.history!.length).toBe(1);
    // The history should capture the state BEFORE the point was scored
    expect(state!.history![0]!.currentGamePoints).toEqual([0, 0]);

    // Score another point
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });
    state = await getTennisState(t, matchId);
    expect(state!.history!.length).toBe(2);
    expect(state!.history![1]!.currentGamePoints).toEqual([1, 0]);
  });

  it("alternates server after each game", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t, { firstServer: 1 });

    // Player 1 serves first game
    let state = await getTennisState(t, matchId);
    expect(state!.servingParticipant).toBe(1);

    // Win the game for player 1
    await scoreGame(asUser, matchId, 1);

    // Server should alternate to player 2
    state = await getTennisState(t, matchId);
    expect(state!.servingParticipant).toBe(2);

    // Win next game for player 2
    await scoreGame(asUser, matchId, 2);

    // Server should alternate back to player 1
    state = await getTennisState(t, matchId);
    expect(state!.servingParticipant).toBe(1);
  });

  it("throws when match is not live", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupTennisMatch(t, { matchStatus: "pending" });
    // Init needs live or pending - but scoreTennisPoint checks for live
    // We need to directly set tennis state on a pending match
    await t.run(async (ctx) => {
      await ctx.db.patch(matchId, {
        tennisState: {
          sets: [],
          currentSetGames: [0, 0],
          currentGamePoints: [0, 0],
          servingParticipant: 1,
          firstServerOfSet: 1,
          isAdScoring: true,
          setsToWin: 2,
          isTiebreak: false,
          tiebreakPoints: [0, 0],
          isMatchComplete: false,
        },
      });
    });

    await expect(
      asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 })
    ).rejects.toThrow("Match is not live");
  });

  it("throws when tennis state not initialized", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupTennisMatch(t);

    // Match is live but no tennisState set
    await expect(
      asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 })
    ).rejects.toThrow("Tennis state not initialized");
  });

  it("throws for invalid winnerParticipant", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t);

    await expect(
      asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 3 })
    ).rejects.toThrow("Winner must be 1 or 2");

    await expect(
      asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 0 })
    ).rejects.toThrow("Winner must be 1 or 2");
  });

  it("throws when match is already complete", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t);

    // Directly set match as complete
    await t.run(async (ctx) => {
      const match = await ctx.db.get(matchId);
      if (match?.tennisState) {
        await ctx.db.patch(matchId, {
          tennisState: { ...match.tennisState, isMatchComplete: true },
        });
      }
    });

    await expect(
      asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 })
    ).rejects.toThrow("Match is already complete");
  });

  it("throws when user is not authorized", async () => {
    const t = getTestContext();
    const { matchId } = await setupAndInitMatch(t);
    const { asUser: otherUser } = await setupUser(t, {
      name: "Other",
      email: "other@example.com",
    });

    await expect(
      otherUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 })
    ).rejects.toThrow();
  });
});

// ============================================
// Tests: scoreTennisPoint - Deuce & Advantage
// ============================================

describe("scoreTennisPoint - deuce and advantage (ad scoring)", () => {
  it("handles deuce at 40-40", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t, { isAdScoring: true });

    // Get to 40-40 (3-3 in internal points)
    await scorePoints(asUser, matchId, 1, 3); // 40-0
    await scorePoints(asUser, matchId, 2, 3); // 40-40 (deuce)

    const state = await getTennisState(t, matchId);
    expect(state!.currentGamePoints).toEqual([3, 3]);
  });

  it("handles advantage and winning from advantage", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t, { isAdScoring: true });

    // Get to deuce
    await scorePoints(asUser, matchId, 1, 3);
    await scorePoints(asUser, matchId, 2, 3);

    // Player 1 gets advantage
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });
    let state = await getTennisState(t, matchId);
    expect(state!.currentGamePoints).toEqual([4, 3]);

    // Player 1 wins from advantage
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });
    state = await getTennisState(t, matchId);
    // Game should be won, games should update
    expect(state!.currentGamePoints).toEqual([0, 0]);
    expect(state!.currentSetGames).toEqual([1, 0]);
  });

  it("returns to deuce when advantage is lost", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t, { isAdScoring: true });

    // Get to deuce
    await scorePoints(asUser, matchId, 1, 3);
    await scorePoints(asUser, matchId, 2, 3);

    // Player 1 gets advantage (4-3)
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });
    let state = await getTennisState(t, matchId);
    expect(state!.currentGamePoints).toEqual([4, 3]);

    // Player 2 wins point -> back to deuce (3-3)
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 2 });
    state = await getTennisState(t, matchId);
    expect(state!.currentGamePoints).toEqual([3, 3]);
  });

  it("handles multiple deuce cycles before game is won", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t, { isAdScoring: true });

    // Get to deuce
    await scorePoints(asUser, matchId, 1, 3);
    await scorePoints(asUser, matchId, 2, 3);

    // Cycle 1: P1 advantage -> back to deuce
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 2 });

    // Cycle 2: P2 advantage -> back to deuce
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 2 });
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });

    let state = await getTennisState(t, matchId);
    expect(state!.currentGamePoints).toEqual([3, 3]);

    // Finally P2 gets advantage and wins
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 2 });
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 2 });

    state = await getTennisState(t, matchId);
    expect(state!.currentGamePoints).toEqual([0, 0]);
    expect(state!.currentSetGames).toEqual([0, 1]);
  });
});

describe("scoreTennisPoint - no-ad scoring", () => {
  it("at deuce (40-40), next point wins the game", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t, { isAdScoring: false });

    // Get to 40-40 (3-3)
    await scorePoints(asUser, matchId, 1, 3);
    await scorePoints(asUser, matchId, 2, 3);

    let state = await getTennisState(t, matchId);
    expect(state!.currentGamePoints).toEqual([3, 3]);

    // Next point should win the game (no advantage)
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 2 });
    state = await getTennisState(t, matchId);
    expect(state!.currentGamePoints).toEqual([0, 0]);
    expect(state!.currentSetGames).toEqual([0, 1]);
  });
});

// ============================================
// Tests: scoreTennisPoint - Set Completion
// ============================================

describe("scoreTennisPoint - set completion", () => {
  it("completes a set at 6-0", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t);

    // Win 6 straight games for player 1
    await scoreSet6_0(asUser, matchId, 1);

    const state = await getTennisState(t, matchId);
    expect(state!.sets).toHaveLength(1);
    expect(state!.sets[0]).toEqual([6, 0]);
    expect(state!.currentSetGames).toEqual([0, 0]);
    expect(state!.currentGamePoints).toEqual([0, 0]);
  });

  it("keeps first server after even-numbered set", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t, { firstServer: 1 });

    // Win first set 6-0 for player 1
    await scoreSet6_0(asUser, matchId, 1);

    const state = await getTennisState(t, matchId);
    // After an even-numbered set, the same player serves first
    expect(state!.firstServerOfSet).toBe(1);
    expect(state!.servingParticipant).toBe(1);
  });

  it("alternates first server after odd-numbered set", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t, { firstServer: 1 });

    // Get to 6-6
    for (let i = 0; i < 6; i++) {
      await scoreGame(asUser, matchId, 1);
      await scoreGame(asUser, matchId, 2);
    }

    // Win tiebreak 7-0 for player 1
    for (let i = 0; i < 7; i++) {
      await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });
    }

    const state = await getTennisState(t, matchId);
    // After an odd-numbered set (7-6), the first server flips
    expect(state!.firstServerOfSet).toBe(2);
    expect(state!.servingParticipant).toBe(2);
  });

  it("does not win set at 5-5 (must reach 6-4 or tiebreak)", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t);

    // Get to 5-5
    for (let i = 0; i < 5; i++) {
      await scoreGame(asUser, matchId, 1);
      await scoreGame(asUser, matchId, 2);
    }

    const state = await getTennisState(t, matchId);
    expect(state!.currentSetGames).toEqual([5, 5]);
    expect(state!.sets).toHaveLength(0); // No sets completed
  });

  it("wins set at 7-5", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t);

    // Get to 5-5
    for (let i = 0; i < 5; i++) {
      await scoreGame(asUser, matchId, 1);
      await scoreGame(asUser, matchId, 2);
    }

    // 6-5
    await scoreGame(asUser, matchId, 1);
    let state = await getTennisState(t, matchId);
    expect(state!.currentSetGames).toEqual([6, 5]);

    // 7-5 -> set won
    await scoreGame(asUser, matchId, 1);
    state = await getTennisState(t, matchId);
    expect(state!.sets).toHaveLength(1);
    expect(state!.sets[0]).toEqual([7, 5]);
  });
});

// ============================================
// Tests: scoreTennisPoint - Tiebreak
// ============================================

describe("scoreTennisPoint - tiebreak", () => {
  it("enters tiebreak at 6-6", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t);

    // Get to 6-6
    for (let i = 0; i < 6; i++) {
      await scoreGame(asUser, matchId, 1);
      await scoreGame(asUser, matchId, 2);
    }

    const state = await getTennisState(t, matchId);
    expect(state!.currentSetGames).toEqual([6, 6]);
    expect(state!.isTiebreak).toBe(true);
    expect(state!.tiebreakPoints).toEqual([0, 0]);
  });

  it("completes tiebreak at 7-0 (first to 7, win by 2)", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t);

    // Get to 6-6 tiebreak
    for (let i = 0; i < 6; i++) {
      await scoreGame(asUser, matchId, 1);
      await scoreGame(asUser, matchId, 2);
    }

    // Win tiebreak 7-0 for player 1
    for (let i = 0; i < 7; i++) {
      await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });
    }

    const state = await getTennisState(t, matchId);
    expect(state!.isTiebreak).toBe(false);
    expect(state!.sets).toHaveLength(1);
    expect(state!.sets[0]).toEqual([7, 6]);
    expect(state!.currentSetGames).toEqual([0, 0]);
  });

  it("requires win by 2 in tiebreak (6-6 tiebreak continues)", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t);

    // Get to 6-6 tiebreak
    for (let i = 0; i < 6; i++) {
      await scoreGame(asUser, matchId, 1);
      await scoreGame(asUser, matchId, 2);
    }

    // Get to 6-6 in tiebreak points
    for (let i = 0; i < 6; i++) {
      await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });
      await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 2 });
    }

    let state = await getTennisState(t, matchId);
    expect(state!.tiebreakPoints).toEqual([6, 6]);
    expect(state!.isTiebreak).toBe(true);

    // 7-6 in tiebreak: not over yet (need win by 2)
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });
    state = await getTennisState(t, matchId);
    expect(state!.tiebreakPoints).toEqual([7, 6]);
    expect(state!.isTiebreak).toBe(true);

    // 7-7 in tiebreak: still going
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 2 });
    state = await getTennisState(t, matchId);
    expect(state!.tiebreakPoints).toEqual([7, 7]);
    expect(state!.isTiebreak).toBe(true);

    // 8-7: still going
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });
    state = await getTennisState(t, matchId);
    expect(state!.tiebreakPoints).toEqual([8, 7]);

    // 9-7: player 1 wins tiebreak (win by 2)
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });
    state = await getTennisState(t, matchId);
    expect(state!.isTiebreak).toBe(false);
    expect(state!.sets).toHaveLength(1);
    expect(state!.sets[0]).toEqual([7, 6]);
  });

  it("rotates server during tiebreak (after 1st point, then every 2)", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t, { firstServer: 1 });

    // Get to 6-6 tiebreak
    for (let i = 0; i < 6; i++) {
      await scoreGame(asUser, matchId, 1);
      await scoreGame(asUser, matchId, 2);
    }

    // At tiebreak start, we record the server assigned by getNextServer
    let state = await getTennisState(t, matchId);
    const tiebreakFirstServer = state!.servingParticipant;

    // After 1st tiebreak point: server changes
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });
    state = await getTennisState(t, matchId);
    expect(state!.servingParticipant).not.toBe(tiebreakFirstServer);

    // After 2nd point (total 2): no change (every 2 after the first)
    const serverAfterFirst = state!.servingParticipant;
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });
    state = await getTennisState(t, matchId);
    expect(state!.servingParticipant).toBe(serverAfterFirst);

    // After 3rd point (total 3): server changes
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });
    state = await getTennisState(t, matchId);
    expect(state!.servingParticipant).not.toBe(serverAfterFirst);
  });
});

// ============================================
// Tests: scoreTennisPoint - Match Completion
// ============================================

describe("scoreTennisPoint - match completion", () => {
  it("completes match when player wins 2 sets in best of 3", async () => {
    const t = getTestContext();
    const { asUser, matchId, p1Id } = await setupAndInitMatch(t, { setsToWin: 2 });

    // Win first set 6-0
    await scoreSet6_0(asUser, matchId, 1);

    let state = await getTennisState(t, matchId);
    expect(state!.sets).toHaveLength(1);
    expect(state!.isMatchComplete).toBe(false);

    // Win second set 6-0
    await scoreSet6_0(asUser, matchId, 1);

    state = await getTennisState(t, matchId);
    expect(state!.sets).toHaveLength(2);
    expect(state!.isMatchComplete).toBe(true);

    // Match should be marked completed
    const match = await getMatch(t, matchId);
    expect(match!.status).toBe("completed");
    expect(match!.winnerId).toBe(p1Id);
    expect(match!.participant1Score).toBe(2); // 2 sets won
    expect(match!.participant2Score).toBe(0);
    expect(match!.completedAt).toBeDefined();
  });

  it("completes match 2-1 in sets (player loses a set first)", async () => {
    const t = getTestContext();
    const { asUser, matchId, p1Id } = await setupAndInitMatch(t, { setsToWin: 2 });

    // Player 2 wins first set 6-0
    await scoreSet6_0(asUser, matchId, 2);

    let state = await getTennisState(t, matchId);
    expect(state!.sets).toHaveLength(1);
    expect(state!.sets[0]).toEqual([0, 6]);

    // Player 1 wins second set 6-0
    await scoreSet6_0(asUser, matchId, 1);

    state = await getTennisState(t, matchId);
    expect(state!.sets).toHaveLength(2);
    expect(state!.isMatchComplete).toBe(false);

    // Player 1 wins third set 6-0
    await scoreSet6_0(asUser, matchId, 1);

    state = await getTennisState(t, matchId);
    expect(state!.sets).toHaveLength(3);
    expect(state!.isMatchComplete).toBe(true);

    const match = await getMatch(t, matchId);
    expect(match!.status).toBe("completed");
    expect(match!.winnerId).toBe(p1Id);
    expect(match!.participant1Score).toBe(2);
    expect(match!.participant2Score).toBe(1);
  });

  it("player 2 can win the match", async () => {
    const t = getTestContext();
    const { asUser, matchId, p2Id } = await setupAndInitMatch(t, { setsToWin: 2 });

    // Player 2 wins two sets straight
    await scoreSet6_0(asUser, matchId, 2);
    await scoreSet6_0(asUser, matchId, 2);

    const match = await getMatch(t, matchId);
    expect(match!.status).toBe("completed");
    expect(match!.winnerId).toBe(p2Id);
    expect(match!.participant1Score).toBe(0);
    expect(match!.participant2Score).toBe(2);
  });

  it("updates participant win/loss stats on match completion", async () => {
    const t = getTestContext();
    const { asUser, matchId, p1Id, p2Id } = await setupAndInitMatch(t, { setsToWin: 2 });

    // Player 1 wins 2-0
    await scoreSet6_0(asUser, matchId, 1);
    await scoreSet6_0(asUser, matchId, 1);

    const p1 = await t.run(async (ctx) => ctx.db.get(p1Id!));
    const p2 = await t.run(async (ctx) => ctx.db.get(p2Id!));

    expect(p1!.wins).toBe(1);
    expect(p1!.losses).toBe(0);
    expect(p1!.pointsFor).toBe(2); // sets won
    expect(p1!.pointsAgainst).toBe(0);

    expect(p2!.wins).toBe(0);
    expect(p2!.losses).toBe(1);
    expect(p2!.pointsFor).toBe(0);
    expect(p2!.pointsAgainst).toBe(2);
  });

  it("advances bracket on match completion (winner to next match)", async () => {
    const t = getTestContext();
    const { asUser, matchId, p1Id, tournamentId, bracketId } = await setupAndInitMatch(t, {
      setsToWin: 2,
    });

    // Create a next match to advance into
    const nextMatchId = await t.run(async (ctx) => {
      const nmId = await ctx.db.insert("matches", {
        tournamentId,
        bracketId,
        round: 2,
        matchNumber: 1,
        participant1Score: 0,
        participant2Score: 0,
        status: "pending",
        bracketType: "winners",
      });
      // Link current match to next match in slot 1
      await ctx.db.patch(matchId, { nextMatchId: nmId, nextMatchSlot: 1 });
      return nmId;
    });

    // Player 1 wins the match
    await scoreSet6_0(asUser, matchId, 1);
    await scoreSet6_0(asUser, matchId, 1);

    // Verify winner was placed in next match
    const nextMatch = await getMatch(t, nextMatchId);
    expect(nextMatch!.participant1Id).toBe(p1Id);
  });

  it("completes match via tiebreak set win", async () => {
    const t = getTestContext();
    const { asUser, matchId, p1Id } = await setupAndInitMatch(t, { setsToWin: 2 });

    // Win first set 6-0
    await scoreSet6_0(asUser, matchId, 1);

    // Second set goes to 6-6 tiebreak
    for (let i = 0; i < 6; i++) {
      await scoreGame(asUser, matchId, 1);
      await scoreGame(asUser, matchId, 2);
    }

    // Win tiebreak 7-0 for player 1
    for (let i = 0; i < 7; i++) {
      await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });
    }

    const match = await getMatch(t, matchId);
    expect(match!.status).toBe("completed");
    expect(match!.winnerId).toBe(p1Id);
    expect(match!.participant1Score).toBe(2);
    expect(match!.participant2Score).toBe(0);

    const state = await getTennisState(t, matchId);
    expect(state!.isMatchComplete).toBe(true);
    expect(state!.sets).toHaveLength(2);
    expect(state!.sets[0]).toEqual([6, 0]);
    expect(state!.sets[1]).toEqual([7, 6]);
  });

  it("uses match tiebreak in doubles when sets are tied", async () => {
    const t = getTestContext();
    const { asUser, matchId, p1Id } = await setupAndInitMatch(t, {
      setsToWin: 2,
      participantType: "doubles",
    });

    // Split sets 1-1
    await scoreSet6_0(asUser, matchId, 1);
    await scoreSet6_0(asUser, matchId, 2);

    let state = await getTennisState(t, matchId);
    expect(state!.isTiebreak).toBe(true);
    expect(state!.tiebreakMode).toBe("match");
    expect(state!.tiebreakTarget).toBe(10);

    // Win match tiebreak 10-0 for player 1
    for (let i = 0; i < 10; i++) {
      await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });
    }

    const match = await getMatch(t, matchId);
    expect(match!.status).toBe("completed");
    expect(match!.winnerId).toBe(p1Id);
    expect(match!.participant1Score).toBe(2);
    expect(match!.participant2Score).toBe(1);

    state = await getTennisState(t, matchId);
    expect(state!.sets).toHaveLength(3);
    expect(state!.sets[2]).toEqual([10, 0]);
  });

  it("cannot score after match is complete", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t, { setsToWin: 2 });

    // Win the match
    await scoreSet6_0(asUser, matchId, 1);
    await scoreSet6_0(asUser, matchId, 1);

    // Attempting to score another point should fail
    await expect(
      asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 })
    ).rejects.toThrow();
  });
});

// ============================================
// Tests: scoreTennisPoint - Best of 5 (setsToWin=3)
// ============================================

describe("scoreTennisPoint - best of 5", () => {
  it("does not complete match after 2 sets won (need 3)", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t, { setsToWin: 3 });

    // Win 2 sets
    await scoreSet6_0(asUser, matchId, 1);
    await scoreSet6_0(asUser, matchId, 1);

    const state = await getTennisState(t, matchId);
    expect(state!.sets).toHaveLength(2);
    expect(state!.isMatchComplete).toBe(false);

    const match = await getMatch(t, matchId);
    expect(match!.status).toBe("live");
  });

  it("completes match after 3 sets won in best of 5", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t, { setsToWin: 3 });

    // Win 3 sets
    await scoreSet6_0(asUser, matchId, 1);
    await scoreSet6_0(asUser, matchId, 1);
    await scoreSet6_0(asUser, matchId, 1);

    const state = await getTennisState(t, matchId);
    expect(state!.isMatchComplete).toBe(true);

    const match = await getMatch(t, matchId);
    expect(match!.status).toBe("completed");
  });
});

// ============================================
// Tests: undoTennisPoint
// ============================================

describe("undoTennisPoint", () => {
  it("restores previous state from history", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t);

    // Score a point: 15-0
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });
    let state = await getTennisState(t, matchId);
    expect(state!.currentGamePoints).toEqual([1, 0]);

    // Undo the point
    await asUser.mutation(api.tennis.undoTennisPoint, { matchId });
    state = await getTennisState(t, matchId);
    expect(state!.currentGamePoints).toEqual([0, 0]);
  });

  it("restores server after undo", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t, { firstServer: 1 });

    // Win a game for player 1 (server switches to 2)
    await scoreGame(asUser, matchId, 1);
    let state = await getTennisState(t, matchId);
    expect(state!.servingParticipant).toBe(2);

    // Undo the last point (the winning point of the game)
    await asUser.mutation(api.tennis.undoTennisPoint, { matchId });
    state = await getTennisState(t, matchId);
    // Should restore to before the last point was scored (40-0, server 1)
    expect(state!.servingParticipant).toBe(1);
    expect(state!.currentGamePoints).toEqual([3, 0]);
    expect(state!.currentSetGames).toEqual([0, 0]);
  });

  it("can undo multiple times through history", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t);

    // Score 3 points
    await scorePoints(asUser, matchId, 1, 3);

    let state = await getTennisState(t, matchId);
    expect(state!.currentGamePoints).toEqual([3, 0]);
    expect(state!.history!.length).toBe(3);

    // Undo 3 times to get back to start
    await asUser.mutation(api.tennis.undoTennisPoint, { matchId });
    state = await getTennisState(t, matchId);
    expect(state!.currentGamePoints).toEqual([2, 0]);

    await asUser.mutation(api.tennis.undoTennisPoint, { matchId });
    state = await getTennisState(t, matchId);
    expect(state!.currentGamePoints).toEqual([1, 0]);

    await asUser.mutation(api.tennis.undoTennisPoint, { matchId });
    state = await getTennisState(t, matchId);
    expect(state!.currentGamePoints).toEqual([0, 0]);
  });

  it("returns null when no history is available and no scoring progress exists", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t);

    // No points scored, so no history
    await expect(asUser.mutation(api.tennis.undoTennisPoint, { matchId })).resolves.toBeNull();
  });

  it("throws when tennis state is not initialized", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupTennisMatch(t);

    await expect(asUser.mutation(api.tennis.undoTennisPoint, { matchId })).rejects.toThrow(
      "Tennis state not initialized"
    );
  });

  it("throws when user is not authorized", async () => {
    const t = getTestContext();
    const { matchId } = await setupAndInitMatch(t);
    const { asUser: otherUser } = await setupUser(t, {
      name: "Other",
      email: "other@example.com",
    });

    // Score a point so there is history
    // (use the original owner to score, then try to undo as other)
    // But we need the owner... let's set up differently
    await expect(otherUser.mutation(api.tennis.undoTennisPoint, { matchId })).rejects.toThrow();
  });

  it("updates scores to reflect restored state", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t, { setsToWin: 2 });

    // Win first set 6-0 for player 1
    await scoreSet6_0(asUser, matchId, 1);

    let match = await getMatch(t, matchId);
    expect(match!.participant1Score).toBe(1); // 1 set won

    // Score a point in second set
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });

    // Undo that point — score should still show 1 set for p1
    await asUser.mutation(api.tennis.undoTennisPoint, { matchId });
    match = await getMatch(t, matchId);
    expect(match!.participant1Score).toBe(1);
    expect(match!.participant2Score).toBe(0);
  });

  it("rejects undoing completion when the same court already has a live match", async () => {
    const t = getTestContext();
    const { asUser, tournamentId, bracketId, matchId } = await setupAndInitMatch(t);

    await scoreSet6_0(asUser, matchId, 1);
    await scoreSet6_0(asUser, matchId, 1);

    await t.run(async (ctx) => {
      await ctx.db.patch(matchId, { court: "Court 1" });

      const p3Id = await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Player 3",
        seed: 3,
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
      const p4Id = await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Player 4",
        seed: 4,
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });

      await ctx.db.insert("matches", {
        tournamentId,
        bracketId,
        round: 1,
        matchNumber: 2,
        participant1Id: p3Id,
        participant2Id: p4Id,
        participant1Score: 0,
        participant2Score: 0,
        status: "live",
        court: "Court 1",
        startedAt: Date.now(),
        bracketType: "winners",
      });
    });

    await expect(asUser.mutation(api.tennis.undoTennisPoint, { matchId })).rejects.toThrow(
      "already has a live match"
    );
  });

  it("restores tiebreak state on undo", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t);

    // Get to 6-6 tiebreak
    for (let i = 0; i < 6; i++) {
      await scoreGame(asUser, matchId, 1);
      await scoreGame(asUser, matchId, 2);
    }

    let state = await getTennisState(t, matchId);
    expect(state!.isTiebreak).toBe(true);

    // Score a tiebreak point
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });
    state = await getTennisState(t, matchId);
    expect(state!.tiebreakPoints[0]).toBe(1);

    // Undo
    await asUser.mutation(api.tennis.undoTennisPoint, { matchId });
    state = await getTennisState(t, matchId);
    expect(state!.isTiebreak).toBe(true);
    expect(state!.tiebreakPoints).toEqual([0, 0]);
  });
});

// ============================================
// Tests: setTennisServer
// ============================================

describe("setTennisServer", () => {
  it("changes serving participant to 2", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t, { firstServer: 1 });

    await asUser.mutation(api.tennis.setTennisServer, { matchId, servingParticipant: 2 });

    const state = await getTennisState(t, matchId);
    expect(state!.servingParticipant).toBe(2);
  });

  it("changes serving participant to 1", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t, { firstServer: 2 });

    await asUser.mutation(api.tennis.setTennisServer, { matchId, servingParticipant: 1 });

    const state = await getTennisState(t, matchId);
    expect(state!.servingParticipant).toBe(1);
  });

  it("throws for invalid servingParticipant value", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t);

    await expect(
      asUser.mutation(api.tennis.setTennisServer, { matchId, servingParticipant: 3 })
    ).rejects.toThrow("Server must be 1 or 2");

    await expect(
      asUser.mutation(api.tennis.setTennisServer, { matchId, servingParticipant: 0 })
    ).rejects.toThrow("Server must be 1 or 2");
  });

  it("throws when tennis state is not initialized", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupTennisMatch(t);

    await expect(
      asUser.mutation(api.tennis.setTennisServer, { matchId, servingParticipant: 1 })
    ).rejects.toThrow("Tennis state not initialized");
  });

  it("throws when user is not authorized", async () => {
    const t = getTestContext();
    const { matchId } = await setupAndInitMatch(t);
    const { asUser: otherUser } = await setupUser(t, {
      name: "Other",
      email: "other@example.com",
    });

    await expect(
      otherUser.mutation(api.tennis.setTennisServer, { matchId, servingParticipant: 1 })
    ).rejects.toThrow();
  });

  it("does not affect other tennis state fields", async () => {
    const t = getTestContext();
    const { asUser, matchId } = await setupAndInitMatch(t, { firstServer: 1 });

    // Score a point first to have some state
    await asUser.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });

    const stateBefore = await getTennisState(t, matchId);
    await asUser.mutation(api.tennis.setTennisServer, { matchId, servingParticipant: 2 });
    const stateAfter = await getTennisState(t, matchId);

    // Only servingParticipant should have changed
    expect(stateAfter!.servingParticipant).toBe(2);
    expect(stateAfter!.currentGamePoints).toEqual(stateBefore!.currentGamePoints);
    expect(stateAfter!.currentSetGames).toEqual(stateBefore!.currentSetGames);
    expect(stateAfter!.sets).toEqual(stateBefore!.sets);
    expect(stateAfter!.isAdScoring).toBe(stateBefore!.isAdScoring);
    expect(stateAfter!.setsToWin).toBe(stateBefore!.setsToWin);
    expect(stateAfter!.isTiebreak).toBe(stateBefore!.isTiebreak);
    expect(stateAfter!.isMatchComplete).toBe(stateBefore!.isMatchComplete);
  });
});

// ============================================
// Tests: Authorization (cross-cutting)
// ============================================

describe("authorization - assigned scorer can score", () => {
  it("assigned scorer can init, score, undo, and set server", async () => {
    const t = getTestContext();
    const { matchId, tournamentId, userId } = await setupTennisMatch(t);

    // Create a scorer and assign them to the tournament
    const scorerSubject = `test|scorer@example.com|${Math.random().toString(36).slice(2)}`;
    const scorerUserId = await t.run(async (ctx) => {
      const sId = await ctx.db.insert("users", {
        name: "Scorer",
        email: "scorer@example.com",
        externalId: scorerSubject,
      });
      await ctx.db.insert("tournamentScorers", {
        tournamentId,
        userId: sId,
        assignedBy: userId,
        assignedAt: Date.now(),
      });
      return sId;
    });
    const asScorer = t.withIdentity({ subject: scorerSubject });

    // Init match
    await asScorer.mutation(api.tennis.initTennisMatch, { matchId, firstServer: 1 });
    let state = await getTennisState(t, matchId);
    expect(state).toBeDefined();

    // Score a point
    await asScorer.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 });
    state = await getTennisState(t, matchId);
    expect(state!.currentGamePoints).toEqual([1, 0]);

    // Undo the point
    await asScorer.mutation(api.tennis.undoTennisPoint, { matchId });
    state = await getTennisState(t, matchId);
    expect(state!.currentGamePoints).toEqual([0, 0]);

    // Set server
    await asScorer.mutation(api.tennis.setTennisServer, { matchId, servingParticipant: 2 });
    state = await getTennisState(t, matchId);
    expect(state!.servingParticipant).toBe(2);
  });
});

describe("authorization - unauthenticated access denied", () => {
  it("unauthenticated user cannot init match", async () => {
    const t = getTestContext();
    const { matchId } = await setupTennisMatch(t);

    await expect(
      t.mutation(api.tennis.initTennisMatch, { matchId, firstServer: 1 })
    ).rejects.toThrow();
  });

  it("unauthenticated user cannot score point", async () => {
    const t = getTestContext();
    const { matchId } = await setupAndInitMatch(t);

    await expect(
      t.mutation(api.tennis.scoreTennisPoint, { matchId, winnerParticipant: 1 })
    ).rejects.toThrow();
  });

  it("unauthenticated user cannot undo point", async () => {
    const t = getTestContext();
    const { matchId } = await setupAndInitMatch(t);

    await expect(t.mutation(api.tennis.undoTennisPoint, { matchId })).rejects.toThrow();
  });

  it("unauthenticated user cannot set server", async () => {
    const t = getTestContext();
    const { matchId } = await setupAndInitMatch(t);

    await expect(
      t.mutation(api.tennis.setTennisServer, { matchId, servingParticipant: 1 })
    ).rejects.toThrow();
  });
});
