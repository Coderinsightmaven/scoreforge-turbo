import { describe, it, expect } from "vitest";
import { getTestContext } from "./testSetup";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

type TestCtx = ReturnType<typeof getTestContext>;

async function setupUser(t: TestCtx, overrides: { name?: string; email?: string } = {}) {
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      name: overrides.name ?? "Test User",
      email: overrides.email ?? "test@example.com",
    });
  });
  const asUser = t.withIdentity({ subject: `${userId}|session123` });
  return { userId, asUser };
}

async function createTournamentWithBracket(
  t: TestCtx,
  userId: Id<"users">,
  overrides: Partial<{
    name: string;
    format: "single_elimination" | "double_elimination" | "round_robin";
    status: "draft" | "active" | "completed" | "cancelled";
    participantType: "individual" | "doubles" | "team";
    maxParticipants: number;
    bracketMaxParticipants: number;
  }> = {}
) {
  return await t.run(async (ctx) => {
    const tournamentId = await ctx.db.insert("tournaments", {
      createdBy: userId,
      name: overrides.name ?? "Test Tournament",
      sport: "tennis",
      format: overrides.format ?? "single_elimination",
      participantType: overrides.participantType ?? "individual",
      maxParticipants: overrides.maxParticipants ?? 8,
      status: overrides.status ?? "draft",
      tennisConfig: { isAdScoring: true, setsToWin: 2 },
    });
    const bracketId = await ctx.db.insert("tournamentBrackets", {
      tournamentId,
      name: "Main Draw",
      status: overrides.status === "active" ? "active" : "draft",
      displayOrder: 1,
      createdAt: Date.now(),
      maxParticipants: overrides.bracketMaxParticipants ?? overrides.maxParticipants ?? 8,
    });
    return { tournamentId, bracketId };
  });
}

// ============================================
// listParticipants
// ============================================

describe("listParticipants", () => {
  it("throws when unauthenticated", async () => {
    const t = getTestContext();
    await expect(
      t.query(api.tournamentParticipants.listParticipants, {
        tournamentId: "fake" as Id<"tournaments">,
      })
    ).rejects.toThrow();
  });

  it("throws for non-existent tournament", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);
    await expect(
      asUser.query(api.tournamentParticipants.listParticipants, {
        tournamentId: "fake" as Id<"tournaments">,
      })
    ).rejects.toThrow();
  });

  it("throws for user without access", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { asUser: asOther } = await setupUser(t, { name: "Other", email: "other@test.com" });
    const { tournamentId } = await createTournamentWithBracket(t, ownerId);

    await expect(
      asOther.query(api.tournamentParticipants.listParticipants, { tournamentId })
    ).rejects.toThrow();
  });

  it("returns empty array when no participants exist", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournamentWithBracket(t, userId);

    const result = await asUser.query(api.tournamentParticipants.listParticipants, {
      tournamentId,
    });
    expect(result).toEqual([]);
  });

  it("returns participants for the tournament owner", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId);

    await t.run(async (ctx) => {
      await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Alice Smith",
        playerName: "Alice Smith",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
      await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Bob Jones",
        playerName: "Bob Jones",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    const result = await asUser.query(api.tournamentParticipants.listParticipants, {
      tournamentId,
    });
    expect(result).toHaveLength(2);
    expect(result[0]!.displayName).toBe("Alice Smith");
    expect(result[1]!.displayName).toBe("Bob Jones");
  });

  it("returns participants for assigned scorer", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { userId: scorerId, asUser: asScorer } = await setupUser(t, {
      name: "Scorer",
      email: "scorer@test.com",
    });
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, ownerId);

    await t.run(async (ctx) => {
      await ctx.db.insert("tournamentScorers", {
        tournamentId,
        userId: scorerId,
        assignedBy: ownerId,
        assignedAt: Date.now(),
      });
      await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Player 1",
        playerName: "Player 1",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    const result = await asScorer.query(api.tournamentParticipants.listParticipants, {
      tournamentId,
    });
    expect(result).toHaveLength(1);
  });

  it("filters by bracketId when provided", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId);

    // Create a second bracket
    const secondBracketId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentBrackets", {
        tournamentId,
        name: "Consolation",
        status: "draft",
        displayOrder: 2,
        createdAt: Date.now(),
        maxParticipants: 8,
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Main Player",
        playerName: "Main Player",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
      await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId: secondBracketId,
        type: "individual",
        displayName: "Consolation Player",
        playerName: "Consolation Player",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    const mainResults = await asUser.query(api.tournamentParticipants.listParticipants, {
      tournamentId,
      bracketId,
    });
    expect(mainResults).toHaveLength(1);
    expect(mainResults[0]!.displayName).toBe("Main Player");

    const consolationResults = await asUser.query(api.tournamentParticipants.listParticipants, {
      tournamentId,
      bracketId: secondBracketId,
    });
    expect(consolationResults).toHaveLength(1);
    expect(consolationResults[0]!.displayName).toBe("Consolation Player");
  });

  it("returns all participants when no bracketId is provided", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId);

    const secondBracketId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentBrackets", {
        tournamentId,
        name: "Consolation",
        status: "draft",
        displayOrder: 2,
        createdAt: Date.now(),
        maxParticipants: 8,
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Player A",
        playerName: "Player A",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
      await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId: secondBracketId,
        type: "individual",
        displayName: "Player B",
        playerName: "Player B",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    const result = await asUser.query(api.tournamentParticipants.listParticipants, {
      tournamentId,
    });
    expect(result).toHaveLength(2);
  });

  it("sorts by seed first, then creation time", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId);

    await t.run(async (ctx) => {
      // Created first, seed 3
      await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Third Seed",
        playerName: "Third Seed",
        seed: 3,
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: 1000,
      });
      // Created second, seed 1
      await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "First Seed",
        playerName: "First Seed",
        seed: 1,
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: 2000,
      });
      // Created third, no seed
      await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Unseeded",
        playerName: "Unseeded",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: 3000,
      });
    });

    const result = await asUser.query(api.tournamentParticipants.listParticipants, {
      tournamentId,
    });
    expect(result).toHaveLength(3);
    // Seeded first (sorted by seed number)
    expect(result[0]!.displayName).toBe("First Seed");
    expect(result[1]!.displayName).toBe("Third Seed");
    // Unseeded last
    expect(result[2]!.displayName).toBe("Unseeded");
  });
});

