import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Generate a cryptographically random API key
 * Format: sf_XXXXXXXX_YYYYYYYYYYYYYYYYYYYYYYYY
 * - "sf_" prefix for identification
 * - 8 char prefix (stored for display)
 * - 24 char random suffix
 */
function generateKey(): { fullKey: string; prefix: string } {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let prefixPart = "";
  let suffixPart = "";

  for (let i = 0; i < 8; i++) {
    prefixPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  for (let i = 0; i < 24; i++) {
    suffixPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const fullKey = `sf_${prefixPart}_${suffixPart}`;
  const prefix = `sf_${prefixPart}`;

  return { fullKey, prefix };
}

/**
 * Simple hash function for API keys
 * In production, use a proper cryptographic hash
 */
function hashKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to hex and pad
  const hashStr = Math.abs(hash).toString(16).padStart(8, "0");
  // Add the key length as additional entropy
  return `${hashStr}_${key.length}_${key.slice(-4)}`;
}

// ============================================
// Queries
// ============================================

/**
 * List all API keys for an organization (shows prefix only, not full key)
 */
export const listApiKeys = query({
  args: { organizationId: v.id("organizations") },
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
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Check user's role (only admin/owner can view API keys)
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (
      !membership ||
      (membership.role !== "owner" && membership.role !== "admin")
    ) {
      return [];
    }

    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
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
 * Generate a new API key for an organization (admin/owner only)
 * Returns the full key - this is the only time it will be visible
 */
export const generateApiKey = mutation({
  args: {
    organizationId: v.id("organizations"),
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

    // Check user's role (only admin/owner can create API keys)
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (
      !membership ||
      (membership.role !== "owner" && membership.role !== "admin")
    ) {
      throw new Error("Not authorized. Only owners and admins can create API keys.");
    }

    // Check organization exists
    const organization = await ctx.db.get("organizations", args.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    // Generate the key
    const { fullKey, prefix } = generateKey();
    const hashedKey = hashKey(fullKey);

    // Store the key
    const keyId = await ctx.db.insert("apiKeys", {
      organizationId: args.organizationId,
      key: hashedKey,
      keyPrefix: prefix,
      name: args.name,
      createdBy: userId,
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
 * Revoke (deactivate) an API key (admin/owner only)
 */
export const revokeApiKey = mutation({
  args: { keyId: v.id("apiKeys") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const apiKey = await ctx.db.get("apiKeys", args.keyId);
    if (!apiKey) {
      throw new Error("API key not found");
    }

    // Check user's role (only admin/owner can revoke API keys)
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", apiKey.organizationId).eq("userId", userId)
      )
      .first();

    if (
      !membership ||
      (membership.role !== "owner" && membership.role !== "admin")
    ) {
      throw new Error("Not authorized. Only owners and admins can revoke API keys.");
    }

    await ctx.db.patch("apiKeys", args.keyId, {
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

    const apiKey = await ctx.db.get("apiKeys", args.keyId);
    if (!apiKey) {
      throw new Error("API key not found");
    }

    // Check user's role (only owner can delete API keys)
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", apiKey.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership || membership.role !== "owner") {
      throw new Error("Only the owner can delete API keys.");
    }

    await ctx.db.delete("apiKeys", args.keyId);

    return null;
  },
});

// ============================================
// Internal helper for validating API keys
// ============================================

/**
 * Validate an API key and return the organization ID if valid
 * This is exported for use by publicApi.ts
 * Note: lastUsedAt is not updated here since queries have read-only db access
 */
export async function validateApiKey(
  ctx: { db: any },
  apiKey: string
): Promise<{ organizationId: string } | null> {
  const hashedKey = hashKey(apiKey);

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
    organizationId: keyRecord.organizationId,
  };
}

// Re-export the hash function for use in publicApi
export { hashKey };
