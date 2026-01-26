import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { themePreference } from "./schema";

export const currentUser = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      image: v.optional(v.string()),
      isAnonymous: v.optional(v.boolean()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    // eslint-disable-next-line @convex-dev/explicit-table-ids -- userId is typed as Id<"users">
    return await ctx.db.get(userId);
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const updates: { name?: string; image?: string } = {};
    if (args.name !== undefined) {
      updates.name = args.name;
    }
    if (args.image !== undefined) {
      updates.image = args.image;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(userId, updates);
    }

    return null;
  },
});

/**
 * Get the user's onboarding state to determine where to redirect them
 * Now just checks if user has a name set (no org requirement)
 */
export const getOnboardingState = query({
  args: {},
  returns: v.union(
    v.object({
      hasName: v.boolean(),
      tournamentCount: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    // Check if user has a name set
    const hasName = !!user.name && user.name.trim().length > 0;

    // Count user's tournaments (owned + scoring)
    const ownedTournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_created_by", (q) => q.eq("createdBy", userId))
      .collect();

    const scorerAssignments = await ctx.db
      .query("tournamentScorers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get unique tournament count
    const tournamentIds = new Set<string>();
    for (const t of ownedTournaments) {
      tournamentIds.add(t._id);
    }
    for (const s of scorerAssignments) {
      tournamentIds.add(s.tournamentId);
    }

    return {
      hasName,
      tournamentCount: tournamentIds.size,
    };
  },
});

/**
 * Get the user's theme preference
 */
export const getThemePreference = query({
  args: {},
  returns: v.union(themePreference, v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }

    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return preferences?.themePreference ?? null;
  },
});

/**
 * Set the user's theme preference
 */
export const setThemePreference = mutation({
  args: {
    theme: themePreference,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        themePreference: args.theme,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("userPreferences", {
        userId,
        themePreference: args.theme,
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});