// ============================================
// getParticipant
// ============================================

describe("getParticipant", () => {
  it("returns null when unauthenticated", async () => {
    const t = getTestContext();
    const { userId } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId);
    // Create and delete a participant to get a valid-format ID
    const deletedId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Temp",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
      await ctx.db.delete(id);
      return id;
    });
    const result = await t.query(api.tournamentParticipants.getParticipant, {
      participantId: deletedId,
    });
    expect(result).toBeNull();
  });

  it("returns null for non-existent participant", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId);
    const deletedId = await t.run(async (ctx) => {
      const id = await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Temp",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
      await ctx.db.delete(id);
      return id;
    });
    const result = await asUser.query(api.tournamentParticipants.getParticipant, {
      participantId: deletedId,
    });
    expect(result).toBeNull();
  });

  it("returns null for user without tournament access", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { asUser: asOther } = await setupUser(t, { name: "Other", email: "other@test.com" });
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, ownerId);

    const participantId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Player 1",
        playerName: "Player 1",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    const result = await asOther.query(api.tournamentParticipants.getParticipant, {
      participantId,
    });
    expect(result).toBeNull();
  });

  it("returns participant for tournament owner", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId);

    const participantId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Alice Smith",
        playerName: "Alice Smith",
        seed: 1,
        wins: 2,
        losses: 1,
        draws: 0,
        pointsFor: 10,
        pointsAgainst: 5,
        createdAt: Date.now(),
      });
    });

    const result = await asUser.query(api.tournamentParticipants.getParticipant, {
      participantId,
    });
    expect(result).not.toBeNull();
    expect(result!._id).toBe(participantId);
    expect(result!.tournamentId).toBe(tournamentId);
    expect(result!.displayName).toBe("Alice Smith");
    expect(result!.playerName).toBe("Alice Smith");
    expect(result!.type).toBe("individual");
    expect(result!.seed).toBe(1);
    expect(result!.wins).toBe(2);
    expect(result!.losses).toBe(1);
  });

  it("returns participant for assigned scorer", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { userId: scorerId, asUser: asScorer } = await setupUser(t, {
      name: "Scorer",
      email: "scorer@test.com",
    });
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, ownerId);

    const participantId = await t.run(async (ctx) => {
      await ctx.db.insert("tournamentScorers", {
        tournamentId,
        userId: scorerId,
        assignedBy: ownerId,
        assignedAt: Date.now(),
      });
      return await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Player 1",
        playerName: "Player 1",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    const result = await asScorer.query(api.tournamentParticipants.getParticipant, {
      participantId,
    });
    expect(result).not.toBeNull();
    expect(result!.displayName).toBe("Player 1");
  });
});

// ============================================
// addParticipant
// ============================================

