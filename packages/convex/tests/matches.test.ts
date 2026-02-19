import { describe, it, expect } from "vitest";
import { getTestContext } from "./testSetup";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

type TestCtx = ReturnType<typeof getTestContext>;

type MatchDetails = {
  _id: Id<"matches">;
  tournamentId: Id<"tournaments">;
  myRole: "owner" | "scorer" | "temp_scorer";
  sport: string;
  tournamentStatus: "draft" | "active" | "completed" | "cancelled";
  tennisConfig?: { isAdScoring: boolean; setsToWin: number };
  participant1?: { displayName: string; wins: number; losses: number };
  participant2?: { displayName: string; wins: number; losses: number };
};

// ============================================
// Helpers
// ============================================

async function setupUser(t: TestCtx, overrides: { name?: string; email?: string } = {}) {
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

async function setupTournamentWithMatch(
  t: TestCtx,
  userId: Id<"users">,
  overrides: {
    status?: "draft" | "active" | "completed" | "cancelled";
    matchStatus?: "pending" | "scheduled" | "live" | "completed" | "bye";
    format?: "single_elimination" | "double_elimination" | "round_robin";
  } = {}
) {
  return await t.run(async (ctx) => {
    const tournamentId = await ctx.db.insert("tournaments", {
      createdBy: userId,
      name: "Test Tournament",
      sport: "tennis",
      format: overrides.format ?? "single_elimination",
      participantType: "individual",
      maxParticipants: 8,
      status: overrides.status ?? "active",
      tennisConfig: { isAdScoring: true, setsToWin: 2 },
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
    const p2Id = await ctx.db.insert("tournamentParticipants", {
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
      status: overrides.matchStatus ?? "pending",
      bracketType: "winners",
    });
    return { tournamentId, bracketId, p1Id, p2Id, matchId };
  });
}

async function assignScorer(
  t: TestCtx,
  tournamentId: Id<"tournaments">,
  scorerId: Id<"users">,
  assignedBy: Id<"users">
) {
  await t.run(async (ctx) => {
    await ctx.db.insert("tournamentScorers", {
      tournamentId,
      userId: scorerId,
      assignedBy,
      assignedAt: Date.now(),
    });
  });
}

// ============================================
// listMatches
// ============================================

describe("listMatches", () => {
  it("returns empty array when unauthenticated and no temp scorer token", async () => {
    const t = getTestContext();
    const { userId } = await setupUser(t);
    const { tournamentId } = await setupTournamentWithMatch(t, userId);

    const result = await t.query(api.matches.listMatches, { tournamentId });
    expect(result).toEqual([]);
  });

  it("returns empty array when user has no access to tournament", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { asUser: asOther } = await setupUser(t, { name: "Other", email: "other@test.com" });
    const { tournamentId } = await setupTournamentWithMatch(t, ownerId);

    const result = await asOther.query(api.matches.listMatches, { tournamentId });
    expect(result).toEqual([]);
  });

  it("returns empty array for non-existent tournament", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    // Create and delete a tournament to get a valid-format but non-existent ID
    const deletedId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("tournaments", {
        createdBy: userId,
        name: "Temp",
        sport: "tennis",
        format: "single_elimination",
        participantType: "individual",
        maxParticipants: 8,
        status: "draft",
      });
      await ctx.db.delete(id);
      return id;
    });
    const result = await asUser.query(api.matches.listMatches, {
      tournamentId: deletedId,
    });
    expect(result).toEqual([]);
  });

  it("returns enriched matches with participant details for owner", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await setupTournamentWithMatch(t, userId);

    const result = await asUser.query(api.matches.listMatches, { tournamentId });
    expect(result).toHaveLength(1);
    expect(result[0]!.participant1).toBeDefined();
    expect(result[0]!.participant1!.displayName).toBe("Player 1");
    expect(result[0]!.participant1!.seed).toBe(1);
    expect(result[0]!.participant2).toBeDefined();
    expect(result[0]!.participant2!.displayName).toBe("Player 2");
    expect(result[0]!.participant2!.seed).toBe(2);
    expect(result[0]!.sport).toBe("tennis");
    expect(result[0]!.status).toBe("pending");
    expect(result[0]!.participant1Score).toBe(0);
    expect(result[0]!.participant2Score).toBe(0);
  });

  it("returns matches for assigned scorer", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { userId: scorerId, asUser: asScorer } = await setupUser(t, {
      name: "Scorer",
      email: "scorer@test.com",
    });
    const { tournamentId } = await setupTournamentWithMatch(t, ownerId);
    await assignScorer(t, tournamentId, scorerId, ownerId);

    const result = await asScorer.query(api.matches.listMatches, { tournamentId });
    expect(result).toHaveLength(1);
  });

  it("filters by bracketId", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await setupTournamentWithMatch(t, userId);

    // Create a second bracket with its own match
    const otherBracketId = await t.run(async (ctx) => {
      const bId = await ctx.db.insert("tournamentBrackets", {
        tournamentId,
        name: "Consolation",
        status: "active",
        displayOrder: 2,
        createdAt: Date.now(),
      });
      await ctx.db.insert("matches", {
        tournamentId,
        bracketId: bId,
        round: 1,
        matchNumber: 1,
        participant1Score: 0,
        participant2Score: 0,
        status: "pending",
        bracketType: "losers",
      });
      return bId;
    });

    const mainResult = await asUser.query(api.matches.listMatches, {
      tournamentId,
      bracketId,
    });
    expect(mainResult).toHaveLength(1);

    const consolationResult = await asUser.query(api.matches.listMatches, {
      tournamentId,
      bracketId: otherBracketId,
    });
    expect(consolationResult).toHaveLength(1);
  });

  it("filters by round", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId, p1Id, p2Id } = await setupTournamentWithMatch(t, userId);

    // Add a round 2 match
    await t.run(async (ctx) => {
      await ctx.db.insert("matches", {
        tournamentId,
        bracketId,
        round: 2,
        matchNumber: 1,
        participant1Id: p1Id,
        participant2Id: p2Id,
        participant1Score: 0,
        participant2Score: 0,
        status: "pending",
        bracketType: "winners",
      });
    });

    const round1 = await asUser.query(api.matches.listMatches, {
      tournamentId,
      round: 1,
    });
    expect(round1).toHaveLength(1);
    expect(round1[0]!.round).toBe(1);

    const round2 = await asUser.query(api.matches.listMatches, {
      tournamentId,
      round: 2,
    });
    expect(round2).toHaveLength(1);
    expect(round2[0]!.round).toBe(2);
  });

  it("filters by status", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await setupTournamentWithMatch(t, userId, {
      matchStatus: "live",
    });

    // Add a pending match
    await t.run(async (ctx) => {
      await ctx.db.insert("matches", {
        tournamentId,
        bracketId,
        round: 2,
        matchNumber: 1,
        participant1Score: 0,
        participant2Score: 0,
        status: "pending",
        bracketType: "winners",
      });
    });

    const liveMatches = await asUser.query(api.matches.listMatches, {
      tournamentId,
      status: "live",
    });
    expect(liveMatches).toHaveLength(1);
    expect(liveMatches[0]!.status).toBe("live");

    const pendingMatches = await asUser.query(api.matches.listMatches, {
      tournamentId,
      status: "pending",
    });
    expect(pendingMatches).toHaveLength(1);
    expect(pendingMatches[0]!.status).toBe("pending");
  });

  it("filters by bracketType", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await setupTournamentWithMatch(t, userId);

    // Add a losers bracket match
    await t.run(async (ctx) => {
      await ctx.db.insert("matches", {
        tournamentId,
        bracketId,
        round: 1,
        matchNumber: 2,
        participant1Score: 0,
        participant2Score: 0,
        status: "pending",
        bracketType: "losers",
      });
    });

    const winnersMatches = await asUser.query(api.matches.listMatches, {
      tournamentId,
      bracketType: "winners",
    });
    expect(winnersMatches).toHaveLength(1);
    expect(winnersMatches[0]!.bracketType).toBe("winners");

    const losersMatches = await asUser.query(api.matches.listMatches, {
      tournamentId,
      bracketType: "losers",
    });
    expect(losersMatches).toHaveLength(1);
    expect(losersMatches[0]!.bracketType).toBe("losers");
  });

  it("sorts by round then matchNumber", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId, p1Id, p2Id } = await setupTournamentWithMatch(t, userId);

    // Add more matches in different order
    await t.run(async (ctx) => {
      await ctx.db.insert("matches", {
        tournamentId,
        bracketId,
        round: 2,
        matchNumber: 1,
        participant1Score: 0,
        participant2Score: 0,
        status: "pending",
        bracketType: "winners",
      });
      await ctx.db.insert("matches", {
        tournamentId,
        bracketId,
        round: 1,
        matchNumber: 2,
        participant1Id: p1Id,
        participant2Id: p2Id,
        participant1Score: 0,
        participant2Score: 0,
        status: "pending",
        bracketType: "winners",
      });
    });

    const result = await asUser.query(api.matches.listMatches, { tournamentId });
    expect(result).toHaveLength(3);
    expect(result[0]!.round).toBe(1);
    expect(result[0]!.matchNumber).toBe(1);
    expect(result[1]!.round).toBe(1);
    expect(result[1]!.matchNumber).toBe(2);
    expect(result[2]!.round).toBe(2);
    expect(result[2]!.matchNumber).toBe(1);
  });

  it("filters by bracketId and round combined", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await setupTournamentWithMatch(t, userId);

    // Add a round 2 match in same bracket
    await t.run(async (ctx) => {
      await ctx.db.insert("matches", {
        tournamentId,
        bracketId,
        round: 2,
        matchNumber: 1,
        participant1Score: 0,
        participant2Score: 0,
        status: "pending",
        bracketType: "winners",
      });
    });

    const result = await asUser.query(api.matches.listMatches, {
      tournamentId,
      bracketId,
      round: 1,
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.round).toBe(1);
  });

  it("filters by bracketId and status combined", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await setupTournamentWithMatch(t, userId, {
      matchStatus: "live",
    });

    // Add a pending match in same bracket
    await t.run(async (ctx) => {
      await ctx.db.insert("matches", {
        tournamentId,
        bracketId,
        round: 2,
        matchNumber: 1,
        participant1Score: 0,
        participant2Score: 0,
        status: "pending",
        bracketType: "winners",
      });
    });

    const result = await asUser.query(api.matches.listMatches, {
      tournamentId,
      bracketId,
      status: "live",
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.status).toBe("live");
  });
});

