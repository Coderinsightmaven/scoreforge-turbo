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

async function createTournament(
  t: TestCtx,
  userId: Id<"users">,
  overrides: Partial<{
    name: string;
    format: "single_elimination" | "double_elimination" | "round_robin";
    status: "draft" | "active" | "completed" | "cancelled";
    participantType: "individual" | "doubles" | "team";
    maxParticipants: number;
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
    });
    return { tournamentId, bracketId };
  });
}

// ============================================
// Queries
// ============================================

describe("getTournament", () => {
  it("returns null for non-existent tournament", async () => {
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
    const result = await asUser.query(api.tournaments.getTournament, {
      tournamentId: deletedId,
    });
    expect(result).toBeNull();
  });

  it("returns tournament with owner role for the creator", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournament(t, userId);

    const result = await asUser.query(api.tournaments.getTournament, { tournamentId });
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Test Tournament");
    expect(result!.myRole).toBe("owner");
    expect(result!.participantCount).toBe(0);
    expect(result!.bracketCount).toBe(1);
  });

  it("returns null for user without access", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { asUser: asOther } = await setupUser(t, { name: "Other", email: "other@test.com" });
    const { tournamentId } = await createTournament(t, ownerId);

    const result = await asOther.query(api.tournaments.getTournament, { tournamentId });
    expect(result).toBeNull();
  });

  it("returns tournament with scorer role for assigned scorer", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { userId: scorerId, asUser: asScorer } = await setupUser(t, {
      name: "Scorer",
      email: "scorer@test.com",
    });
    const { tournamentId } = await createTournament(t, ownerId);

    // Assign scorer
    await t.run(async (ctx) => {
      await ctx.db.insert("tournamentScorers", {
        tournamentId,
        userId: scorerId,
        assignedBy: ownerId,
        assignedAt: Date.now(),
      });
    });

    const result = await asScorer.query(api.tournaments.getTournament, { tournamentId });
    expect(result).not.toBeNull();
    expect(result!.myRole).toBe("scorer");
  });
});

describe("canCreateTournament", () => {
  it("returns false for unauthenticated users", async () => {
    const t = getTestContext();
    const result = await t.query(api.tournaments.canCreateTournament);
    expect(result.canCreate).toBe(false);
  });

  it("returns true for user under the limit", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);
    const result = await asUser.query(api.tournaments.canCreateTournament);
    expect(result.canCreate).toBe(true);
    expect(result.currentCount).toBe(0);
    expect(result.maxAllowed).toBe(50); // Default limit
  });

  it("respects system settings limit", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);

    // Set a limit of 1
    await t.run(async (ctx) => {
      await ctx.db.insert("systemSettings", {
        key: "global",
        maxTournamentsPerUser: 1,
        allowPublicRegistration: true,
        maintenanceMode: false,
        updatedBy: userId,
        updatedAt: Date.now(),
      });
    });

    // Create 1 tournament
    await createTournament(t, userId);

    const result = await asUser.query(api.tournaments.canCreateTournament);
    expect(result.canCreate).toBe(false);
    expect(result.currentCount).toBe(1);
    expect(result.maxAllowed).toBe(1);
  });

  it("site admins bypass limits", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);

    // Make site admin
    await t.run(async (ctx) => {
      await ctx.db.insert("siteAdmins", {
        userId,
        grantedAt: Date.now(),
      });
    });

    const result = await asUser.query(api.tournaments.canCreateTournament);
    expect(result.canCreate).toBe(true);
    expect(result.isSiteAdmin).toBe(true);
  });
});

describe("listMyTournaments", () => {
  it("returns empty for unauthenticated users", async () => {
    const t = getTestContext();
    const result = await t.query(api.tournaments.listMyTournaments, {});
    expect(result).toEqual([]);
  });

  it("returns owned tournaments", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    await createTournament(t, userId, { name: "T1" });
    await createTournament(t, userId, { name: "T2" });

    const result = await asUser.query(api.tournaments.listMyTournaments, {});
    expect(result).toHaveLength(2);
    expect(result.every((t) => t.isOwner)).toBe(true);
  });

  it("includes tournaments where user is scorer", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { userId: scorerId, asUser: asScorer } = await setupUser(t, {
      name: "Scorer",
      email: "scorer@test.com",
    });

    const { tournamentId } = await createTournament(t, ownerId);
    await t.run(async (ctx) => {
      await ctx.db.insert("tournamentScorers", {
        tournamentId,
        userId: scorerId,
        assignedBy: ownerId,
        assignedAt: Date.now(),
      });
    });

    const result = await asScorer.query(api.tournaments.listMyTournaments, {});
    expect(result).toHaveLength(1);
    expect(result[0]!.isOwner).toBe(false);
  });

  it("filters by status", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    await createTournament(t, userId, { name: "Draft", status: "draft" });
    await createTournament(t, userId, { name: "Active", status: "active" });

    const drafts = await asUser.query(api.tournaments.listMyTournaments, { status: "draft" });
    expect(drafts).toHaveLength(1);
    expect(drafts[0]!.name).toBe("Draft");
  });
});