describe("addParticipant", () => {
  it("throws when unauthenticated", async () => {
    const t = getTestContext();
    await expect(
      t.mutation(api.tournamentParticipants.addParticipant, {
        tournamentId: "fake" as Id<"tournaments">,
        bracketId: "fake" as Id<"tournamentBrackets">,
        playerName: "Test",
      })
    ).rejects.toThrow();
  });

  it("throws for non-existent tournament", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);
    await expect(
      asUser.mutation(api.tournamentParticipants.addParticipant, {
        tournamentId: "fake" as Id<"tournaments">,
        bracketId: "fake" as Id<"tournamentBrackets">,
        playerName: "Test",
      })
    ).rejects.toThrow();
  });

  it("throws when non-owner tries to add participant", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { asUser: asOther } = await setupUser(t, { name: "Other", email: "other@test.com" });
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, ownerId);

    await expect(
      asOther.mutation(api.tournamentParticipants.addParticipant, {
        tournamentId,
        bracketId,
        playerName: "Intruder",
      })
    ).rejects.toThrow("Only the tournament owner");
  });

  it("throws when scorer (non-owner) tries to add participant", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { userId: scorerId, asUser: asScorer } = await setupUser(t, {
      name: "Scorer",
      email: "scorer@test.com",
    });
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, ownerId);

    await t.run(async (ctx) => {
      await ctx.db.insert("tournamentScorers", {
        tournamentId,
        userId: scorerId,
        assignedBy: ownerId,
        assignedAt: Date.now(),
      });
    });

    await expect(
      asScorer.mutation(api.tournamentParticipants.addParticipant, {
        tournamentId,
        bracketId,
        playerName: "New Player",
      })
    ).rejects.toThrow("Only the tournament owner");
  });

  it("throws when tournament is not in draft status", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId, {
      status: "active",
    });

    // Force bracket back to draft so we isolate the tournament status check
    await t.run(async (ctx) => {
      await ctx.db.patch(bracketId, { status: "draft" });
    });

    await expect(
      asUser.mutation(api.tournamentParticipants.addParticipant, {
        tournamentId,
        bracketId,
        playerName: "Late Entry",
      })
    ).rejects.toThrow("not in draft status");
  });

  it("throws when bracket is not in draft status", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId);

    // Force bracket to active while keeping tournament in draft
    await t.run(async (ctx) => {
      await ctx.db.patch(bracketId, { status: "active" });
    });

    await expect(
      asUser.mutation(api.tournamentParticipants.addParticipant, {
        tournamentId,
        bracketId,
        playerName: "Late Entry",
      })
    ).rejects.toThrow("not in draft status");
  });

  it("throws when bracket does not belong to tournament", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournamentWithBracket(t, userId);
    const { bracketId: otherBracketId } = await createTournamentWithBracket(t, userId, {
      name: "Other Tournament",
    });

    await expect(
      asUser.mutation(api.tournamentParticipants.addParticipant, {
        tournamentId,
        bracketId: otherBracketId,
        playerName: "Wrong Bracket",
      })
    ).rejects.toThrow("does not belong to this tournament");
  });

  // Individual participant type tests
  describe("individual participant type", () => {
    it("adds an individual participant with correct name capitalization", async () => {
      const t = getTestContext();
      const { userId, asUser } = await setupUser(t);
      const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId, {
        participantType: "individual",
      });

      const participantId = await asUser.mutation(api.tournamentParticipants.addParticipant, {
        tournamentId,
        bracketId,
        playerName: "john smith",
      });

      expect(participantId).toBeDefined();

      const participant = await t.run(async (ctx) => ctx.db.get(participantId));
      expect(participant).not.toBeNull();
      expect(participant!.type).toBe("individual");
      expect(participant!.displayName).toBe("John Smith");
      expect(participant!.playerName).toBe("John Smith");
      expect(participant!.wins).toBe(0);
      expect(participant!.losses).toBe(0);
      expect(participant!.draws).toBe(0);
      expect(participant!.pointsFor).toBe(0);
      expect(participant!.pointsAgainst).toBe(0);
      expect(participant!.bracketId).toBe(bracketId);
    });

    it("capitalizes hyphenated names", async () => {
      const t = getTestContext();
      const { userId, asUser } = await setupUser(t);
      const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId);

      const participantId = await asUser.mutation(api.tournamentParticipants.addParticipant, {
        tournamentId,
        bracketId,
        playerName: "mary-jane watson",
      });

      const participant = await t.run(async (ctx) => ctx.db.get(participantId));
      expect(participant!.displayName).toBe("Mary-Jane Watson");
      expect(participant!.playerName).toBe("Mary-Jane Watson");
    });

    it("capitalizes apostrophe names", async () => {
      const t = getTestContext();
      const { userId, asUser } = await setupUser(t);
      const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId);

      const participantId = await asUser.mutation(api.tournamentParticipants.addParticipant, {
        tournamentId,
        bracketId,
        playerName: "o'brien",
      });

      const participant = await t.run(async (ctx) => ctx.db.get(participantId));
      expect(participant!.displayName).toBe("O'Brien");
    });

    it("throws when playerName is missing for individual type", async () => {
      const t = getTestContext();
      const { userId, asUser } = await setupUser(t);
      const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId, {
        participantType: "individual",
      });

      await expect(
        asUser.mutation(api.tournamentParticipants.addParticipant, {
          tournamentId,
          bracketId,
        })
      ).rejects.toThrow("Player name is required");
    });

    it("throws when playerName is empty whitespace for individual type", async () => {
      const t = getTestContext();
      const { userId, asUser } = await setupUser(t);
      const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId, {
        participantType: "individual",
      });

      await expect(
        asUser.mutation(api.tournamentParticipants.addParticipant, {
          tournamentId,
          bracketId,
          playerName: "   ",
        })
      ).rejects.toThrow("Player name is required");
    });

    it("assigns seed when provided", async () => {
      const t = getTestContext();
      const { userId, asUser } = await setupUser(t);
      const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId);

      const participantId = await asUser.mutation(api.tournamentParticipants.addParticipant, {
        tournamentId,
        bracketId,
        playerName: "Seeded Player",
        seed: 1,
      });

      const participant = await t.run(async (ctx) => ctx.db.get(participantId));
      expect(participant!.seed).toBe(1);
    });
  });

  // Doubles participant type tests
  describe("doubles participant type", () => {
    it("adds a doubles participant with abbreviated display name", async () => {
      const t = getTestContext();
      const { userId, asUser } = await setupUser(t);
      const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId, {
        participantType: "doubles",
      });

      const participantId = await asUser.mutation(api.tournamentParticipants.addParticipant, {
        tournamentId,
        bracketId,
        player1Name: "joe berry",
        player2Name: "mark lorenz",
      });

      const participant = await t.run(async (ctx) => ctx.db.get(participantId));
      expect(participant!.type).toBe("doubles");
      expect(participant!.player1Name).toBe("Joe Berry");
      expect(participant!.player2Name).toBe("Mark Lorenz");
      expect(participant!.displayName).toBe("J. Berry / M. Lorenz");
    });

    it("throws when player1Name is missing for doubles type", async () => {
      const t = getTestContext();
      const { userId, asUser } = await setupUser(t);
      const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId, {
        participantType: "doubles",
      });

      await expect(
        asUser.mutation(api.tournamentParticipants.addParticipant, {
          tournamentId,
          bracketId,
          player2Name: "Jane Doe",
        })
      ).rejects.toThrow("Both player names are required");
    });

    it("throws when player2Name is missing for doubles type", async () => {
      const t = getTestContext();
      const { userId, asUser } = await setupUser(t);
      const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId, {
        participantType: "doubles",
      });

      await expect(
        asUser.mutation(api.tournamentParticipants.addParticipant, {
          tournamentId,
          bracketId,
          player1Name: "John Doe",
        })
      ).rejects.toThrow("Both player names are required");
    });

    it("throws when both player names are missing for doubles type", async () => {
      const t = getTestContext();
      const { userId, asUser } = await setupUser(t);
      const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId, {
        participantType: "doubles",
      });

      await expect(
        asUser.mutation(api.tournamentParticipants.addParticipant, {
          tournamentId,
          bracketId,
        })
      ).rejects.toThrow("Both player names are required");
    });

    it("handles single-name players in doubles", async () => {
      const t = getTestContext();
      const { userId, asUser } = await setupUser(t);
      const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId, {
        participantType: "doubles",
      });

      const participantId = await asUser.mutation(api.tournamentParticipants.addParticipant, {
        tournamentId,
        bracketId,
        player1Name: "serena",
        player2Name: "venus",
      });

      const participant = await t.run(async (ctx) => ctx.db.get(participantId));
      // Single name players should be returned as-is in abbreviation
      expect(participant!.player1Name).toBe("Serena");
      expect(participant!.player2Name).toBe("Venus");
      expect(participant!.displayName).toBe("Serena / Venus");
    });
  });

  // Team participant type tests
  describe("team participant type", () => {
    it("adds a team participant with capitalized name", async () => {
      const t = getTestContext();
      const { userId, asUser } = await setupUser(t);
      const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId, {
        participantType: "team",
      });

      const participantId = await asUser.mutation(api.tournamentParticipants.addParticipant, {
        tournamentId,
        bracketId,
        teamName: "the wildcats",
      });

      const participant = await t.run(async (ctx) => ctx.db.get(participantId));
      expect(participant!.type).toBe("team");
      expect(participant!.displayName).toBe("The Wildcats");
      expect(participant!.teamName).toBe("The Wildcats");
    });

    it("throws when teamName is missing for team type", async () => {
      const t = getTestContext();
      const { userId, asUser } = await setupUser(t);
      const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId, {
        participantType: "team",
      });

      await expect(
        asUser.mutation(api.tournamentParticipants.addParticipant, {
          tournamentId,
          bracketId,
        })
      ).rejects.toThrow("Team name is required");
    });

    it("throws when teamName is empty whitespace for team type", async () => {
      const t = getTestContext();
      const { userId, asUser } = await setupUser(t);
      const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId, {
        participantType: "team",
      });

      await expect(
        asUser.mutation(api.tournamentParticipants.addParticipant, {
          tournamentId,
          bracketId,
          teamName: "   ",
        })
      ).rejects.toThrow("Team name is required");
    });
  });

  // Bracket max participants enforcement
  describe("bracket max participants", () => {
    it("throws when bracket is full", async () => {
      const t = getTestContext();
      const { userId, asUser } = await setupUser(t);
      const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId, {
        bracketMaxParticipants: 2,
        maxParticipants: 2,
      });

      // Add 2 participants (filling the bracket)
      await asUser.mutation(api.tournamentParticipants.addParticipant, {
        tournamentId,
        bracketId,
        playerName: "Player One",
      });
      await asUser.mutation(api.tournamentParticipants.addParticipant, {
        tournamentId,
        bracketId,
        playerName: "Player Two",
      });

      // Third should fail
      await expect(
        asUser.mutation(api.tournamentParticipants.addParticipant, {
          tournamentId,
          bracketId,
          playerName: "Player Three",
        })
      ).rejects.toThrow("Bracket is full");
    });
  });

  // Bracket participantType override
  describe("bracket participantType override", () => {
    it("uses bracket participantType when set, overriding tournament", async () => {
      const t = getTestContext();
      const { userId, asUser } = await setupUser(t);
      // Tournament is individual, but we'll set bracket to doubles
      const { tournamentId } = await createTournamentWithBracket(t, userId, {
        participantType: "individual",
      });

      // Create a bracket with doubles override
      const doublesBracketId = await t.run(async (ctx) => {
        return await ctx.db.insert("tournamentBrackets", {
          tournamentId,
          name: "Doubles Draw",
          status: "draft",
          displayOrder: 2,
          createdAt: Date.now(),
          maxParticipants: 8,
          participantType: "doubles",
        });
      });

      const participantId = await asUser.mutation(api.tournamentParticipants.addParticipant, {
        tournamentId,
        bracketId: doublesBracketId,
        player1Name: "Alice Smith",
        player2Name: "Bob Jones",
      });

      const participant = await t.run(async (ctx) => ctx.db.get(participantId));
      expect(participant!.type).toBe("doubles");
      expect(participant!.displayName).toBe("A. Smith / B. Jones");
    });
  });
});

