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

async function createTournament(t: TestCtx, userId: Id<"users">) {
  return await t.run(async (ctx) => {
    const tournamentId = await ctx.db.insert("tournaments", {
      createdBy: userId,
      name: "Test Tournament",
      sport: "tennis",
      format: "single_elimination",
      participantType: "individual",
      maxParticipants: 8,
      status: "draft",
      tennisConfig: { isAdScoring: true, setsToWin: 2 },
    });
    return tournamentId;
  });
}

describe("listScorers", () => {
  it("returns empty for unauthenticated user", async () => {
    const t = getTestContext();
    const { userId } = await setupUser(t);
    const tournamentId = await createTournament(t, userId);
    const result = await t.query(api.tournamentScorers.listScorers, {
      tournamentId,
    });
    expect(result).toEqual([]);
  });

  it("returns scorers for tournament owner", async () => {
    const t = getTestContext();
    const { userId: ownerId, asUser: asOwner } = await setupUser(t, {
      name: "Owner",
      email: "owner@test.com",
    });
    const { userId: scorerId } = await setupUser(t, {
      name: "Scorer",
      email: "scorer@test.com",
    });
    const tournamentId = await createTournament(t, ownerId);

    // Assign scorer
    await t.run(async (ctx) => {
      await ctx.db.insert("tournamentScorers", {
        tournamentId,
        userId: scorerId,
        assignedBy: ownerId,
        assignedAt: Date.now(),
      });
    });

    const scorers = await asOwner.query(api.tournamentScorers.listScorers, { tournamentId });
    expect(scorers).toHaveLength(1);
    expect(scorers[0]!.userName).toBe("Scorer");
    expect(scorers[0]!.userEmail).toBe("scorer@test.com");
  });

  it("returns empty for non-owner", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { asUser: asScorer } = await setupUser(t, { name: "Scorer", email: "scorer@test.com" });
    const tournamentId = await createTournament(t, ownerId);

    const scorers = await asScorer.query(api.tournamentScorers.listScorers, { tournamentId });
    expect(scorers).toEqual([]);
  });
});

describe("assignScorer", () => {
  it("throws when unauthenticated", async () => {
    const t = getTestContext();
    await expect(
      t.mutation(api.tournamentScorers.assignScorer, {
        tournamentId: "fake" as Id<"tournaments">,
        email: "scorer@test.com",
      })
    ).rejects.toThrow();
  });

  it("assigns a scorer by email", async () => {
    const t = getTestContext();
    const { userId: ownerId, asUser: asOwner } = await setupUser(t, {
      name: "Owner",
      email: "owner@test.com",
    });
    const { userId: scorerId } = await setupUser(t, {
      name: "Scorer",
      email: "scorer@test.com",
    });
    const tournamentId = await createTournament(t, ownerId);

    const scorerAssignmentId = await asOwner.mutation(api.tournamentScorers.assignScorer, {
      tournamentId,
      email: "scorer@test.com",
    });

    expect(scorerAssignmentId).toBeDefined();

    const assignment = await t.run(async (ctx) => ctx.db.get(scorerAssignmentId));
    expect(assignment!.userId).toBe(scorerId);
    expect(assignment!.assignedBy).toBe(ownerId);
  });

  it("cannot assign yourself", async () => {
    const t = getTestContext();
    const { userId: ownerId, asUser: asOwner } = await setupUser(t, {
      name: "Owner",
      email: "owner@test.com",
    });
    const tournamentId = await createTournament(t, ownerId);

    await expect(
      asOwner.mutation(api.tournamentScorers.assignScorer, {
        tournamentId,
        email: "owner@test.com",
      })
    ).rejects.toThrow("already have full access as the owner");
  });

  it("rejects non-existent email", async () => {
    const t = getTestContext();
    const { userId: ownerId, asUser: asOwner } = await setupUser(t, {
      name: "Owner",
      email: "owner@test.com",
    });
    const tournamentId = await createTournament(t, ownerId);

    await expect(
      asOwner.mutation(api.tournamentScorers.assignScorer, {
        tournamentId,
        email: "nobody@test.com",
      })
    ).rejects.toThrow();
  });

  it("prevents duplicate assignment", async () => {
    const t = getTestContext();
    const { userId: ownerId, asUser: asOwner } = await setupUser(t, {
      name: "Owner",
      email: "owner@test.com",
    });
    await setupUser(t, { name: "Scorer", email: "scorer@test.com" });
    const tournamentId = await createTournament(t, ownerId);

    await asOwner.mutation(api.tournamentScorers.assignScorer, {
      tournamentId,
      email: "scorer@test.com",
    });

    await expect(
      asOwner.mutation(api.tournamentScorers.assignScorer, {
        tournamentId,
        email: "scorer@test.com",
      })
    ).rejects.toThrow("already assigned");
  });

  it("only owner can assign", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { asUser: asOther } = await setupUser(t, { name: "Other", email: "other@test.com" });
    await setupUser(t, { name: "Target", email: "target@test.com" });
    const tournamentId = await createTournament(t, ownerId);

    await expect(
      asOther.mutation(api.tournamentScorers.assignScorer, {
        tournamentId,
        email: "target@test.com",
      })
    ).rejects.toThrow();
  });
});