// ============================================
// getMatch
// ============================================

describe("getMatch", () => {
  it("returns null when unauthenticated", async () => {
    const t = getTestContext();
    const { userId } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId);

    const result = await t.query(api.matches.getMatch, { matchId });
    expect(result).toBeNull();
  });

  it("returns null for non-existent match", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    // Create and delete a match to get a valid-format but non-existent ID
    const { tournamentId, bracketId } = await setupTournamentWithMatch(t, userId);
    const deletedMatchId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("matches", {
        tournamentId,
        bracketId,
        round: 99,
        matchNumber: 99,
        status: "pending",
        participant1Score: 0,
        participant2Score: 0,
      });
      await ctx.db.delete(id);
      return id;
    });
    const result = await asUser.query(api.matches.getMatch, {
      matchId: deletedMatchId,
    });
    expect(result).toBeNull();
  });

  it("returns null when user has no access", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { asUser: asOther } = await setupUser(t, { name: "Other", email: "other@test.com" });
    const { matchId } = await setupTournamentWithMatch(t, ownerId);

    const result = await asOther.query(api.matches.getMatch, { matchId });
    expect(result).toBeNull();
  });

  it("returns match details with owner role", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId, tournamentId } = await setupTournamentWithMatch(t, userId);

    const result = await asUser.query(api.matches.getMatch, { matchId });
    if (!result) {
      throw new Error("Expected match result");
    }
    const matchDetails = result as MatchDetails;
    expect(matchDetails._id).toBe(matchId);
    expect(matchDetails.tournamentId).toBe(tournamentId);
    expect(matchDetails.myRole).toBe("owner");
    expect(matchDetails.sport).toBe("tennis");
    expect(matchDetails.tournamentStatus).toBe("active");
    expect(matchDetails.tennisConfig).toEqual({ isAdScoring: true, setsToWin: 2 });
    expect(matchDetails.participant1).toBeDefined();
    expect(matchDetails.participant1?.displayName).toBe("Player 1");
    expect(matchDetails.participant1?.wins).toBe(0);
    expect(matchDetails.participant1?.losses).toBe(0);
    expect(matchDetails.participant2).toBeDefined();
    expect(matchDetails.participant2?.displayName).toBe("Player 2");
  });

  it("returns match details with scorer role", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { userId: scorerId, asUser: asScorer } = await setupUser(t, {
      name: "Scorer",
      email: "scorer@test.com",
    });
    const { matchId, tournamentId } = await setupTournamentWithMatch(t, ownerId);
    await assignScorer(t, tournamentId, scorerId, ownerId);

    const result = await asScorer.query(api.matches.getMatch, { matchId });
    expect(result).not.toBeNull();
    expect(result!.myRole).toBe("scorer");
  });

  it("includes available courts from tournament", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);

    const data = await t.run(async (ctx) => {
      const tournamentId = await ctx.db.insert("tournaments", {
        createdBy: userId,
        name: "Court Tournament",
        sport: "tennis",
        format: "single_elimination",
        participantType: "individual",
        maxParticipants: 8,
        status: "active",
        tennisConfig: { isAdScoring: true, setsToWin: 2 },
        courts: ["Court 1", "Court 2", "Court 3"],
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
      const p2Id = await ctx.db.insert("tournamentParticipants", {
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
        status: "pending",
        bracketType: "winners",
      });
      return { matchId };
    });

    const result = await asUser.query(api.matches.getMatch, { matchId: data.matchId });
    expect(result).not.toBeNull();
    expect(result!.availableCourts).toEqual(["Court 1", "Court 2", "Court 3"]);
  });

  it("returns match with nextMatchId when set", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId, p1Id, p2Id } = await setupTournamentWithMatch(t, userId);

    const { matchId } = await t.run(async (ctx) => {
      const nextMatchId = await ctx.db.insert("matches", {
        tournamentId,
        bracketId,
        round: 2,
        matchNumber: 1,
        participant1Score: 0,
        participant2Score: 0,
        status: "pending",
        bracketType: "winners",
      });
      const mId = await ctx.db.insert("matches", {
        tournamentId,
        bracketId,
        round: 1,
        matchNumber: 3,
        participant1Id: p1Id,
        participant2Id: p2Id,
        participant1Score: 0,
        participant2Score: 0,
        status: "pending",
        bracketType: "winners",
        nextMatchId,
        nextMatchSlot: 1,
      });
      return { matchId: mId };
    });

    const result = await asUser.query(api.matches.getMatch, { matchId });
    expect(result).not.toBeNull();
    expect(result!.nextMatchId).toBeDefined();
  });
});