// ============================================
// updateParticipant
// ============================================

describe("updateParticipant", () => {
  it("throws when unauthenticated", async () => {
    const t = getTestContext();
    await expect(
      t.mutation(api.tournamentParticipants.updateParticipant, {
        participantId: "fake" as Id<"tournamentParticipants">,
        playerName: "Updated",
      })
    ).rejects.toThrow();
  });

  it("throws for non-existent participant", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);
    await expect(
      asUser.mutation(api.tournamentParticipants.updateParticipant, {
        participantId: "fake" as Id<"tournamentParticipants">,
        playerName: "Updated",
      })
    ).rejects.toThrow();
  });

  it("throws when non-owner tries to update", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { asUser: asOther } = await setupUser(t, { name: "Other", email: "other@test.com" });
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, ownerId);

    const participantId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Player",
        playerName: "Player",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    await expect(
      asOther.mutation(api.tournamentParticipants.updateParticipant, {
        participantId,
        playerName: "Hacked",
      })
    ).rejects.toThrow();
  });

  it("throws when tournament is not in draft status", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId, {
      status: "active",
    });

    const participantId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Player",
        playerName: "Player",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    await expect(
      asUser.mutation(api.tournamentParticipants.updateParticipant, {
        participantId,
        playerName: "Updated",
      })
    ).rejects.toThrow("Cannot update participants after tournament has started");
  });

  it("updates an individual participant name with capitalization", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId);

    const participantId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Old Name",
        playerName: "Old Name",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    await asUser.mutation(api.tournamentParticipants.updateParticipant, {
      participantId,
      playerName: "jane doe",
    });

    const participant = await t.run(async (ctx) => ctx.db.get(participantId));
    expect(participant!.displayName).toBe("Jane Doe");
    expect(participant!.playerName).toBe("Jane Doe");
  });

  it("updates doubles participant names and regenerates display name", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId, {
      participantType: "doubles",
    });

    const participantId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "doubles",
        displayName: "A. Smith / B. Jones",
        player1Name: "Alice Smith",
        player2Name: "Bob Jones",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    await asUser.mutation(api.tournamentParticipants.updateParticipant, {
      participantId,
      player1Name: "carol white",
    });

    const participant = await t.run(async (ctx) => ctx.db.get(participantId));
    expect(participant!.player1Name).toBe("Carol White");
    // player2Name should be preserved
    expect(participant!.player2Name).toBe("Bob Jones");
    expect(participant!.displayName).toBe("C. White / B. Jones");
  });

  it("updates team name", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId, {
      participantType: "team",
    });

    const participantId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "team",
        displayName: "Old Team",
        teamName: "Old Team",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    await asUser.mutation(api.tournamentParticipants.updateParticipant, {
      participantId,
      teamName: "new eagles",
    });

    const participant = await t.run(async (ctx) => ctx.db.get(participantId));
    expect(participant!.displayName).toBe("New Eagles");
    expect(participant!.teamName).toBe("New Eagles");
  });

  it("does not update when no relevant fields provided", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId);

    const participantId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Original Name",
        playerName: "Original Name",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    // Call with no actual name field -- should not change anything
    await asUser.mutation(api.tournamentParticipants.updateParticipant, {
      participantId,
    });

    const participant = await t.run(async (ctx) => ctx.db.get(participantId));
    expect(participant!.displayName).toBe("Original Name");
  });

  it("returns null on success", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId);

    const participantId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Player",
        playerName: "Player",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    const result = await asUser.mutation(api.tournamentParticipants.updateParticipant, {
      participantId,
      playerName: "Updated",
    });
    expect(result).toBeNull();
  });
});

