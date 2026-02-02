import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const API_KEY_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0 || maxExclusive > 0x100000000) {
    throw new Error("maxExclusive must be between 1 and 2^32");
  }

  const range = 0x100000000;
  const limit = Math.floor(range / maxExclusive) * maxExclusive;
  const buffer = new Uint32Array(1);

  while (true) {
    crypto.getRandomValues(buffer);
    const value = buffer[0]!;
    if (value < limit) {
      return value % maxExclusive;
    }
  }
}

function randomString(length: number, alphabet: string): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    const idx = randomInt(alphabet.length);
    result += alphabet.charAt(idx);
  }
  return result;
}

/**
 * Generate a cryptographically random API key
 * Format: sf_XXXXXXXX_YYYYYYYYYYYYYYYYYYYYYYYY
 * - "sf_" prefix for identification
 * - 8 char prefix (stored for display)
 * - 24 char random suffix
 */
function generateKey(): { fullKey: string; prefix: string } {
  const prefixPart = randomString(8, API_KEY_ALPHABET);
  const suffixPart = randomString(24, API_KEY_ALPHABET);

  const fullKey = `sf_${prefixPart}_${suffixPart}`;
  const prefix = `sf_${prefixPart}`;

  return { fullKey, prefix };
}

/**
 * Cryptographically secure hash function for API keys using SHA-256
 * Uses the Web Crypto API available in Convex runtime
 */
async function hashKeyAsync(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Synchronous wrapper that returns the hash
 * Note: This function is async internally but Convex handlers can await it
 */
function hashKey(key: string): Promise<string> {
  return hashKeyAsync(key);
}

// ============================================
// Queries
// ============================================

/**
 * List all API keys for the current user (shows prefix only, not full key)
 */
export const listApiKeys = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("apiKeys"),
      keyPrefix: v.string(),
      name: v.string(),
      createdAt: v.number(),
      lastUsedAt: v.optional(v.number()),
      isActive: v.boolean(),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return apiKeys.map((key) => ({
      _id: key._id,
      keyPrefix: key.keyPrefix,
      name: key.name,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      isActive: key.isActive,
    }));
  },
});

// ============================================
// Mutations
// ============================================

/**
 * Generate a new API key for the current user
 * Returns the full key - this is the only time it will be visible
 */
export const generateApiKey = mutation({
  args: {
    name: v.string(),
  },
  returns: v.object({
    keyId: v.id("apiKeys"),
    fullKey: v.string(), // Only returned once on creation
    keyPrefix: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Generate the key
    const { fullKey, prefix } = generateKey();
    const hashedKey = await hashKey(fullKey);

    // Store the key
    const keyId = await ctx.db.insert("apiKeys", {
      userId,
      key: hashedKey,
      keyPrefix: prefix,
      name: args.name,
      createdAt: Date.now(),
      isActive: true,
    });

    return {
      keyId,
      fullKey, // Only returned once
      keyPrefix: prefix,
    };
  },
});

/**
 * Revoke (deactivate) an API key (owner only)
 */
export const revokeApiKey = mutation({
  args: { keyId: v.id("apiKeys") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const apiKey = await ctx.db.get(args.keyId);
    if (!apiKey) {
      throw new Error("API key not found");
    }

    // Only the owner can revoke their API keys
    if (apiKey.userId !== userId) {
      throw new Error("Not authorized. You can only revoke your own API keys.");
    }

    await ctx.db.patch(args.keyId, {
      isActive: false,
    });

    return null;
  },
});

/**
 * Delete an API key permanently (owner only)
 */
export const deleteApiKey = mutation({
  args: { keyId: v.id("apiKeys") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const apiKey = await ctx.db.get(args.keyId);
    if (!apiKey) {
      throw new Error("API key not found");
    }

    // Only the owner can delete their API keys
    if (apiKey.userId !== userId) {
      throw new Error("Not authorized. You can only delete your own API keys.");
    }

    await ctx.db.delete(args.keyId);

    return null;
  },
});

// ============================================
// Internal helper for validating API keys
// ============================================

/**
 * Validate an API key and return the user ID if valid
 * This is exported for use by publicApi.ts
 * Note: lastUsedAt is not updated here since queries have read-only db access
 */
export async function validateApiKey(
  ctx: { db: any },
  apiKey: string
): Promise<{ userId: string } | null> {
  const hashedKey = await hashKey(apiKey);

  const keyRecord = await ctx.db
    .query("apiKeys")
    .withIndex("by_key", (q: any) => q.eq("key", hashedKey))
    .first();

  if (!keyRecord) {
    return null;
  }

  if (!keyRecord.isActive) {
    return null;
  }

  return {
    userId: keyRecord.userId,
  };
}

// Re-export the hash function for use in publicApi
export { hashKey };