// ============================================
// listMyLiveMatches
// ============================================

describe("listMyLiveMatches", () => {
  it("returns empty array when unauthenticated", async () => {
    const t = getTestContext();
    const result = await t.query(api.matches.listMyLiveMatches);
    expect(result).toEqual([]);
  });

  it("returns empty array when user has no tournaments", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);
    const result = await asUser.query(api.matches.listMyLiveMatches);
    expect(result).toEqual([]);
  });

  it("returns live matches from owned tournaments", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await setupTournamentWithMatch(t, userId, { matchStatus: "live" });

    // Set startedAt on the match directly
    await t.run(async (ctx) => {
      const matches = await ctx.db
        .query("matches")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
        .collect();
      for (const m of matches) {
        await ctx.db.patch(m._id, { startedAt: Date.now() });
      }
    });

    const result = await asUser.query(api.matches.listMyLiveMatches);
    expect(result).toHaveLength(1);
    expect(result[0]!.tournamentName).toBe("Test Tournament");
    expect(result[0]!.status).toBe("live");
    expect(result[0]!.participant1).toBeDefined();
    expect(result[0]!.participant1!.displayName).toBe("Player 1");
    expect(result[0]!.participant2).toBeDefined();
    expect(result[0]!.participant2!.displayName).toBe("Player 2");
  });

  it("returns live matches from tournaments where user is scorer", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { userId: scorerId, asUser: asScorer } = await setupUser(t, {
      name: "Scorer",
      email: "scorer@test.com",
    });
    const { tournamentId } = await setupTournamentWithMatch(t, ownerId, { matchStatus: "live" });
    await assignScorer(t, tournamentId, scorerId, ownerId);

    const result = await asScorer.query(api.matches.listMyLiveMatches);
    expect(result).toHaveLength(1);
  });

  it("does not return pending matches", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    await setupTournamentWithMatch(t, userId, { matchStatus: "pending" });

    const result = await asUser.query(api.matches.listMyLiveMatches);
    expect(result).toEqual([]);
  });

  it("does not return matches from inactive tournaments", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    // Tournament is completed, not active
    await setupTournamentWithMatch(t, userId, {
      status: "completed",
      matchStatus: "live",
    });

    const result = await asUser.query(api.matches.listMyLiveMatches);
    expect(result).toEqual([]);
  });

  it("includes bracket name when match belongs to a bracket", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    await setupTournamentWithMatch(t, userId, { matchStatus: "live" });

    const result = await asUser.query(api.matches.listMyLiveMatches);
    expect(result).toHaveLength(1);
    expect(result[0]!.bracketName).toBe("Main Draw");
  });

  it("does not duplicate matches when user is both owner and scorer", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await setupTournamentWithMatch(t, userId, { matchStatus: "live" });
    // Also assign user as scorer of their own tournament
    await assignScorer(t, tournamentId, userId, userId);

    const result = await asUser.query(api.matches.listMyLiveMatches);
    // Should not duplicate because owned tournaments are processed first
    // and scorer assignments skip already-processed tournaments
    expect(result).toHaveLength(1);
  });
});

// ============================================
// createOneOffMatch
// ============================================

describe("createOneOffMatch", () => {
  it("creates a standalone match with ad-hoc participant names", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await setupTournamentWithMatch(t, userId);

    const matchId = await asUser.mutation(api.matches.createOneOffMatch, {
      tournamentId,
      participant1Name: "Serena Williams",
      participant2Name: "Coco Gauff",
    });

    const match = await t.run(async (ctx) => ctx.db.get(matchId));
    expect(match).not.toBeNull();
    expect(match!.round).toBe(0);
    expect(match!.bracketType).toBe("one_off");
    expect(match!.status).toBe("pending");

    const participant1 = await t.run(async (ctx) => ctx.db.get(match!.participant1Id!));
    const participant2 = await t.run(async (ctx) => ctx.db.get(match!.participant2Id!));
    expect(participant1!.displayName).toBe("Serena Williams");
    expect(participant2!.displayName).toBe("Coco Gauff");
  });

  it("only allows the tournament owner to create one-off matches", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { asUser: asOther } = await setupUser(t, { name: "Other", email: "other@test.com" });
    const { tournamentId } = await setupTournamentWithMatch(t, ownerId);

    await expect(
      asOther.mutation(api.matches.createOneOffMatch, {
        tournamentId,
        participant1Name: "Player A",
        participant2Name: "Player B",
      })
    ).rejects.toThrow("Only the tournament owner can create one-off matches");
  });

  it("requires the tournament to be active", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await setupTournamentWithMatch(t, userId, { status: "draft" });

    await expect(
      asUser.mutation(api.matches.createOneOffMatch, {
        tournamentId,
        participant1Name: "Player A",
        participant2Name: "Player B",
      })
    ).rejects.toThrow("Tournament must be active to create one-off matches");
  });

  it("requires both participant names", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await setupTournamentWithMatch(t, userId);

    await expect(
      asUser.mutation(api.matches.createOneOffMatch, {
        tournamentId,
        participant1Name: "Player A",
        participant2Name: "   ",
      })
    ).rejects.toThrow("Both participant names are required");
  });

  it("rejects a court not configured for the tournament", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);

    const tournamentId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournaments", {
        createdBy: userId,
        name: "Court Limited Tournament",
        sport: "tennis",
        format: "single_elimination",
        participantType: "individual",
        maxParticipants: 8,
        status: "active",
        tennisConfig: { isAdScoring: true, setsToWin: 2 },
        courts: ["Court 1", "Court 2"],
      });
    });

    await expect(
      asUser.mutation(api.matches.createOneOffMatch, {
        tournamentId,
        participant1Name: "Player A",
        participant2Name: "Player B",
        court: "Center Court",
      })
    ).rejects.toThrow("Selected court is not configured for this tournament");
  });
});