// ============================================
// removeParticipant
// ============================================

describe("removeParticipant", () => {
  it("throws when unauthenticated", async () => {
    const t = getTestContext();
    await expect(
      t.mutation(api.tournamentParticipants.removeParticipant, {
        participantId: "fake" as Id<"tournamentParticipants">,
      })
    ).rejects.toThrow();
  });

  it("throws for non-existent participant", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);
    await expect(
      asUser.mutation(api.tournamentParticipants.removeParticipant, {
        participantId: "fake" as Id<"tournamentParticipants">,
      })
    ).rejects.toThrow();
  });

  it("throws when non-owner tries to remove", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { asUser: asOther } = await setupUser(t, { name: "Other", email: "other@test.com" });
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, ownerId);

    const participantId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Player",
        playerName: "Player",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    await expect(
      asOther.mutation(api.tournamentParticipants.removeParticipant, { participantId })
    ).rejects.toThrow("Only the tournament owner");
  });

  it("throws when tournament is not in draft status", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId, {
      status: "active",
    });

    const participantId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Player",
        playerName: "Player",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    await expect(
      asUser.mutation(api.tournamentParticipants.removeParticipant, { participantId })
    ).rejects.toThrow("Cannot remove participants after tournament has started");
  });

  it("removes participant successfully", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId);

    const participantId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Player To Remove",
        playerName: "Player To Remove",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    const result = await asUser.mutation(api.tournamentParticipants.removeParticipant, {
      participantId,
    });
    expect(result).toBeNull();

    const deleted = await t.run(async (ctx) => ctx.db.get(participantId));
    expect(deleted).toBeNull();
  });

  it("does not affect other participants when removing one", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId);

    const [toRemoveId, toKeepId] = await t.run(async (ctx) => {
      const removeId = await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Remove Me",
        playerName: "Remove Me",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
      const keepId = await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Keep Me",
        playerName: "Keep Me",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
      return [removeId, keepId] as const;
    });

    await asUser.mutation(api.tournamentParticipants.removeParticipant, {
      participantId: toRemoveId,
    });

    const kept = await t.run(async (ctx) => ctx.db.get(toKeepId));
    expect(kept).not.toBeNull();
    expect(kept!.displayName).toBe("Keep Me");
  });
});

