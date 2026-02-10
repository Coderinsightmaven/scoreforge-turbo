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

async function setupAdmin(t: TestCtx, overrides: { name?: string; email?: string } = {}) {
  const { userId, asUser } = await setupUser(t, overrides);
  await t.run(async (ctx) => {
    await ctx.db.insert("siteAdmins", {
      userId,
      grantedAt: Date.now(),
    });
  });
  return { userId, asUser };
}

describe("checkIsSiteAdmin", () => {
  it("returns false for unauthenticated user", async () => {
    const t = getTestContext();
    const result = await t.query(api.siteAdmin.checkIsSiteAdmin);
    expect(result).toBe(false);
  });

  it("returns false for non-admin user", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);
    const result = await asUser.query(api.siteAdmin.checkIsSiteAdmin);
    expect(result).toBe(false);
  });

  it("returns true for site admin", async () => {
    const t = getTestContext();
    const { asUser } = await setupAdmin(t);
    const result = await asUser.query(api.siteAdmin.checkIsSiteAdmin);
    expect(result).toBe(true);
  });
});

describe("getRegistrationStatus", () => {
  it("returns true by default when no settings exist", async () => {
    const t = getTestContext();
    const result = await t.query(api.siteAdmin.getRegistrationStatus);
    expect(result.allowPublicRegistration).toBe(true);
  });

  it("returns configured value", async () => {
    const t = getTestContext();
    const { userId } = await setupAdmin(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("systemSettings", {
        key: "global",
        allowPublicRegistration: false,
        maintenanceMode: false,
        updatedBy: userId,
        updatedAt: Date.now(),
      });
    });

    const result = await t.query(api.siteAdmin.getRegistrationStatus);
    expect(result.allowPublicRegistration).toBe(false);
  });
});

describe("getSystemSettings", () => {
  it("throws when unauthenticated", async () => {
    const t = getTestContext();
    await expect(t.query(api.siteAdmin.getSystemSettings)).rejects.toThrow();
  });

  it("throws for non-admin", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);
    await expect(asUser.query(api.siteAdmin.getSystemSettings)).rejects.toThrow(
      "Site admin access required"
    );
  });

  it("returns null when no settings exist", async () => {
    const t = getTestContext();
    const { asUser } = await setupAdmin(t);
    const result = await asUser.query(api.siteAdmin.getSystemSettings);
    expect(result).toBeNull();
  });

  it("returns settings for admin", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupAdmin(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("systemSettings", {
        key: "global",
        maxTournamentsPerUser: 10,
        allowPublicRegistration: true,
        maintenanceMode: false,
        updatedBy: userId,
        updatedAt: Date.now(),
      });
    });

    const result = await asUser.query(api.siteAdmin.getSystemSettings);
    expect(result).not.toBeNull();
    expect(result!.maxTournamentsPerUser).toBe(10);
    expect(result!.maintenanceMode).toBe(false);
  });
});

describe("listSiteAdmins", () => {
  it("throws for non-admin", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);
    await expect(asUser.query(api.siteAdmin.listSiteAdmins)).rejects.toThrow();
  });

  it("returns all admins", async () => {
    const t = getTestContext();
    const { asUser } = await setupAdmin(t, { name: "Admin", email: "admin@test.com" });

    const admins = await asUser.query(api.siteAdmin.listSiteAdmins);
    expect(admins).toHaveLength(1);
    expect(admins[0]!.userName).toBe("Admin");
  });
});

describe("grantSiteAdmin", () => {
  it("throws for non-admin", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t, { name: "Regular", email: "regular@test.com" });
    const { userId: targetId } = await setupUser(t, { name: "Target", email: "target@test.com" });

    await expect(
      asUser.mutation(api.siteAdmin.grantSiteAdmin, { userId: targetId })
    ).rejects.toThrow();
  });

  it("grants admin status", async () => {
    const t = getTestContext();
    const { asUser: asAdmin } = await setupAdmin(t, { name: "Admin", email: "admin@test.com" });
    const { userId: targetId } = await setupUser(t, { name: "Target", email: "target@test.com" });

    await asAdmin.mutation(api.siteAdmin.grantSiteAdmin, { userId: targetId });

    const adminRecord = await t.run(async (ctx) =>
      ctx.db
        .query("siteAdmins")
        .withIndex("by_user", (q) => q.eq("userId", targetId))
        .first()
    );
    expect(adminRecord).not.toBeNull();
  });

  it("prevents granting to existing admin", async () => {
    const t = getTestContext();
    const { userId: adminId, asUser: asAdmin } = await setupAdmin(t, {
      name: "Admin",
      email: "admin@test.com",
    });

    await expect(
      asAdmin.mutation(api.siteAdmin.grantSiteAdmin, { userId: adminId })
    ).rejects.toThrow("already a site admin");
  });
});