// ============================================
// updateScore
// ============================================

describe("updateScore", () => {
  it("throws when unauthenticated", async () => {
    const t = getTestContext();
    const { userId } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "live" });

    await expect(
      t.mutation(api.matches.updateScore, {
        matchId,
        participant1Score: 1,
        participant2Score: 0,
      })
    ).rejects.toThrow();
  });

  it("throws when user has no access", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { asUser: asOther } = await setupUser(t, { name: "Other", email: "other@test.com" });
    const { matchId } = await setupTournamentWithMatch(t, ownerId, { matchStatus: "live" });

    await expect(
      asOther.mutation(api.matches.updateScore, {
        matchId,
        participant1Score: 1,
        participant2Score: 0,
      })
    ).rejects.toThrow();
  });

  it("updates scores on a live match as owner", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "live" });

    await asUser.mutation(api.matches.updateScore, {
      matchId,
      participant1Score: 3,
      participant2Score: 1,
    });

    const match = await t.run(async (ctx) => ctx.db.get(matchId));
    expect(match!.participant1Score).toBe(3);
    expect(match!.participant2Score).toBe(1);
  });

  it("updates scores on a live match as scorer", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { userId: scorerId, asUser: asScorer } = await setupUser(t, {
      name: "Scorer",
      email: "scorer@test.com",
    });
    const { matchId, tournamentId } = await setupTournamentWithMatch(t, ownerId, {
      matchStatus: "live",
    });
    await assignScorer(t, tournamentId, scorerId, ownerId);

    await asScorer.mutation(api.matches.updateScore, {
      matchId,
      participant1Score: 2,
      participant2Score: 5,
    });

    const match = await t.run(async (ctx) => ctx.db.get(matchId));
    expect(match!.participant1Score).toBe(2);
    expect(match!.participant2Score).toBe(5);
  });

  it("allows score update on scheduled matches", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "scheduled" });

    await asUser.mutation(api.matches.updateScore, {
      matchId,
      participant1Score: 1,
      participant2Score: 0,
    });

    const match = await t.run(async (ctx) => ctx.db.get(matchId));
    expect(match!.participant1Score).toBe(1);
  });

  it("allows score update on pending matches", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "pending" });

    await asUser.mutation(api.matches.updateScore, {
      matchId,
      participant1Score: 1,
      participant2Score: 0,
    });

    const match = await t.run(async (ctx) => ctx.db.get(matchId));
    expect(match!.participant1Score).toBe(1);
  });

  it("rejects score update on completed matches", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "completed" });

    await expect(
      asUser.mutation(api.matches.updateScore, {
        matchId,
        participant1Score: 1,
        participant2Score: 0,
      })
    ).rejects.toThrow("Cannot update score");
  });

  it("rejects score update on bye matches", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "bye" });

    await expect(
      asUser.mutation(api.matches.updateScore, {
        matchId,
        participant1Score: 1,
        participant2Score: 0,
      })
    ).rejects.toThrow("Cannot update score");
  });

  it("rejects negative scores", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "live" });

    await expect(
      asUser.mutation(api.matches.updateScore, {
        matchId,
        participant1Score: -1,
        participant2Score: 0,
      })
    ).rejects.toThrow("Score must be between");
  });

  it("rejects scores above 999", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "live" });

    await expect(
      asUser.mutation(api.matches.updateScore, {
        matchId,
        participant1Score: 0,
        participant2Score: 1000,
      })
    ).rejects.toThrow("Score must be between");
  });

  it("rejects non-integer scores", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "live" });

    await expect(
      asUser.mutation(api.matches.updateScore, {
        matchId,
        participant1Score: 1.5,
        participant2Score: 0,
      })
    ).rejects.toThrow("Scores must be whole numbers");
  });

  it("allows zero scores", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "live" });

    await asUser.mutation(api.matches.updateScore, {
      matchId,
      participant1Score: 0,
      participant2Score: 0,
    });

    const match = await t.run(async (ctx) => ctx.db.get(matchId));
    expect(match!.participant1Score).toBe(0);
    expect(match!.participant2Score).toBe(0);
  });

  it("allows max score of 999", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "live" });

    await asUser.mutation(api.matches.updateScore, {
      matchId,
      participant1Score: 999,
      participant2Score: 999,
    });

    const match = await t.run(async (ctx) => ctx.db.get(matchId));
    expect(match!.participant1Score).toBe(999);
    expect(match!.participant2Score).toBe(999);
  });

  it("throws for non-existent match", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);

    await expect(
      asUser.mutation(api.matches.updateScore, {
        matchId: "invalid" as Id<"matches">,
        participant1Score: 1,
        participant2Score: 0,
      })
    ).rejects.toThrow();
  });
});

// ============================================
// startMatch
// ============================================