// ============================================
// updateSeeding
// ============================================

describe("updateSeeding", () => {
  it("throws when unauthenticated", async () => {
    const t = getTestContext();
    await expect(
      t.mutation(api.tournamentParticipants.updateSeeding, {
        participantId: "fake" as Id<"tournamentParticipants">,
        seed: 1,
      })
    ).rejects.toThrow();
  });

  it("throws for non-existent participant", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);
    await expect(
      asUser.mutation(api.tournamentParticipants.updateSeeding, {
        participantId: "fake" as Id<"tournamentParticipants">,
        seed: 1,
      })
    ).rejects.toThrow();
  });

  it("throws when non-owner tries to update seeding", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { asUser: asOther } = await setupUser(t, { name: "Other", email: "other@test.com" });
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, ownerId);

    const participantId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Player",
        playerName: "Player",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    await expect(
      asOther.mutation(api.tournamentParticipants.updateSeeding, { participantId, seed: 1 })
    ).rejects.toThrow();
  });

  it("throws when tournament is not in draft status", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId, {
      status: "active",
    });

    const participantId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Player",
        playerName: "Player",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    await expect(
      asUser.mutation(api.tournamentParticipants.updateSeeding, { participantId, seed: 1 })
    ).rejects.toThrow("Cannot update seeding after tournament has started");
  });

  it("updates participant seed", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId);

    const participantId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Player",
        playerName: "Player",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    const result = await asUser.mutation(api.tournamentParticipants.updateSeeding, {
      participantId,
      seed: 3,
    });
    expect(result).toBeNull();

    const participant = await t.run(async (ctx) => ctx.db.get(participantId));
    expect(participant!.seed).toBe(3);
  });

  it("overwrites existing seed", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId);

    const participantId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Player",
        playerName: "Player",
        seed: 1,
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    await asUser.mutation(api.tournamentParticipants.updateSeeding, {
      participantId,
      seed: 5,
    });

    const participant = await t.run(async (ctx) => ctx.db.get(participantId));
    expect(participant!.seed).toBe(5);
  });
});

