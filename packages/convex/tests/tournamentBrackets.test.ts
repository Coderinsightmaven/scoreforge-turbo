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
  overrides: { status?: "draft" | "active" | "completed" | "cancelled" } = {}
) {
  return await t.run(async (ctx) => {
    const tournamentId = await ctx.db.insert("tournaments", {
      createdBy: userId,
      name: "Test Tournament",
      sport: "tennis",
      format: "single_elimination",
      participantType: "individual",
      maxParticipants: 8,
      status: overrides.status ?? "draft",
      tennisConfig: { isAdScoring: true, setsToWin: 2 },
    });
    const bracketId = await ctx.db.insert("tournamentBrackets", {
      tournamentId,
      name: "Main Draw",
      status: overrides.status === "active" ? "active" : "draft",
      displayOrder: 1,
      createdAt: Date.now(),
    });
    return { tournamentId, bracketId };
  });
}

// ============================================
// Queries
// ============================================

describe("listBrackets", () => {
  it("returns empty for unauthenticated user", async () => {
    const t = getTestContext();
    const { userId } = await setupUser(t);
    const { tournamentId } = await createTournamentWithBracket(t, userId);
    const result = await t.query(api.tournamentBrackets.listBrackets, {
      tournamentId,
    });
    expect(result).toEqual([]);
  });

  it("returns brackets for tournament owner", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournamentWithBracket(t, userId);

    const brackets = await asUser.query(api.tournamentBrackets.listBrackets, { tournamentId });
    expect(brackets).toHaveLength(1);
    expect(brackets[0]!.name).toBe("Main Draw");
    expect(brackets[0]!.participantCount).toBe(0);
    expect(brackets[0]!.matchCount).toBe(0);
  });

  it("returns empty for unauthorized user", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { asUser: asOther } = await setupUser(t, { name: "Other", email: "other@test.com" });
    const { tournamentId } = await createTournamentWithBracket(t, ownerId);

    const brackets = await asOther.query(api.tournamentBrackets.listBrackets, { tournamentId });
    expect(brackets).toEqual([]);
  });

  it("sorted by displayOrder", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournamentWithBracket(t, userId);

    // Add a second bracket
    await t.run(async (ctx) => {
      await ctx.db.insert("tournamentBrackets", {
        tournamentId,
        name: "Consolation",
        status: "draft",
        displayOrder: 2,
        createdAt: Date.now(),
      });
    });

    const brackets = await asUser.query(api.tournamentBrackets.listBrackets, { tournamentId });
    expect(brackets).toHaveLength(2);
    expect(brackets[0]!.name).toBe("Main Draw");
    expect(brackets[1]!.name).toBe("Consolation");
  });
});

describe("getBracket", () => {
  it("returns null for unauthenticated user", async () => {
    const t = getTestContext();
    const { userId } = await setupUser(t);
    const { bracketId } = await createTournamentWithBracket(t, userId);
    const result = await t.query(api.tournamentBrackets.getBracket, {
      bracketId,
    });
    expect(result).toBeNull();
  });

  it("returns bracket with resolved format", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { bracketId } = await createTournamentWithBracket(t, userId);

    const bracket = await asUser.query(api.tournamentBrackets.getBracket, { bracketId });
    expect(bracket).not.toBeNull();
    expect(bracket!.resolvedFormat).toBe("single_elimination");
    expect(bracket!.resolvedParticipantType).toBe("individual");
  });
});

// ============================================
// Mutations
// ============================================

describe("createBracket", () => {
  it("throws when unauthenticated", async () => {
    const t = getTestContext();
    await expect(
      t.mutation(api.tournamentBrackets.createBracket, {
        tournamentId: "fake" as Id<"tournaments">,
        name: "New Bracket",
      })
    ).rejects.toThrow();
  });

  it("creates a new bracket with correct displayOrder", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournamentWithBracket(t, userId);

    const bracketId = await asUser.mutation(api.tournamentBrackets.createBracket, {
      tournamentId,
      name: "Women's Singles",
    });

    const bracket = await t.run(async (ctx) => ctx.db.get(bracketId));
    expect(bracket!.name).toBe("Women's Singles");
    expect(bracket!.displayOrder).toBe(2); // After existing bracket with order 1
    expect(bracket!.status).toBe("draft");
  });

  it("only owner can create brackets", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { asUser: asOther } = await setupUser(t, { name: "Other", email: "other@test.com" });
    const { tournamentId } = await createTournamentWithBracket(t, ownerId);

    await expect(
      asOther.mutation(api.tournamentBrackets.createBracket, {
        tournamentId,
        name: "Hacked Bracket",
      })
    ).rejects.toThrow();
  });

  it("cannot create for completed tournaments", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournamentWithBracket(t, userId, {
      status: "completed",
    });

    await expect(
      asUser.mutation(api.tournamentBrackets.createBracket, {
        tournamentId,
        name: "Late Bracket",
      })
    ).rejects.toThrow("completed or cancelled");
  });
});