describe("startMatch", () => {
  it("throws when unauthenticated and no temp scorer token", async () => {
    const t = getTestContext();
    const { userId } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId);

    await expect(t.mutation(api.matches.startMatch, { matchId })).rejects.toThrow();
  });

  it("throws when user has no access", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { asUser: asOther } = await setupUser(t, { name: "Other", email: "other@test.com" });
    const { matchId } = await setupTournamentWithMatch(t, ownerId);

    await expect(asOther.mutation(api.matches.startMatch, { matchId })).rejects.toThrow();
  });

  it("starts a pending match as owner", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "pending" });

    await asUser.mutation(api.matches.startMatch, { matchId });

    const match = await t.run(async (ctx) => ctx.db.get(matchId));
    expect(match!.status).toBe("live");
    expect(match!.startedAt).toBeDefined();
    expect(match!.startedAt).toBeGreaterThan(0);
  });

  it("starts a scheduled match", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "scheduled" });

    await asUser.mutation(api.matches.startMatch, { matchId });

    const match = await t.run(async (ctx) => ctx.db.get(matchId));
    expect(match!.status).toBe("live");
  });

  it("starts a match as assigned scorer", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { userId: scorerId, asUser: asScorer } = await setupUser(t, {
      name: "Scorer",
      email: "scorer@test.com",
    });
    const { matchId, tournamentId } = await setupTournamentWithMatch(t, ownerId, {
      matchStatus: "pending",
    });
    await assignScorer(t, tournamentId, scorerId, ownerId);

    await asScorer.mutation(api.matches.startMatch, { matchId });

    const match = await t.run(async (ctx) => ctx.db.get(matchId));
    expect(match!.status).toBe("live");
  });

  it("rejects starting a match when another live match is on the same court", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId, matchId } = await setupTournamentWithMatch(t, userId, {
      matchStatus: "pending",
    });

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

    await expect(asUser.mutation(api.matches.startMatch, { matchId })).rejects.toThrow(
      "already has a live match"
    );
  });

  it("allows starting a match when a live match is on a different court", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId, matchId } = await setupTournamentWithMatch(t, userId, {
      matchStatus: "pending",
    });

    await t.run(async (ctx) => {
      await ctx.db.patch(matchId, { court: "Court 2" });

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

    await asUser.mutation(api.matches.startMatch, { matchId });
    const match = await t.run(async (ctx) => ctx.db.get(matchId));
    expect(match!.status).toBe("live");
  });

  it("rejects starting a live match", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "live" });

    await expect(asUser.mutation(api.matches.startMatch, { matchId })).rejects.toThrow(
      "Match cannot be started"
    );
  });

  it("rejects starting a completed match", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "completed" });

    await expect(asUser.mutation(api.matches.startMatch, { matchId })).rejects.toThrow(
      "Match cannot be started"
    );
  });

  it("rejects starting a bye match", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "bye" });

    await expect(asUser.mutation(api.matches.startMatch, { matchId })).rejects.toThrow(
      "Match cannot be started"
    );
  });

  it("requires tournament to be active", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, {
      status: "draft",
      matchStatus: "pending",
    });

    await expect(asUser.mutation(api.matches.startMatch, { matchId })).rejects.toThrow(
      "Tournament must be started"
    );
  });

  it("requires both participants to be assigned", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);

    // Create a match with only one participant
    const matchId = await t.run(async (ctx) => {
      const tournamentId = await ctx.db.insert("tournaments", {
        createdBy: userId,
        name: "Test Tournament",
        sport: "tennis",
        format: "single_elimination",
        participantType: "individual",
        maxParticipants: 8,
        status: "active",
        tennisConfig: { isAdScoring: true, setsToWin: 2 },
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
      return await ctx.db.insert("matches", {
        tournamentId,
        bracketId,
        round: 1,
        matchNumber: 1,
        participant1Id: p1Id,
        // participant2Id is not set
        participant1Score: 0,
        participant2Score: 0,
        status: "pending",
        bracketType: "winners",
      });
    });

    await expect(asUser.mutation(api.matches.startMatch, { matchId })).rejects.toThrow(
      "Both participants must be assigned"
    );
  });

  it("throws for non-existent match", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);

    await expect(
      asUser.mutation(api.matches.startMatch, { matchId: "invalid" as Id<"matches"> })
    ).rejects.toThrow();
  });
});

// ============================================
// completeMatch
// ============================================