// ============================================
// updateSeedingBatch
// ============================================

describe("updateSeedingBatch", () => {
  it("throws when unauthenticated", async () => {
    const t = getTestContext();
    await expect(
      t.mutation(api.tournamentParticipants.updateSeedingBatch, {
        tournamentId: "fake" as Id<"tournaments">,
        seedings: [],
      })
    ).rejects.toThrow();
  });

  it("throws for non-existent tournament", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);
    await expect(
      asUser.mutation(api.tournamentParticipants.updateSeedingBatch, {
        tournamentId: "fake" as Id<"tournaments">,
        seedings: [],
      })
    ).rejects.toThrow();
  });

  it("throws when non-owner tries batch update", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { asUser: asOther } = await setupUser(t, { name: "Other", email: "other@test.com" });
    const { tournamentId } = await createTournamentWithBracket(t, ownerId);

    await expect(
      asOther.mutation(api.tournamentParticipants.updateSeedingBatch, {
        tournamentId,
        seedings: [],
      })
    ).rejects.toThrow();
  });

  it("throws when tournament is not in draft status", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournamentWithBracket(t, userId, { status: "active" });

    await expect(
      asUser.mutation(api.tournamentParticipants.updateSeedingBatch, {
        tournamentId,
        seedings: [],
      })
    ).rejects.toThrow("Cannot update seeding after tournament has started");
  });

  it("updates multiple participant seeds in batch", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId);

    const [p1Id, p2Id, p3Id] = await t.run(async (ctx) => {
      const id1 = await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Player 1",
        playerName: "Player 1",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
      const id2 = await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Player 2",
        playerName: "Player 2",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
      const id3 = await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Player 3",
        playerName: "Player 3",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
      return [id1, id2, id3] as const;
    });

    const result = await asUser.mutation(api.tournamentParticipants.updateSeedingBatch, {
      tournamentId,
      seedings: [
        { participantId: p1Id, seed: 3 },
        { participantId: p2Id, seed: 1 },
        { participantId: p3Id, seed: 2 },
      ],
    });
    expect(result).toBeNull();

    const [p1, p2, p3] = await t.run(async (ctx) => {
      return [await ctx.db.get(p1Id), await ctx.db.get(p2Id), await ctx.db.get(p3Id)] as const;
    });

    expect(p1!.seed).toBe(3);
    expect(p2!.seed).toBe(1);
    expect(p3!.seed).toBe(2);
  });

  it("skips participants that do not belong to the tournament", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId);
    const { tournamentId: otherTournamentId, bracketId: otherBracketId } =
      await createTournamentWithBracket(t, userId, { name: "Other" });

    const [ownParticipantId, otherParticipantId] = await t.run(async (ctx) => {
      const ownId = await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Own Player",
        playerName: "Own Player",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
      const otherId = await ctx.db.insert("tournamentParticipants", {
        tournamentId: otherTournamentId,
        bracketId: otherBracketId,
        type: "individual",
        displayName: "Other Player",
        playerName: "Other Player",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
      return [ownId, otherId] as const;
    });

    await asUser.mutation(api.tournamentParticipants.updateSeedingBatch, {
      tournamentId,
      seedings: [
        { participantId: ownParticipantId, seed: 1 },
        { participantId: otherParticipantId, seed: 2 }, // wrong tournament - should be skipped
      ],
    });

    const ownParticipant = await t.run(async (ctx) => ctx.db.get(ownParticipantId));
    expect(ownParticipant!.seed).toBe(1);

    const otherParticipant = await t.run(async (ctx) => ctx.db.get(otherParticipantId));
    expect(otherParticipant!.seed).toBeUndefined(); // should not have been updated
  });

  it("handles empty seedings array", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournamentWithBracket(t, userId);

    const result = await asUser.mutation(api.tournamentParticipants.updateSeedingBatch, {
      tournamentId,
      seedings: [],
    });
    expect(result).toBeNull();
  });
});