describe("assignScorerById", () => {
  it("assigns a scorer by user ID", async () => {
    const t = getTestContext();
    const { userId: ownerId, asUser: asOwner } = await setupUser(t, {
      name: "Owner",
      email: "owner@test.com",
    });
    const { userId: scorerId } = await setupUser(t, {
      name: "Scorer",
      email: "scorer@test.com",
    });
    const tournamentId = await createTournament(t, ownerId);

    const scorerAssignmentId = await asOwner.mutation(api.tournamentScorers.assignScorerById, {
      tournamentId,
      userId: scorerId,
    });

    expect(scorerAssignmentId).toBeDefined();
  });

  it("cannot assign yourself by ID", async () => {
    const t = getTestContext();
    const { userId: ownerId, asUser: asOwner } = await setupUser(t, {
      name: "Owner",
      email: "owner@test.com",
    });
    const tournamentId = await createTournament(t, ownerId);

    await expect(
      asOwner.mutation(api.tournamentScorers.assignScorerById, {
        tournamentId,
        userId: ownerId,
      })
    ).rejects.toThrow("already have full access");
  });
});

describe("removeScorer", () => {
  it("removes an assigned scorer", async () => {
    const t = getTestContext();
    const { userId: ownerId, asUser: asOwner } = await setupUser(t, {
      name: "Owner",
      email: "owner@test.com",
    });
    const { userId: scorerId } = await setupUser(t, {
      name: "Scorer",
      email: "scorer@test.com",
    });
    const tournamentId = await createTournament(t, ownerId);

    await t.run(async (ctx) => {
      await ctx.db.insert("tournamentScorers", {
        tournamentId,
        userId: scorerId,
        assignedBy: ownerId,
        assignedAt: Date.now(),
      });
    });

    await asOwner.mutation(api.tournamentScorers.removeScorer, {
      tournamentId,
      userId: scorerId,
    });

    const scorers = await t.run(async (ctx) =>
      ctx.db
        .query("tournamentScorers")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
        .collect()
    );
    expect(scorers).toHaveLength(0);
  });

  it("throws for non-existent assignment", async () => {
    const t = getTestContext();
    const { userId: ownerId, asUser: asOwner } = await setupUser(t, {
      name: "Owner",
      email: "owner@test.com",
    });
    const { userId: notAssigned } = await setupUser(t, {
      name: "Nobody",
      email: "nobody@test.com",
    });
    const tournamentId = await createTournament(t, ownerId);

    await expect(
      asOwner.mutation(api.tournamentScorers.removeScorer, {
        tournamentId,
        userId: notAssigned,
      })
    ).rejects.toThrow("not found");
  });
});

describe("isAssigned", () => {
  it("returns false for unauthenticated user", async () => {
    const t = getTestContext();
    const { userId } = await setupUser(t);
    const tournamentId = await createTournament(t, userId);
    const result = await t.query(api.tournamentScorers.isAssigned, {
      tournamentId,
    });
    expect(result).toBe(false);
  });

  it("returns true when assigned", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { userId: scorerId, asUser: asScorer } = await setupUser(t, {
      name: "Scorer",
      email: "scorer@test.com",
    });
    const tournamentId = await createTournament(t, ownerId);

    await t.run(async (ctx) => {
      await ctx.db.insert("tournamentScorers", {
        tournamentId,
        userId: scorerId,
        assignedBy: ownerId,
        assignedAt: Date.now(),
      });
    });

    const result = await asScorer.query(api.tournamentScorers.isAssigned, { tournamentId });
    expect(result).toBe(true);
  });

  it("returns false when not assigned", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { asUser: asOther } = await setupUser(t, { name: "Other", email: "other@test.com" });
    const tournamentId = await createTournament(t, ownerId);

    const result = await asOther.query(api.tournamentScorers.isAssigned, { tournamentId });
    expect(result).toBe(false);
  });
});