describe("completeMatch", () => {
  it("throws when unauthenticated", async () => {
    const t = getTestContext();
    const { userId } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "live" });

    await expect(t.mutation(api.matches.completeMatch, { matchId })).rejects.toThrow();
  });

  it("throws when user has no access", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { asUser: asOther } = await setupUser(t, { name: "Other", email: "other@test.com" });
    const { matchId } = await setupTournamentWithMatch(t, ownerId, { matchStatus: "live" });

    await expect(asOther.mutation(api.matches.completeMatch, { matchId })).rejects.toThrow();
  });

  it("rejects completing a non-live match", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "pending" });

    await expect(asUser.mutation(api.matches.completeMatch, { matchId })).rejects.toThrow(
      "Match is not live"
    );
  });

  it("auto-determines winner from scores (p1 wins)", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId, p1Id, p2Id } = await setupTournamentWithMatch(t, userId, {
      matchStatus: "live",
    });

    // Set scores before completing
    await t.run(async (ctx) => {
      await ctx.db.patch(matchId, {
        participant1Score: 3,
        participant2Score: 1,
      });
    });

    await asUser.mutation(api.matches.completeMatch, { matchId });

    const match = await t.run(async (ctx) => ctx.db.get(matchId));
    expect(match!.status).toBe("completed");
    expect(match!.winnerId).toBe(p1Id);
    expect(match!.completedAt).toBeDefined();

    // Check participant stats updated
    const p1 = await t.run(async (ctx) => ctx.db.get(p1Id));
    expect(p1!.wins).toBe(1);
    expect(p1!.losses).toBe(0);
    expect(p1!.pointsFor).toBe(3);
    expect(p1!.pointsAgainst).toBe(1);

    const p2 = await t.run(async (ctx) => ctx.db.get(p2Id));
    expect(p2!.wins).toBe(0);
    expect(p2!.losses).toBe(1);
    expect(p2!.pointsFor).toBe(1);
    expect(p2!.pointsAgainst).toBe(3);
  });

  it("auto-determines winner from scores (p2 wins)", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId, p1Id, p2Id } = await setupTournamentWithMatch(t, userId, {
      matchStatus: "live",
    });

    await t.run(async (ctx) => {
      await ctx.db.patch(matchId, {
        participant1Score: 0,
        participant2Score: 2,
      });
    });

    await asUser.mutation(api.matches.completeMatch, { matchId });

    const match = await t.run(async (ctx) => ctx.db.get(matchId));
    expect(match!.winnerId).toBe(p2Id);

    const p1 = await t.run(async (ctx) => ctx.db.get(p1Id));
    expect(p1!.losses).toBe(1);
    const p2 = await t.run(async (ctx) => ctx.db.get(p2Id));
    expect(p2!.wins).toBe(1);
  });

  it("uses explicit winnerId when provided", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId, p1Id, p2Id } = await setupTournamentWithMatch(t, userId, {
      matchStatus: "live",
    });

    // Scores are tied but we explicitly set the winner
    await t.run(async (ctx) => {
      await ctx.db.patch(matchId, {
        participant1Score: 1,
        participant2Score: 1,
      });
    });

    await asUser.mutation(api.matches.completeMatch, { matchId, winnerId: p2Id });

    const match = await t.run(async (ctx) => ctx.db.get(matchId));
    expect(match!.winnerId).toBe(p2Id);

    const p1 = await t.run(async (ctx) => ctx.db.get(p1Id));
    expect(p1!.losses).toBe(1);
    expect(p1!.pointsFor).toBe(1);
    expect(p1!.pointsAgainst).toBe(1);

    const p2 = await t.run(async (ctx) => ctx.db.get(p2Id));
    expect(p2!.wins).toBe(1);
    expect(p2!.pointsFor).toBe(1);
    expect(p2!.pointsAgainst).toBe(1);
  });

  it("rejects tied score in elimination format without explicit winner", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, {
      matchStatus: "live",
      format: "single_elimination",
    });

    // Scores are tied
    await t.run(async (ctx) => {
      await ctx.db.patch(matchId, {
        participant1Score: 2,
        participant2Score: 2,
      });
    });

    await expect(asUser.mutation(api.matches.completeMatch, { matchId })).rejects.toThrow(
      "Cannot complete match with tied score in elimination format"
    );
  });

  it("allows tied score in round robin format (draw)", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId, p1Id, p2Id } = await setupTournamentWithMatch(t, userId, {
      matchStatus: "live",
      format: "round_robin",
    });

    // Scores are tied
    await t.run(async (ctx) => {
      await ctx.db.patch(matchId, {
        participant1Score: 2,
        participant2Score: 2,
      });
    });

    await asUser.mutation(api.matches.completeMatch, { matchId });

    const match = await t.run(async (ctx) => ctx.db.get(matchId));
    expect(match!.status).toBe("completed");
    expect(match!.winnerId).toBeUndefined();

    // Both should get a draw
    const p1 = await t.run(async (ctx) => ctx.db.get(p1Id));
    expect(p1!.draws).toBe(1);
    expect(p1!.wins).toBe(0);
    expect(p1!.losses).toBe(0);

    const p2 = await t.run(async (ctx) => ctx.db.get(p2Id));
    expect(p2!.draws).toBe(1);
    expect(p2!.wins).toBe(0);
    expect(p2!.losses).toBe(0);
  });

  it("advances winner to next match in slot 1", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId, p1Id, p2Id } = await setupTournamentWithMatch(t, userId, {
      matchStatus: "live",
    });

    // Create a next match and link it
    const { nextMatchId } = await t.run(async (ctx) => {
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
      // Get the first match and set up the link
      const matches = await ctx.db
        .query("matches")
        .withIndex("by_tournament_and_round", (q) =>
          q.eq("tournamentId", tournamentId).eq("round", 1)
        )
        .collect();
      const firstMatch = matches[0]!;
      await ctx.db.patch(firstMatch._id, {
        nextMatchId: nmId,
        nextMatchSlot: 1,
        participant1Score: 3,
        participant2Score: 1,
      });
      return { nextMatchId: nmId };
    });

    // Complete the first match
    const matches = await t.run(async (ctx) =>
      ctx.db
        .query("matches")
        .withIndex("by_tournament_and_round", (q) =>
          q.eq("tournamentId", tournamentId).eq("round", 1)
        )
        .collect()
    );
    const firstMatchId = matches[0]!._id;

    await asUser.mutation(api.matches.completeMatch, { matchId: firstMatchId });

    // Check that the winner was advanced to the next match slot 1
    const nextMatch = await t.run(async (ctx) => ctx.db.get(nextMatchId));
    expect(nextMatch!.participant1Id).toBe(p1Id);
  });

  it("advances winner to next match in slot 2", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId, p1Id, p2Id } = await setupTournamentWithMatch(t, userId, {
      matchStatus: "live",
    });

    const { nextMatchId } = await t.run(async (ctx) => {
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
      const matches = await ctx.db
        .query("matches")
        .withIndex("by_tournament_and_round", (q) =>
          q.eq("tournamentId", tournamentId).eq("round", 1)
        )
        .collect();
      const firstMatch = matches[0]!;
      await ctx.db.patch(firstMatch._id, {
        nextMatchId: nmId,
        nextMatchSlot: 2,
        participant1Score: 1,
        participant2Score: 3,
      });
      return { nextMatchId: nmId };
    });

    const matches = await t.run(async (ctx) =>
      ctx.db
        .query("matches")
        .withIndex("by_tournament_and_round", (q) =>
          q.eq("tournamentId", tournamentId).eq("round", 1)
        )
        .collect()
    );
    const firstMatchId = matches[0]!._id;

    await asUser.mutation(api.matches.completeMatch, { matchId: firstMatchId });

    const nextMatch = await t.run(async (ctx) => ctx.db.get(nextMatchId));
    expect(nextMatch!.participant2Id).toBe(p2Id);
  });

  it("sends loser to losers bracket in double elimination (slot 1)", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId, p1Id, p2Id } = await setupTournamentWithMatch(t, userId, {
      matchStatus: "live",
      format: "double_elimination",
    });

    const { loserMatchId } = await t.run(async (ctx) => {
      const lmId = await ctx.db.insert("matches", {
        tournamentId,
        bracketId,
        round: 1,
        matchNumber: 2,
        participant1Score: 0,
        participant2Score: 0,
        status: "pending",
        bracketType: "losers",
      });
      const matches = await ctx.db
        .query("matches")
        .withIndex("by_tournament_and_round", (q) =>
          q.eq("tournamentId", tournamentId).eq("round", 1)
        )
        .collect();
      const firstMatch = matches.find((m) => m.bracketType === "winners")!;
      await ctx.db.patch(firstMatch._id, {
        loserNextMatchId: lmId,
        loserNextMatchSlot: 1,
        participant1Score: 3,
        participant2Score: 1,
      });
      return { loserMatchId: lmId };
    });

    const matches = await t.run(async (ctx) =>
      ctx.db
        .query("matches")
        .withIndex("by_tournament_and_round", (q) =>
          q.eq("tournamentId", tournamentId).eq("round", 1)
        )
        .collect()
    );
    const winnersMatch = matches.find((m) => m.bracketType === "winners")!;

    await asUser.mutation(api.matches.completeMatch, { matchId: winnersMatch._id });

    // Loser (p2) should be in the losers bracket match slot 1
    const loserMatch = await t.run(async (ctx) => ctx.db.get(loserMatchId));
    expect(loserMatch!.participant1Id).toBe(p2Id);
  });

  it("sends loser to losers bracket in double elimination (slot 2)", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId, p1Id, p2Id } = await setupTournamentWithMatch(t, userId, {
      matchStatus: "live",
      format: "double_elimination",
    });

    const { loserMatchId } = await t.run(async (ctx) => {
      const lmId = await ctx.db.insert("matches", {
        tournamentId,
        bracketId,
        round: 1,
        matchNumber: 2,
        participant1Score: 0,
        participant2Score: 0,
        status: "pending",
        bracketType: "losers",
      });
      const matches = await ctx.db
        .query("matches")
        .withIndex("by_tournament_and_round", (q) =>
          q.eq("tournamentId", tournamentId).eq("round", 1)
        )
        .collect();
      const firstMatch = matches.find((m) => m.bracketType === "winners")!;
      await ctx.db.patch(firstMatch._id, {
        loserNextMatchId: lmId,
        loserNextMatchSlot: 2,
        participant1Score: 3,
        participant2Score: 1,
      });
      return { loserMatchId: lmId };
    });

    const matches = await t.run(async (ctx) =>
      ctx.db
        .query("matches")
        .withIndex("by_tournament_and_round", (q) =>
          q.eq("tournamentId", tournamentId).eq("round", 1)
        )
        .collect()
    );
    const winnersMatch = matches.find((m) => m.bracketType === "winners")!;

    await asUser.mutation(api.matches.completeMatch, { matchId: winnersMatch._id });

    const loserMatch = await t.run(async (ctx) => ctx.db.get(loserMatchId));
    expect(loserMatch!.participant2Id).toBe(p2Id);
  });

  it("completes tournament when last match is completed", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    // Only one match in the tournament, so completing it should complete the tournament
    const { matchId, tournamentId } = await setupTournamentWithMatch(t, userId, {
      matchStatus: "live",
    });

    await t.run(async (ctx) => {
      await ctx.db.patch(matchId, {
        participant1Score: 3,
        participant2Score: 1,
      });
    });

    await asUser.mutation(api.matches.completeMatch, { matchId });

    const tournament = await t.run(async (ctx) => ctx.db.get(tournamentId));
    expect(tournament!.status).toBe("completed");
    expect(tournament!.endDate).toBeDefined();
  });

  it("does not complete tournament when other matches remain", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId, tournamentId, bracketId } = await setupTournamentWithMatch(t, userId, {
      matchStatus: "live",
    });

    // Add another pending match
    await t.run(async (ctx) => {
      await ctx.db.insert("matches", {
        tournamentId,
        bracketId,
        round: 2,
        matchNumber: 1,
        participant1Score: 0,
        participant2Score: 0,
        status: "pending",
        bracketType: "winners",
      });
      await ctx.db.patch(matchId, {
        participant1Score: 3,
        participant2Score: 1,
      });
    });

    await asUser.mutation(api.matches.completeMatch, { matchId });

    const tournament = await t.run(async (ctx) => ctx.db.get(tournamentId));
    expect(tournament!.status).toBe("active");
  });

  it("does not complete tournament when live matches remain", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId, tournamentId, bracketId, p1Id, p2Id } = await setupTournamentWithMatch(
      t,
      userId,
      { matchStatus: "live" }
    );

    // Add another live match
    await t.run(async (ctx) => {
      await ctx.db.insert("matches", {
        tournamentId,
        bracketId,
        round: 1,
        matchNumber: 2,
        participant1Id: p1Id,
        participant2Id: p2Id,
        participant1Score: 0,
        participant2Score: 0,
        status: "live",
        bracketType: "winners",
      });
      await ctx.db.patch(matchId, {
        participant1Score: 3,
        participant2Score: 1,
      });
    });

    await asUser.mutation(api.matches.completeMatch, { matchId });

    const tournament = await t.run(async (ctx) => ctx.db.get(tournamentId));
    expect(tournament!.status).toBe("active");
  });

  it("completes match as scorer", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { userId: scorerId, asUser: asScorer } = await setupUser(t, {
      name: "Scorer",
      email: "scorer@test.com",
    });
    const { matchId, tournamentId } = await setupTournamentWithMatch(t, ownerId, {
      matchStatus: "live",
    });
    await assignScorer(t, tournamentId, scorerId, ownerId);

    await t.run(async (ctx) => {
      await ctx.db.patch(matchId, {
        participant1Score: 2,
        participant2Score: 0,
      });
    });

    await asScorer.mutation(api.matches.completeMatch, { matchId });

    const match = await t.run(async (ctx) => ctx.db.get(matchId));
    expect(match!.status).toBe("completed");
  });

  it("throws for non-existent match", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);

    await expect(
      asUser.mutation(api.matches.completeMatch, { matchId: "invalid" as Id<"matches"> })
    ).rejects.toThrow();
  });

  it("correctly accumulates stats across multiple matches", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId, p1Id, p2Id } = await setupTournamentWithMatch(t, userId, {
      matchStatus: "live",
    });

    // Set first match scores
    await t.run(async (ctx) => {
      const matches = await ctx.db
        .query("matches")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
        .collect();
      await ctx.db.patch(matches[0]!._id, {
        participant1Score: 3,
        participant2Score: 1,
      });
    });

    // Complete first match (p1 wins 3-1)
    const matches1 = await t.run(async (ctx) =>
      ctx.db
        .query("matches")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
        .collect()
    );
    await asUser.mutation(api.matches.completeMatch, { matchId: matches1[0]!._id });

    // Create and start second match between same players
    const match2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("matches", {
        tournamentId,
        bracketId,
        round: 2,
        matchNumber: 1,
        participant1Id: p1Id,
        participant2Id: p2Id,
        participant1Score: 1,
        participant2Score: 4,
        status: "live",
        bracketType: "winners",
      });
    });

    // Complete second match (p2 wins 4-1)
    await asUser.mutation(api.matches.completeMatch, { matchId: match2Id });

    const p1 = await t.run(async (ctx) => ctx.db.get(p1Id));
    expect(p1!.wins).toBe(1);
    expect(p1!.losses).toBe(1);
    expect(p1!.pointsFor).toBe(4); // 3 + 1
    expect(p1!.pointsAgainst).toBe(5); // 1 + 4

    const p2 = await t.run(async (ctx) => ctx.db.get(p2Id));
    expect(p2!.wins).toBe(1);
    expect(p2!.losses).toBe(1);
    expect(p2!.pointsFor).toBe(5); // 1 + 4
    expect(p2!.pointsAgainst).toBe(4); // 3 + 1
  });
});

