import { describe, it, expect } from "vitest";
import { getTestContext } from "./testSetup";
import { api } from "../convex/_generated/api";

async function setupUser(
  t: ReturnType<typeof getTestContext>,
  overrides: { name?: string; email?: string } = {}
) {
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      name: overrides.name ?? "Test User",
      email: overrides.email ?? "test@example.com",
    });
  });
  const asUser = t.withIdentity({ subject: `${userId}|session123` });
  return { userId, asUser };
}

describe("currentUser", () => {
  it("returns null when unauthenticated", async () => {
    const t = getTestContext();
    const result = await t.query(api.users.currentUser);
    expect(result).toBeNull();
  });

  it("returns user when authenticated", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t, { name: "Alice", email: "alice@example.com" });
    const result = await asUser.query(api.users.currentUser);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Alice");
    expect(result!.email).toBe("alice@example.com");
  });
});

describe("updateProfile", () => {
  it("throws when unauthenticated", async () => {
    const t = getTestContext();
    await expect(t.mutation(api.users.updateProfile, { name: "New" })).rejects.toThrow();
  });

  it("updates user name", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    await asUser.mutation(api.users.updateProfile, { name: "Updated Name" });
    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user!.name).toBe("Updated Name");
  });

  it("rejects overly long names", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);
    const longName = "A".repeat(200);
    await expect(asUser.mutation(api.users.updateProfile, { name: longName })).rejects.toThrow();
  });
});

describe("getOnboardingState", () => {
  it("returns null when unauthenticated", async () => {
    const t = getTestContext();
    const result = await t.query(api.users.getOnboardingState);
    expect(result).toBeNull();
  });

  it("returns hasName true when user has name", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t, { name: "Alice" });
    const result = await asUser.query(api.users.getOnboardingState);
    expect(result).not.toBeNull();
    expect(result!.hasName).toBe(true);
    expect(result!.tournamentCount).toBe(0);
  });

  it("returns hasName false when user has no name", async () => {
    const t = getTestContext();
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", { email: "noname@example.com" });
    });
    const asUser = t.withIdentity({ subject: `${userId}|session123` });
    const result = await asUser.query(api.users.getOnboardingState);
    expect(result).not.toBeNull();
    expect(result!.hasName).toBe(false);
  });

  it("counts tournaments from owned and scored", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    // Create an owned tournament
    await t.run(async (ctx) => {
      await ctx.db.insert("tournaments", {
        createdBy: userId,
        name: "My Tournament",
        sport: "tennis",
        format: "single_elimination",
        participantType: "individual",
        maxParticipants: 8,
        status: "draft",
      });
    });
    const result = await asUser.query(api.users.getOnboardingState);
    expect(result!.tournamentCount).toBe(1);
  });
});

describe("getThemePreference", () => {
  it("returns null when unauthenticated", async () => {
    const t = getTestContext();
    const result = await t.query(api.users.getThemePreference);
    expect(result).toBeNull();
  });

  it("returns null when no preference set", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);
    const result = await asUser.query(api.users.getThemePreference);
    expect(result).toBeNull();
  });

  it("returns preference after setting", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);
    await asUser.mutation(api.users.setThemePreference, { theme: "dark" });
    const result = await asUser.query(api.users.getThemePreference);
    expect(result).toBe("dark");
  });
});

describe("setThemePreference", () => {
  it("throws when unauthenticated", async () => {
    const t = getTestContext();
    await expect(t.mutation(api.users.setThemePreference, { theme: "dark" })).rejects.toThrow();
  });

  it("creates preference when none exists", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);
    await asUser.mutation(api.users.setThemePreference, { theme: "light" });
    const result = await asUser.query(api.users.getThemePreference);
    expect(result).toBe("light");
  });

  it("updates existing preference", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);
    await asUser.mutation(api.users.setThemePreference, { theme: "light" });
    await asUser.mutation(api.users.setThemePreference, { theme: "system" });
    const result = await asUser.query(api.users.getThemePreference);
    expect(result).toBe("system");
  });
});

describe("deleteAccount", () => {
  it("throws when unauthenticated", async () => {
    const t = getTestContext();
    await expect(t.mutation(api.users.deleteAccount)).rejects.toThrow();
  });

  it("deletes user and their preferences", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);
    await asUser.mutation(api.users.setThemePreference, { theme: "dark" });
    await asUser.mutation(api.users.deleteAccount);

    const user = await t.run(async (ctx) => ctx.db.get(userId));
    expect(user).toBeNull();

    const prefs = await t.run(async (ctx) =>
      ctx.db
        .query("userPreferences")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
    );
    expect(prefs).toHaveLength(0);
  });

  it("deletes user's tournaments and related data", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);

    // Create a tournament with participants
    const tournamentId = await t.run(async (ctx) => {
      const tId = await ctx.db.insert("tournaments", {
        createdBy: userId,
        name: "To Delete",
        sport: "tennis",
        format: "single_elimination",
        participantType: "individual",
        maxParticipants: 8,
        status: "draft",
      });
      await ctx.db.insert("tournamentBrackets", {
        tournamentId: tId,
        name: "Main Draw",
        status: "draft",
        displayOrder: 1,
        createdAt: Date.now(),
      });
      await ctx.db.insert("tournamentParticipants", {
        tournamentId: tId,
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
      return tId;
    });

    await asUser.mutation(api.users.deleteAccount);

    const tournament = await t.run(async (ctx) => ctx.db.get(tournamentId));
    expect(tournament).toBeNull();

    const participants = await t.run(async (ctx) =>
      ctx.db
        .query("tournamentParticipants")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
        .collect()
    );
    expect(participants).toHaveLength(0);
  });

  it("deletes API keys and rate limits", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);

    const keyId = await t.run(async (ctx) => {
      const kId = await ctx.db.insert("apiKeys", {
        userId,
        key: "hashed_key",
        keyPrefix: "sf_test12",
        name: "Test Key",
        createdAt: Date.now(),
        isActive: true,
      });
      await ctx.db.insert("apiRateLimits", {
        apiKeyId: kId,
        windowStart: Date.now(),
        requestCount: 5,
      });
      return kId;
    });

    await asUser.mutation(api.users.deleteAccount);

    const key = await t.run(async (ctx) => ctx.db.get(keyId));
    expect(key).toBeNull();
  });
});