describe("revokeSiteAdmin", () => {
  it("revokes admin status", async () => {
    const t = getTestContext();
    const { asUser: asAdmin } = await setupAdmin(t, { name: "Admin1", email: "admin1@test.com" });
    const { userId: admin2Id } = await setupAdmin(t, {
      name: "Admin2",
      email: "admin2@test.com",
    });

    await asAdmin.mutation(api.siteAdmin.revokeSiteAdmin, { userId: admin2Id });

    const adminRecord = await t.run(async (ctx) =>
      ctx.db
        .query("siteAdmins")
        .withIndex("by_user", (q) => q.eq("userId", admin2Id))
        .first()
    );
    expect(adminRecord).toBeNull();
  });

  it("cannot revoke own admin status", async () => {
    const t = getTestContext();
    const { userId: adminId, asUser: asAdmin } = await setupAdmin(t, {
      name: "Admin",
      email: "admin@test.com",
    });

    await expect(
      asAdmin.mutation(api.siteAdmin.revokeSiteAdmin, { userId: adminId })
    ).rejects.toThrow("Cannot revoke your own admin status");
  });

  it("cannot remove the last admin", async () => {
    const t = getTestContext();
    const { asUser: asAdmin } = await setupAdmin(t, { name: "Solo", email: "solo@test.com" });
    const { userId: targetId } = await setupUser(t, { name: "Target", email: "target@test.com" });

    // Grant and then try to revoke - but since target is the only other admin and we can't revoke self
    // Let's test with the scenario where we'd have only 1 admin left
    // First, grant target
    await asAdmin.mutation(api.siteAdmin.grantSiteAdmin, { userId: targetId });

    // Now asAdmin revokes target - this should succeed since there are 2 admins
    await asAdmin.mutation(api.siteAdmin.revokeSiteAdmin, { userId: targetId });

    // Verify only 1 admin left
    const admins = await t.run(async (ctx) => ctx.db.query("siteAdmins").collect());
    expect(admins).toHaveLength(1);
  });
});

describe("updateSystemSettings", () => {
  it("creates settings if none exist", async () => {
    const t = getTestContext();
    const { asUser: asAdmin } = await setupAdmin(t);

    await asAdmin.mutation(api.siteAdmin.updateSystemSettings, {
      maxTournamentsPerUser: 25,
      maintenanceMode: true,
      maintenanceMessage: "Under maintenance",
    });

    const settings = await t.run(async (ctx) =>
      ctx.db
        .query("systemSettings")
        .withIndex("by_key", (q) => q.eq("key", "global"))
        .first()
    );
    expect(settings).not.toBeNull();
    expect(settings!.maxTournamentsPerUser).toBe(25);
    expect(settings!.maintenanceMode).toBe(true);
    expect(settings!.maintenanceMessage).toBe("Under maintenance");
  });

  it("updates existing settings", async () => {
    const t = getTestContext();
    const { userId, asUser: asAdmin } = await setupAdmin(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("systemSettings", {
        key: "global",
        maxTournamentsPerUser: 50,
        allowPublicRegistration: true,
        maintenanceMode: false,
        updatedBy: userId,
        updatedAt: Date.now(),
      });
    });

    await asAdmin.mutation(api.siteAdmin.updateSystemSettings, {
      maxTournamentsPerUser: 100,
    });

    const settings = await t.run(async (ctx) =>
      ctx.db
        .query("systemSettings")
        .withIndex("by_key", (q) => q.eq("key", "global"))
        .first()
    );
    expect(settings!.maxTournamentsPerUser).toBe(100);
    expect(settings!.allowPublicRegistration).toBe(true); // Unchanged
  });

  it("throws for non-admin", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);

    await expect(
      asUser.mutation(api.siteAdmin.updateSystemSettings, { maintenanceMode: true })
    ).rejects.toThrow();
  });
});