// ============================================
// scheduleMatch
// ============================================

describe("scheduleMatch", () => {
  it("throws when unauthenticated", async () => {
    const t = getTestContext();
    const { userId } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId);

    await expect(
      t.mutation(api.matches.scheduleMatch, {
        matchId,
        scheduledTime: Date.now() + 3600000,
      })
    ).rejects.toThrow();
  });

  it("throws when not owner (scorer cannot schedule)", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { userId: scorerId, asUser: asScorer } = await setupUser(t, {
      name: "Scorer",
      email: "scorer@test.com",
    });
    const { matchId, tournamentId } = await setupTournamentWithMatch(t, ownerId);
    await assignScorer(t, tournamentId, scorerId, ownerId);

    await expect(
      asScorer.mutation(api.matches.scheduleMatch, {
        matchId,
        scheduledTime: Date.now() + 3600000,
      })
    ).rejects.toThrow();
  });

  it("throws for unauthorized user", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { asUser: asOther } = await setupUser(t, { name: "Other", email: "other@test.com" });
    const { matchId } = await setupTournamentWithMatch(t, ownerId);

    await expect(
      asOther.mutation(api.matches.scheduleMatch, {
        matchId,
        scheduledTime: Date.now() + 3600000,
      })
    ).rejects.toThrow();
  });

  it("schedules a pending match as owner", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "pending" });

    const scheduledTime = Date.now() + 3600000;
    await asUser.mutation(api.matches.scheduleMatch, {
      matchId,
      scheduledTime,
      court: "Court 1",
    });

    const match = await t.run(async (ctx) => ctx.db.get(matchId));
    expect(match!.status).toBe("scheduled");
    expect(match!.scheduledTime).toBe(scheduledTime);
    expect(match!.court).toBe("Court 1");
  });

  it("schedules without court", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "pending" });

    const scheduledTime = Date.now() + 3600000;
    await asUser.mutation(api.matches.scheduleMatch, { matchId, scheduledTime });

    const match = await t.run(async (ctx) => ctx.db.get(matchId));
    expect(match!.status).toBe("scheduled");
    expect(match!.scheduledTime).toBe(scheduledTime);
  });

  it("rejects scheduling a live match", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "live" });

    await expect(
      asUser.mutation(api.matches.scheduleMatch, {
        matchId,
        scheduledTime: Date.now() + 3600000,
      })
    ).rejects.toThrow("Match cannot be scheduled");
  });

  it("rejects scheduling a completed match", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "completed" });

    await expect(
      asUser.mutation(api.matches.scheduleMatch, {
        matchId,
        scheduledTime: Date.now() + 3600000,
      })
    ).rejects.toThrow("Match cannot be scheduled");
  });

  it("allows rescheduling a scheduled match", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "pending" });

    const initialTime = Date.now() + 3600000;
    const updatedTime = initialTime + 1800000;

    await asUser.mutation(api.matches.scheduleMatch, {
      matchId,
      scheduledTime: initialTime,
    });
    await asUser.mutation(api.matches.scheduleMatch, {
      matchId,
      scheduledTime: updatedTime,
    });

    const match = await t.run(async (ctx) => ctx.db.get(matchId));
    expect(match!.status).toBe("scheduled");
    expect(match!.scheduledTime).toBe(updatedTime);
  });

  it("throws for non-existent match", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);

    await expect(
      asUser.mutation(api.matches.scheduleMatch, {
        matchId: "invalid" as Id<"matches">,
        scheduledTime: Date.now() + 3600000,
      })
    ).rejects.toThrow();
  });
});