describe("getStandings", () => {
  it("throws when unauthenticated", async () => {
    const t = getTestContext();
    await expect(
      t.query(api.tournaments.getStandings, {
        tournamentId: "fake" as Id<"tournaments">,
      })
    ).rejects.toThrow();
  });

  it("returns standings sorted by points", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournament(t, userId, { format: "round_robin" });

    await t.run(async (ctx) => {
      await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        type: "individual",
        displayName: "Player A",
        wins: 3,
        losses: 0,
        draws: 0,
        pointsFor: 10,
        pointsAgainst: 2,
        createdAt: Date.now(),
      });
      await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        type: "individual",
        displayName: "Player B",
        wins: 1,
        losses: 2,
        draws: 0,
        pointsFor: 5,
        pointsAgainst: 8,
        createdAt: Date.now(),
      });
    });

    const standings = await asUser.query(api.tournaments.getStandings, { tournamentId });
    expect(standings).toHaveLength(2);
    expect(standings[0]!.displayName).toBe("Player A");
    expect(standings[0]!.points).toBe(9); // 3 * 3 (default)
    expect(standings[1]!.displayName).toBe("Player B");
    expect(standings[1]!.points).toBe(3); // 1 * 3
  });
});

// ============================================
// Mutations
// ============================================

describe("createTournament", () => {
  it("throws when unauthenticated", async () => {
    const t = getTestContext();
    await expect(
      t.mutation(api.tournaments.createTournament, {
        name: "Test",
        sport: "tennis",
        format: "single_elimination",
        participantType: "individual",
        maxParticipants: 8,
        tennisConfig: { isAdScoring: true, setsToWin: 2 },
        courts: ["Court 1"],
      })
    ).rejects.toThrow();
  });

  it("creates a tournament with default bracket", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);

    const tournamentId = await asUser.mutation(api.tournaments.createTournament, {
      name: "My Tournament",
      sport: "tennis",
      format: "single_elimination",
      participantType: "individual",
      maxParticipants: 16,
      tennisConfig: { isAdScoring: true, setsToWin: 2 },
      courts: ["Court 1"],
    });

    expect(tournamentId).toBeDefined();

    const tournament = await t.run(async (ctx) => ctx.db.get(tournamentId));
    expect(tournament!.name).toBe("My Tournament");
    expect(tournament!.createdBy).toBe(userId);
    expect(tournament!.status).toBe("draft");

    // Check default bracket was created
    const brackets = await t.run(async (ctx) =>
      ctx.db
        .query("tournamentBrackets")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
        .collect()
    );
    expect(brackets).toHaveLength(1);
    expect(brackets[0]!.name).toBe("Main Draw");
  });

  it("requires tennis config for tennis tournaments", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);

    await expect(
      asUser.mutation(api.tournaments.createTournament, {
        name: "No Config",
        sport: "tennis",
        format: "single_elimination",
        participantType: "individual",
        maxParticipants: 8,
        courts: ["Court 1"],
      })
    ).rejects.toThrow("Tennis configuration is required");
  });

  it("requires at least one court", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);

    await expect(
      asUser.mutation(api.tournaments.createTournament, {
        name: "No Courts",
        sport: "tennis",
        format: "single_elimination",
        participantType: "individual",
        maxParticipants: 8,
        tennisConfig: { isAdScoring: true, setsToWin: 2 },
        courts: [],
      })
    ).rejects.toThrow("At least one court is required");
  });

  it("enforces tournament limit for non-admins", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("systemSettings", {
        key: "global",
        maxTournamentsPerUser: 1,
        allowPublicRegistration: true,
        maintenanceMode: false,
        updatedBy: userId,
        updatedAt: Date.now(),
      });
    });

    // First tournament succeeds
    await asUser.mutation(api.tournaments.createTournament, {
      name: "T1",
      sport: "tennis",
      format: "single_elimination",
      participantType: "individual",
      maxParticipants: 8,
      tennisConfig: { isAdScoring: true, setsToWin: 2 },
      courts: ["Court 1"],
    });

    // Second tournament fails
    await expect(
      asUser.mutation(api.tournaments.createTournament, {
        name: "T2",
        sport: "tennis",
        format: "single_elimination",
        participantType: "individual",
        maxParticipants: 8,
        tennisConfig: { isAdScoring: true, setsToWin: 2 },
        courts: ["Court 1"],
      })
    ).rejects.toThrow("maximum number of tournaments");
  });

  it("validates name length", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);

    await expect(
      asUser.mutation(api.tournaments.createTournament, {
        name: "A".repeat(200),
        sport: "tennis",
        format: "single_elimination",
        participantType: "individual",
        maxParticipants: 8,
        tennisConfig: { isAdScoring: true, setsToWin: 2 },
        courts: ["Court 1"],
      })
    ).rejects.toThrow();
  });
});