describe("updateBracket", () => {
  it("updates bracket name", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { bracketId } = await createTournamentWithBracket(t, userId);

    await asUser.mutation(api.tournamentBrackets.updateBracket, {
      bracketId,
      name: "Updated Draw",
    });

    const bracket = await t.run(async (ctx) => ctx.db.get(bracketId));
    expect(bracket!.name).toBe("Updated Draw");
  });

  it("cannot update active bracket", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { bracketId } = await createTournamentWithBracket(t, userId, { status: "active" });

    await expect(
      asUser.mutation(api.tournamentBrackets.updateBracket, {
        bracketId,
        name: "Can't Touch This",
      })
    ).rejects.toThrow("draft");
  });
});

describe("deleteBracket", () => {
  it("deletes an empty draft bracket", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournamentWithBracket(t, userId);

    // Add a second bracket so we can delete one
    const secondBracketId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentBrackets", {
        tournamentId,
        name: "To Delete",
        status: "draft",
        displayOrder: 2,
        createdAt: Date.now(),
      });
    });

    await asUser.mutation(api.tournamentBrackets.deleteBracket, { bracketId: secondBracketId });

    const bracket = await t.run(async (ctx) => ctx.db.get(secondBracketId));
    expect(bracket).toBeNull();
  });

  it("cannot delete the last bracket", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { bracketId } = await createTournamentWithBracket(t, userId);

    await expect(
      asUser.mutation(api.tournamentBrackets.deleteBracket, { bracketId })
    ).rejects.toThrow("last bracket");
  });

  it("cannot delete bracket with participants", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId);

    // Add second bracket and participant to first
    await t.run(async (ctx) => {
      await ctx.db.insert("tournamentBrackets", {
        tournamentId,
        name: "Second",
        status: "draft",
        displayOrder: 2,
        createdAt: Date.now(),
      });
      await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        bracketId,
        type: "individual",
        displayName: "Player 1",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    await expect(
      asUser.mutation(api.tournamentBrackets.deleteBracket, { bracketId })
    ).rejects.toThrow("participants");
  });
});

describe("reorderBrackets", () => {
  it("reorders brackets", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournamentWithBracket(t, userId);

    const secondBracketId = await t.run(async (ctx) => {
      return await ctx.db.insert("tournamentBrackets", {
        tournamentId,
        name: "Second",
        status: "draft",
        displayOrder: 2,
        createdAt: Date.now(),
      });
    });

    // Reverse order
    await asUser.mutation(api.tournamentBrackets.reorderBrackets, {
      tournamentId,
      bracketIds: [secondBracketId, bracketId],
    });

    const first = await t.run(async (ctx) => ctx.db.get(secondBracketId));
    const second = await t.run(async (ctx) => ctx.db.get(bracketId));
    expect(first!.displayOrder).toBe(1);
    expect(second!.displayOrder).toBe(2);
  });
});

describe("startBracket", () => {
  it("activates a draft bracket in active tournament", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);

    // Create active tournament with draft bracket
    const { tournamentId } = await t.run(async (ctx) => {
      const tournamentId = await ctx.db.insert("tournaments", {
        createdBy: userId,
        name: "Active T",
        sport: "tennis",
        format: "single_elimination",
        participantType: "individual",
        maxParticipants: 8,
        status: "active",
        tennisConfig: { isAdScoring: true, setsToWin: 2 },
      });
      return { tournamentId };
    });

    const bracketId = await t.run(async (ctx) => {
      const bId = await ctx.db.insert("tournamentBrackets", {
        tournamentId,
        name: "Late Draw",
        status: "draft",
        displayOrder: 1,
        createdAt: Date.now(),
      });
      // Add 2 participants
      for (let i = 1; i <= 2; i++) {
        await ctx.db.insert("tournamentParticipants", {
          tournamentId,
          bracketId: bId,
          type: "individual",
          displayName: `Player ${i}`,
          seed: i,
          wins: 0,
          losses: 0,
          draws: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          createdAt: Date.now(),
        });
      }
      return bId;
    });

    await asUser.mutation(api.tournamentBrackets.startBracket, { bracketId });

    const bracket = await t.run(async (ctx) => ctx.db.get(bracketId));
    expect(bracket!.status).toBe("active");
  });

  it("fails if tournament is not active", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { bracketId } = await createTournamentWithBracket(t, userId, { status: "draft" });

    await expect(
      asUser.mutation(api.tournamentBrackets.startBracket, { bracketId })
    ).rejects.toThrow("Tournament must be started");
  });

  it("fails with fewer than 2 participants", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);

    const bracketId = await t.run(async (ctx) => {
      const tournamentId = await ctx.db.insert("tournaments", {
        createdBy: userId,
        name: "Active T",
        sport: "tennis",
        format: "single_elimination",
        participantType: "individual",
        maxParticipants: 8,
        status: "active",
        tennisConfig: { isAdScoring: true, setsToWin: 2 },
      });
      return await ctx.db.insert("tournamentBrackets", {
        tournamentId,
        name: "Empty Draw",
        status: "draft",
        displayOrder: 1,
        createdAt: Date.now(),
      });
    });

    await expect(
      asUser.mutation(api.tournamentBrackets.startBracket, { bracketId })
    ).rejects.toThrow("at least 2 participants");
  });
});