// ============================================
// updateMatchCourt
// ============================================

describe("updateMatchCourt", () => {
  it("throws when unauthenticated", async () => {
    const t = getTestContext();
    const { userId } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId);

    await expect(
      t.mutation(api.matches.updateMatchCourt, { matchId, court: "Court 1" })
    ).rejects.toThrow();
  });

  it("throws when not owner (scorer cannot update court)", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { userId: scorerId, asUser: asScorer } = await setupUser(t, {
      name: "Scorer",
      email: "scorer@test.com",
    });
    const { matchId, tournamentId } = await setupTournamentWithMatch(t, ownerId);
    await assignScorer(t, tournamentId, scorerId, ownerId);

    await expect(
      asScorer.mutation(api.matches.updateMatchCourt, { matchId, court: "Court 1" })
    ).rejects.toThrow();
  });

  it("throws for unauthorized user", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { asUser: asOther } = await setupUser(t, { name: "Other", email: "other@test.com" });
    const { matchId } = await setupTournamentWithMatch(t, ownerId);

    await expect(
      asOther.mutation(api.matches.updateMatchCourt, { matchId, court: "Court 1" })
    ).rejects.toThrow();
  });

  it("updates court on a pending match", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "pending" });

    await asUser.mutation(api.matches.updateMatchCourt, { matchId, court: "Court A" });

    const match = await t.run(async (ctx) => ctx.db.get(matchId));
    expect(match!.court).toBe("Court A");
  });

  it("updates court on a scheduled match", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "scheduled" });

    await asUser.mutation(api.matches.updateMatchCourt, { matchId, court: "Court B" });

    const match = await t.run(async (ctx) => ctx.db.get(matchId));
    expect(match!.court).toBe("Court B");
  });

  it("updates court on a live match", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "live" });

    await asUser.mutation(api.matches.updateMatchCourt, { matchId, court: "Court C" });

    const match = await t.run(async (ctx) => ctx.db.get(matchId));
    expect(match!.court).toBe("Court C");
  });

  it("clears court when court is undefined", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "pending" });

    // Set court first
    await asUser.mutation(api.matches.updateMatchCourt, { matchId, court: "Court A" });
    let match = await t.run(async (ctx) => ctx.db.get(matchId));
    expect(match!.court).toBe("Court A");

    // Clear court
    await asUser.mutation(api.matches.updateMatchCourt, { matchId });
    match = await t.run(async (ctx) => ctx.db.get(matchId));
    expect(match!.court).toBeUndefined();
  });

  it("rejects court update on completed matches", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "completed" });

    await expect(
      asUser.mutation(api.matches.updateMatchCourt, { matchId, court: "Court 1" })
    ).rejects.toThrow("Cannot update court for this match");
  });

  it("rejects court update on bye matches", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { matchId } = await setupTournamentWithMatch(t, userId, { matchStatus: "bye" });

    await expect(
      asUser.mutation(api.matches.updateMatchCourt, { matchId, court: "Court 1" })
    ).rejects.toThrow("Cannot update court for this match");
  });

  it("throws for non-existent match", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);

    await expect(
      asUser.mutation(api.matches.updateMatchCourt, {
        matchId: "invalid" as Id<"matches">,
        court: "Court 1",
      })
    ).rejects.toThrow();
  });
});