// ============================================
// updatePlaceholderName
// ============================================

describe("updatePlaceholderName", () => {
  it("throws when unauthenticated", async () => {
    const t = getTestContext();
    await expect(
      t.mutation(api.tournamentParticipants.updatePlaceholderName, {
        participantId: "fake" as Id<"tournamentParticipants">,
        displayName: "New Name",
      })
    ).rejects.toThrow();
  });

  it("throws for non-existent participant", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);
    await expect(
      asUser.mutation(api.tournamentParticipants.updatePlaceholderName, {
        participantId: "fake" as Id<"tournamentParticipants">,
        displayName: "New Name",
      })
    ).rejects.toThrow();
  });

  it("throws when non-owner tries to update placeholder", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { asUser: asOther } = await setupUser(t, { name: "Other", email: "other@test.com" });
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, ownerId);

    const participantId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Slot 1",
        isPlaceholder: true,
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    await expect(
      asOther.mutation(api.tournamentParticipants.updatePlaceholderName, {
        participantId,
        displayName: "Real Player",
      })
    ).rejects.toThrow();
  });

  it("converts individual placeholder to real participant", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId);

    const participantId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Slot 1",
        isPlaceholder: true,
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    const result = await asUser.mutation(api.tournamentParticipants.updatePlaceholderName, {
      participantId,
      displayName: "john doe",
    });
    expect(result).toBeNull();

    const participant = await t.run(async (ctx) => ctx.db.get(participantId));
    expect(participant!.isPlaceholder).toBe(false);
    expect(participant!.displayName).toBe("John Doe");
    expect(participant!.playerName).toBe("John Doe");
  });

  it("uses playerName when provided for individual placeholder", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId);

    const participantId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Slot 1",
        isPlaceholder: true,
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    await asUser.mutation(api.tournamentParticipants.updatePlaceholderName, {
      participantId,
      displayName: "john doe",
      playerName: "jonathan doe",
    });

    const participant = await t.run(async (ctx) => ctx.db.get(participantId));
    expect(participant!.displayName).toBe("John Doe");
    expect(participant!.playerName).toBe("Jonathan Doe");
  });

  it("converts doubles placeholder to real participant", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId, {
      participantType: "doubles",
    });

    const participantId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "doubles",
        displayName: "Slot 1",
        isPlaceholder: true,
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    await asUser.mutation(api.tournamentParticipants.updatePlaceholderName, {
      participantId,
      displayName: "smith / jones",
      player1Name: "alice smith",
      player2Name: "bob jones",
    });

    const participant = await t.run(async (ctx) => ctx.db.get(participantId));
    expect(participant!.isPlaceholder).toBe(false);
    expect(participant!.displayName).toBe("Smith / Jones");
    expect(participant!.player1Name).toBe("Alice Smith");
    expect(participant!.player2Name).toBe("Bob Jones");
  });

  it("converts team placeholder to real participant", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId, {
      participantType: "team",
    });

    const participantId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "team",
        displayName: "Slot 1",
        isPlaceholder: true,
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    await asUser.mutation(api.tournamentParticipants.updatePlaceholderName, {
      participantId,
      displayName: "the eagles",
    });

    const participant = await t.run(async (ctx) => ctx.db.get(participantId));
    expect(participant!.isPlaceholder).toBe(false);
    expect(participant!.displayName).toBe("The Eagles");
    expect(participant!.teamName).toBe("The Eagles");
  });

  it("uses explicit teamName when provided for team placeholder", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId, {
      participantType: "team",
    });

    const participantId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "team",
        displayName: "Slot 1",
        isPlaceholder: true,
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    await asUser.mutation(api.tournamentParticipants.updatePlaceholderName, {
      participantId,
      displayName: "the eagles",
      teamName: "eagle squad",
    });

    const participant = await t.run(async (ctx) => ctx.db.get(participantId));
    expect(participant!.displayName).toBe("The Eagles");
    expect(participant!.teamName).toBe("Eagle Squad");
  });

  it("works on non-placeholder participants too (updates name and clears placeholder flag)", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId);

    const participantId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Existing Player",
        playerName: "Existing Player",
        isPlaceholder: false,
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    await asUser.mutation(api.tournamentParticipants.updatePlaceholderName, {
      participantId,
      displayName: "renamed player",
    });

    const participant = await t.run(async (ctx) => ctx.db.get(participantId));
    expect(participant!.displayName).toBe("Renamed Player");
    expect(participant!.isPlaceholder).toBe(false);
  });
});
