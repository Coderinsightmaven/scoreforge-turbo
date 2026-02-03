import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { themePreference } from "./schema";
import { errors } from "./lib/errors";
import { validateStringLength, MAX_LENGTHS } from "./lib/validation";

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
      throw errors.unauthenticated();
    }

    // Validate input length
    validateStringLength(args.name, "Name", MAX_LENGTHS.userName);

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
      throw errors.unauthenticated();
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

/**
 * Delete the current user's account and all associated data
 */
export const deleteAccount = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw errors.unauthenticated();
    }

    // 1. Delete user preferences
    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const pref of preferences) {
      await ctx.db.delete(pref._id);
    }

    // 2. Delete user scoring logs settings
    const scoringLogsSettings = await ctx.db
      .query("userScoringLogs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const setting of scoringLogsSettings) {
      await ctx.db.delete(setting._id);
    }

    // 3. Delete API keys
    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const key of apiKeys) {
      // Also delete associated rate limits
      const rateLimits = await ctx.db
        .query("apiRateLimits")
        .withIndex("by_api_key", (q) => q.eq("apiKeyId", key._id))
        .collect();
      for (const limit of rateLimits) {
        await ctx.db.delete(limit._id);
      }
      await ctx.db.delete(key._id);
    }

    // 4. Delete scorer assignments
    const scorerAssignments = await ctx.db
      .query("tournamentScorers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const assignment of scorerAssignments) {
      await ctx.db.delete(assignment._id);
    }

    // 5. Delete site admin record if exists
    const siteAdminRecord = await ctx.db
      .query("siteAdmins")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (siteAdminRecord) {
      await ctx.db.delete(siteAdminRecord._id);
    }

    // 6. Delete tournaments owned by the user (and all related data)
    const tournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_created_by", (q) => q.eq("createdBy", userId))
      .collect();

    for (const tournament of tournaments) {
      // Delete tournament brackets
      const brackets = await ctx.db
        .query("tournamentBrackets")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
        .collect();
      for (const bracket of brackets) {
        await ctx.db.delete(bracket._id);
      }

      // Delete tournament participants
      const participants = await ctx.db
        .query("tournamentParticipants")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
        .collect();
      for (const participant of participants) {
        await ctx.db.delete(participant._id);
      }

      // Delete matches
      const matches = await ctx.db
        .query("matches")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
        .collect();
      for (const match of matches) {
        await ctx.db.delete(match._id);
      }

      // Delete scoring input logs
      const scoringLogs = await ctx.db
        .query("scoringInputLogs")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
        .collect();
      for (const log of scoringLogs) {
        await ctx.db.delete(log._id);
      }

      // Delete tournament scorers for this tournament
      const tournamentScorers = await ctx.db
        .query("tournamentScorers")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
        .collect();
      for (const scorer of tournamentScorers) {
        await ctx.db.delete(scorer._id);
      }

      // Delete the tournament
      await ctx.db.delete(tournament._id);
    }

    // 7. Delete auth-related records
    // Delete from authSessions
    const authSessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
    for (const session of authSessions) {
      await ctx.db.delete(session._id);
    }

    // Delete from authAccounts
    const authAccounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .collect();
    for (const account of authAccounts) {
      await ctx.db.delete(account._id);
    }

    // 8. Finally, delete the user record
    await ctx.db.delete(userId);

    return null;
  },
});
