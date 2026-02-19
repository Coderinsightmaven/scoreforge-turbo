import { describe, it, expect } from "vitest";
import { getTestContext } from "./testSetup";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

type TestCtx = ReturnType<typeof getTestContext>;

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

describe("listApiKeys", () => {
  it("returns empty for unauthenticated user", async () => {
    const t = getTestContext();
    const result = await t.query(api.apiKeys.listApiKeys);
    expect(result).toEqual([]);
  });

  it("returns user's API keys", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);

    await t.run(async (ctx) => {
      await ctx.db.insert("apiKeys", {
        userId,
        key: "hashed_key_1",
        keyPrefix: "sf_test1234",
        name: "My API Key",
        createdAt: Date.now(),
        isActive: true,
      });
    });

    const keys = await asUser.query(api.apiKeys.listApiKeys);
    expect(keys).toHaveLength(1);
    expect(keys[0]!.name).toBe("My API Key");
    expect(keys[0]!.keyPrefix).toBe("sf_test1234");
    expect(keys[0]!.isActive).toBe(true);
  });

  it("does not return other user's keys", async () => {
    const t = getTestContext();
    const { userId: otherUserId } = await setupUser(t, {
      name: "Other",
      email: "other@test.com",
    });
    const { asUser } = await setupUser(t, { name: "Me", email: "me@test.com" });

    await t.run(async (ctx) => {
      await ctx.db.insert("apiKeys", {
        userId: otherUserId,
        key: "hashed_key_other",
        keyPrefix: "sf_other123",
        name: "Other's Key",
        createdAt: Date.now(),
        isActive: true,
      });
    });

    const keys = await asUser.query(api.apiKeys.listApiKeys);
    expect(keys).toEqual([]);
  });
});

describe("generateApiKey", () => {
  it("throws when unauthenticated", async () => {
    const t = getTestContext();
    await expect(t.mutation(api.apiKeys.generateApiKey, { name: "Test" })).rejects.toThrow();
  });

  it("generates a new API key", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);

    const result = await asUser.mutation(api.apiKeys.generateApiKey, { name: "My Key" });

    expect(result.keyId).toBeDefined();
    expect(result.fullKey).toBeDefined();
    expect(result.keyPrefix).toBeDefined();
    expect(result.fullKey.startsWith("sf_")).toBe(true);
    expect(result.keyPrefix.startsWith("sf_")).toBe(true);
  });

  it("stores the key hashed, not in plaintext", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);

    const result = await asUser.mutation(api.apiKeys.generateApiKey, { name: "Secret" });

    const stored = await t.run(async (ctx) => ctx.db.get(result.keyId));
    expect(stored!.key).not.toBe(result.fullKey);
    expect(stored!.key.length).toBeGreaterThan(0);
  });

  it("validates name length", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);

    await expect(
      asUser.mutation(api.apiKeys.generateApiKey, { name: "A".repeat(200) })
    ).rejects.toThrow();
  });
});

describe("revokeApiKey", () => {
  it("revokes an API key", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);

    const keyId = await t.run(async (ctx) => {
      return await ctx.db.insert("apiKeys", {
        userId,
        key: "hashed_key",
        keyPrefix: "sf_test1234",
        name: "To Revoke",
        createdAt: Date.now(),
        isActive: true,
      });
    });

    await asUser.mutation(api.apiKeys.revokeApiKey, { keyId });

    const key = await t.run(async (ctx) => ctx.db.get(keyId));
    expect(key!.isActive).toBe(false);
  });

  it("cannot revoke another user's key", async () => {
    const t = getTestContext();
    const { userId: otherUserId } = await setupUser(t, {
      name: "Other",
      email: "other@test.com",
    });
    const { asUser } = await setupUser(t, { name: "Me", email: "me@test.com" });

    const keyId = await t.run(async (ctx) => {
      return await ctx.db.insert("apiKeys", {
        userId: otherUserId,
        key: "hashed_key",
        keyPrefix: "sf_other123",
        name: "Not Mine",
        createdAt: Date.now(),
        isActive: true,
      });
    });

    await expect(asUser.mutation(api.apiKeys.revokeApiKey, { keyId })).rejects.toThrow(
      "only revoke your own"
    );
  });
});

describe("deleteApiKey", () => {
  it("deletes an API key permanently", async () => {
    const t = getTestContext();
    const { userId, asUser } = await setupUser(t);

    const keyId = await t.run(async (ctx) => {
      return await ctx.db.insert("apiKeys", {
        userId,
        key: "hashed_key",
        keyPrefix: "sf_test1234",
        name: "To Delete",
        createdAt: Date.now(),
        isActive: true,
      });
    });

    await asUser.mutation(api.apiKeys.deleteApiKey, { keyId });

    const key = await t.run(async (ctx) => ctx.db.get(keyId));
    expect(key).toBeNull();
  });

  it("cannot delete another user's key", async () => {
    const t = getTestContext();
    const { userId: otherUserId } = await setupUser(t, {
      name: "Other",
      email: "other@test.com",
    });
    const { asUser } = await setupUser(t, { name: "Me", email: "me@test.com" });

    const keyId = await t.run(async (ctx) => {
      return await ctx.db.insert("apiKeys", {
        userId: otherUserId,
        key: "hashed_key",
        keyPrefix: "sf_other123",
        name: "Not Mine",
        createdAt: Date.now(),
        isActive: true,
      });
    });

    await expect(asUser.mutation(api.apiKeys.deleteApiKey, { keyId })).rejects.toThrow(
      "only delete your own"
    );
  });

  it("throws for non-existent key", async () => {
    const t = getTestContext();
    const { asUser } = await setupUser(t);

    await expect(
      asUser.mutation(api.apiKeys.deleteApiKey, { keyId: "fake" as Id<"apiKeys"> })
    ).rejects.toThrow();
  });
});