describe("updateTournament", () => {
  it("throws when unauthenticated", async () => {
    const t = getTestContext();
    await expect(
      t.mutation(api.tournaments.updateTournament, {
        tournamentId: "fake" as Id<"tournaments">,
        name: "Updated",
      })
    ).rejects.toThrow();
  });

  it("updates tournament name", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournament(t, userId);

    await asUser.mutation(api.tournaments.updateTournament, {
      tournamentId,
      name: "Updated Name",
    });

    const tournament = await t.run(async (ctx) => ctx.db.get(tournamentId));
    expect(tournament!.name).toBe("Updated Name");
  });

  it("only owner can update", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { asUser: asOther } = await setupUser(t, { name: "Other", email: "other@test.com" });
    const { tournamentId } = await createTournament(t, ownerId);

    await expect(
      asOther.mutation(api.tournaments.updateTournament, { tournamentId, name: "Hacked" })
    ).rejects.toThrow();
  });

  it("cannot update non-draft tournaments", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournament(t, userId, { status: "active" });

    await expect(
      asUser.mutation(api.tournaments.updateTournament, { tournamentId, name: "Updated" })
    ).rejects.toThrow("Cannot update tournament after it has started");
  });
});

describe("deleteTournament", () => {
  it("deletes draft tournament and all related data", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournament(t, userId);

    // Add some participants
    await t.run(async (ctx) => {
      await ctx.db.insert("tournamentParticipants", {
        tournamentId,
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

    await asUser.mutation(api.tournaments.deleteTournament, { tournamentId });

    const tournament = await t.run(async (ctx) => ctx.db.get(tournamentId));
    expect(tournament).toBeNull();
  });

  it("cannot delete active tournament", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournament(t, userId, { status: "active" });

    await expect(
      asUser.mutation(api.tournaments.deleteTournament, { tournamentId })
    ).rejects.toThrow("Cannot delete an active tournament");
  });

  it("cannot delete completed tournament", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournament(t, userId, { status: "completed" });

    await expect(
      asUser.mutation(api.tournaments.deleteTournament, { tournamentId })
    ).rejects.toThrow("Cannot delete a completed tournament");
  });

  it("only owner can delete", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { asUser: asOther } = await setupUser(t, { name: "Other", email: "other@test.com" });
    const { tournamentId } = await createTournament(t, ownerId);

    await expect(
      asOther.mutation(api.tournaments.deleteTournament, { tournamentId })
    ).rejects.toThrow();
  });
});

describe("generateBracket", () => {
  it("generates matches for 4 participants", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournament(t, userId);

    // Add 4 participants (not assigned to a bracket)
    await t.run(async (ctx) => {
      for (let i = 1; i <= 4; i++) {
        await ctx.db.insert("tournamentParticipants", {
          tournamentId,
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
    });

    await asUser.mutation(api.tournaments.generateBracket, { tournamentId });

    const matches = await t.run(async (ctx) =>
      ctx.db
        .query("matches")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
        .collect()
    );

    // 4-player single elim: 3 matches
    expect(matches).toHaveLength(3);
  });

  it("fails with fewer than 2 participants", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournament(t, userId);

    await t.run(async (ctx) => {
      await ctx.db.insert("tournamentParticipants", {
        tournamentId,
        type: "individual",
        displayName: "Solo",
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        createdAt: Date.now(),
      });
    });

    await expect(
      asUser.mutation(api.tournaments.generateBracket, { tournamentId })
    ).rejects.toThrow("at least 2 participants");
  });

  it("only works for draft tournaments", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournament(t, userId, { status: "active" });

    await expect(
      asUser.mutation(api.tournaments.generateBracket, { tournamentId })
    ).rejects.toThrow("draft");
  });
});