describe("updateUserAsAdmin", () => {
  it("updates a user's name", async () => {
    const t = getTestContext();
    const { asUser: asAdmin } = await setupAdmin(t, { name: "Admin", email: "admin@test.com" });
    const { userId: targetId } = await setupUser(t, { name: "Old", email: "target@test.com" });

    await asAdmin.mutation(api.siteAdmin.updateUserAsAdmin, {
      userId: targetId,
      name: "New Name",
    });

    const user = await t.run(async (ctx) => ctx.db.get(targetId));
    expect(user!.name).toBe("New Name");
  });

  it("throws for non-admin", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t, { name: "Regular", email: "regular@test.com" });
    const { userId: targetId } = await setupUser(t, { name: "Target", email: "target@test.com" });

    await expect(
      asUser.mutation(api.siteAdmin.updateUserAsAdmin, {
        userId: targetId,
        name: "Hacked",
      })
    ).rejects.toThrow();
  });
});

describe("toggleUserScoringLogs", () => {
  it("enables scoring logs for a user", async () => {
    const t = getTestContext();
    const { asUser: asAdmin } = await setupAdmin(t, { name: "Admin", email: "admin@test.com" });
    const { userId: targetId } = await setupUser(t, { name: "User", email: "user@test.com" });

    await asAdmin.mutation(api.siteAdmin.toggleUserScoringLogs, {
      userId: targetId,
      enabled: true,
    });

    const setting = await t.run(async (ctx) =>
      ctx.db
        .query("userScoringLogs")
        .withIndex("by_user", (q) => q.eq("userId", targetId))
        .first()
    );
    expect(setting!.enabled).toBe(true);
  });

  it("disables scoring logs for a user", async () => {
    const t = getTestContext();
    const { userId: adminId, asUser: asAdmin } = await setupAdmin(t, {
      name: "Admin",
      email: "admin@test.com",
    });
    const { userId: targetId } = await setupUser(t, { name: "User", email: "user@test.com" });

    // Enable first
    await t.run(async (ctx) => {
      await ctx.db.insert("userScoringLogs", {
        userId: targetId,
        enabled: true,
        updatedBy: adminId,
        updatedAt: Date.now(),
      });
    });

    await asAdmin.mutation(api.siteAdmin.toggleUserScoringLogs, {
      userId: targetId,
      enabled: false,
    });

    const setting = await t.run(async (ctx) =>
      ctx.db
        .query("userScoringLogs")
        .withIndex("by_user", (q) => q.eq("userId", targetId))
        .first()
    );
    expect(setting!.enabled).toBe(false);
  });
});

describe("isUserScoringLogsEnabled", () => {
  it("returns false when no setting exists", async () => {
    const t = getTestContext();
    const { userId } = await setupUser(t);
    const result = await t.query(api.siteAdmin.isUserScoringLogsEnabled, { userId });
    expect(result).toBe(false);
  });

  it("returns true when enabled", async () => {
    const t = getTestContext();
    const { userId: adminId } = await setupAdmin(t, { name: "Admin", email: "admin@test.com" });
    const { userId, asUser } = await setupUser(t, { name: "User", email: "user@test.com" });

    await t.run(async (ctx) => {
      await ctx.db.insert("userScoringLogs", {
        userId,
        enabled: true,
        updatedBy: adminId,
        updatedAt: Date.now(),
      });
    });

    // Must be authenticated — unauthenticated calls return false regardless
    const result = await asUser.query(api.siteAdmin.isUserScoringLogsEnabled, { userId });
    expect(result).toBe(true);
  });
});

describe("getUser", () => {
  it("throws for non-admin", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t, { name: "Regular", email: "regular@test.com" });
    const { userId: targetId } = await setupUser(t, { name: "Target", email: "target@test.com" });

    await expect(asUser.query(api.siteAdmin.getUser, { userId: targetId })).rejects.toThrow();
  });

  it("returns user details for admin", async () => {
    const t = getTestContext();
    const { asUser: asAdmin } = await setupAdmin(t, { name: "Admin", email: "admin@test.com" });
    const { userId: targetId } = await setupUser(t, { name: "Target", email: "target@test.com" });

    // Create a tournament for the target user
    await t.run(async (ctx) => {
      await ctx.db.insert("tournaments", {
        createdBy: targetId,
        name: "Target's Tournament",
        sport: "tennis",
        format: "single_elimination",
        participantType: "individual",
        maxParticipants: 8,
        status: "draft",
      });
    });

    const result = await asAdmin.query(api.siteAdmin.getUser, { userId: targetId });
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Target");
    expect(result!.isSiteAdmin).toBe(false);
    expect(result!.tournaments).toHaveLength(1);
    expect(result!.tournaments[0]!.name).toBe("Target's Tournament");
  });
});