describe("startTournament", () => {
  it("activates a draft tournament with participants", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId, bracketId } = await createTournament(t, userId);

    // Add participants to the bracket
    await t.run(async (ctx) => {
      for (let i = 1; i <= 4; i++) {
        await ctx.db.insert("tournamentParticipants", {
          tournamentId,
          bracketId,
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
    });

    await asUser.mutation(api.tournaments.startTournament, { tournamentId });

    const tournament = await t.run(async (ctx) => ctx.db.get(tournamentId));
    expect(tournament!.status).toBe("active");
    expect(tournament!.startDate).toBeDefined();

    // Check matches were generated
    const matches = await t.run(async (ctx) =>
      ctx.db
        .query("matches")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
        .collect()
    );
    expect(matches.length).toBeGreaterThan(0);
  });

  it("fails with fewer than 2 participants", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournament(t, userId);

    await expect(
      asUser.mutation(api.tournaments.startTournament, { tournamentId })
    ).rejects.toThrow("at least 2 participants");
  });

  it("cannot start an already active tournament", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournament(t, userId, { status: "active" });

    await expect(
      asUser.mutation(api.tournaments.startTournament, { tournamentId })
    ).rejects.toThrow();
  });
});

describe("cancelTournament", () => {
  it("cancels a draft tournament", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournament(t, userId);

    await asUser.mutation(api.tournaments.cancelTournament, { tournamentId });

    const tournament = await t.run(async (ctx) => ctx.db.get(tournamentId));
    expect(tournament!.status).toBe("cancelled");
  });

  it("cancels an active tournament", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournament(t, userId, { status: "active" });

    await asUser.mutation(api.tournaments.cancelTournament, { tournamentId });

    const tournament = await t.run(async (ctx) => ctx.db.get(tournamentId));
    expect(tournament!.status).toBe("cancelled");
  });

  it("cannot cancel completed tournament", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournament(t, userId, { status: "completed" });

    await expect(
      asUser.mutation(api.tournaments.cancelTournament, { tournamentId })
    ).rejects.toThrow("already completed or cancelled");
  });

  it("only owner can cancel", async () => {
    const t = getTestContext();
    const { userId: ownerId } = await setupUser(t, { name: "Owner", email: "owner@test.com" });
    const { asUser: asOther } = await setupUser(t, { name: "Other", email: "other@test.com" });
    const { tournamentId } = await createTournament(t, ownerId);

    await expect(
      asOther.mutation(api.tournaments.cancelTournament, { tournamentId })
    ).rejects.toThrow();
  });
});

describe("generateBlankBracket", () => {
  it("creates placeholder participants and bracket structure", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournament(t, userId);

    await asUser.mutation(api.tournaments.generateBlankBracket, {
      tournamentId,
      bracketSize: 4,
    });

    const participants = await t.run(async (ctx) =>
      ctx.db
        .query("tournamentParticipants")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
        .collect()
    );
    expect(participants).toHaveLength(4);
    expect(participants.every((p) => p.isPlaceholder === true)).toBe(true);

    const matches = await t.run(async (ctx) =>
      ctx.db
        .query("matches")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
        .collect()
    );
    expect(matches).toHaveLength(3); // 4-player single elim
  });

  it("rounds up to next power of 2", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournament(t, userId);

    await asUser.mutation(api.tournaments.generateBlankBracket, {
      tournamentId,
      bracketSize: 5, // Should round up to 8
    });

    const participants = await t.run(async (ctx) =>
      ctx.db
        .query("tournamentParticipants")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
        .collect()
    );
    expect(participants).toHaveLength(8);
  });

  it("rejects size over 128", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    const { tournamentId } = await createTournament(t, userId);

    await expect(
      asUser.mutation(api.tournaments.generateBlankBracket, {
        tournamentId,
        bracketSize: 200,
      })
    ).rejects.toThrow();
  });
});
