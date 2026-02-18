import { query, mutation, internalMutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { themePreference } from "./schema";
import { errors } from "./lib/errors";
import { assertNotInMaintenance } from "./lib/maintenance";
import { validateStringLength, MAX_LENGTHS } from "./lib/validation";

/**
 * Get the current authenticated user from Clerk identity.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
    .unique();
}

/**
 * Get the current authenticated user or throw.
 * Use in mutations/queries that require authentication.
 */
export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Not authenticated");
  return user;
}

export const currentUser = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      name: v.string(),
      email: v.string(),
      image: v.optional(v.string()),
      externalId: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const userId = user._id;

    await assertNotInMaintenance(ctx, userId);

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
      await ctx.db.patch("users", userId, updates);
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
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }
    const userId = user._id;

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
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }
    const userId = user._id;

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
    const user = await getCurrentUserOrThrow(ctx);
    const userId = user._id;

    await assertNotInMaintenance(ctx, userId);

    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch("userPreferences", existing._id, {
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
    const user = await getCurrentUserOrThrow(ctx);
    const userId = user._id;

    await assertNotInMaintenance(ctx, userId);

    // 1. Delete user preferences
    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const pref of preferences) {
      await ctx.db.delete("userPreferences", pref._id);
    }

    // 2. Delete user scoring logs settings
    const scoringLogsSettings = await ctx.db
      .query("userScoringLogs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const setting of scoringLogsSettings) {
      await ctx.db.delete("userScoringLogs", setting._id);
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
        await ctx.db.delete("apiRateLimits", limit._id);
      }
      await ctx.db.delete("apiKeys", key._id);
    }

    // 4. Delete scorer assignments
    const scorerAssignments = await ctx.db
      .query("tournamentScorers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const assignment of scorerAssignments) {
      await ctx.db.delete("tournamentScorers", assignment._id);
    }

    // 5. Delete site admin record if exists (guard against removing last admin)
    const siteAdminRecord = await ctx.db
      .query("siteAdmins")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (siteAdminRecord) {
      const allAdmins = await ctx.db.query("siteAdmins").collect();
      if (allAdmins.length <= 1) {
        throw errors.invalidState(
          "Cannot delete the last site admin account. Transfer admin privileges to another user first."
        );
      }
      await ctx.db.delete("siteAdmins", siteAdminRecord._id);
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
        await ctx.db.delete("tournamentBrackets", bracket._id);
      }

      // Delete tournament participants
      const participants = await ctx.db
        .query("tournamentParticipants")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
        .collect();
      for (const participant of participants) {
        await ctx.db.delete("tournamentParticipants", participant._id);
      }

      // Delete matches
      const matches = await ctx.db
        .query("matches")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
        .collect();
      for (const match of matches) {
        await ctx.db.delete("matches", match._id);
      }

      // Delete scoring input logs
      const scoringLogs = await ctx.db
        .query("scoringInputLogs")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
        .collect();
      for (const log of scoringLogs) {
        await ctx.db.delete("scoringInputLogs", log._id);
      }

      // Delete tournament scorers for this tournament
      const tournamentScorers = await ctx.db
        .query("tournamentScorers")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
        .collect();
      for (const scorer of tournamentScorers) {
        await ctx.db.delete("tournamentScorers", scorer._id);
      }

      // Delete temporary scorers and their sessions for this tournament
      const tempScorers = await ctx.db
        .query("temporaryScorers")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
        .collect();
      for (const tempScorer of tempScorers) {
        const tempSessions = await ctx.db
          .query("temporaryScorerSessions")
          .withIndex("by_scorer", (q) => q.eq("scorerId", tempScorer._id))
          .collect();
        for (const tempSession of tempSessions) {
          await ctx.db.delete("temporaryScorerSessions", tempSession._id);
        }
        await ctx.db.delete("temporaryScorers", tempScorer._id);
      }

      // Delete the tournament
      await ctx.db.delete("tournaments", tournament._id);
    }

    // 7. Finally, delete the user record
    await ctx.db.delete("users", userId);

    return null;
  },
});

export const upsertFromClerk = internalMutation({
  args: { data: v.any() },
  returns: v.null(),
  handler: async (ctx, { data }) => {
    const attrs = {
      name: `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() || "Anonymous",
      email: data.email_addresses?.[0]?.email_address ?? "",
      externalId: data.id as string,
    };
    const existing = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", attrs.externalId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, attrs);
    } else {
      await ctx.db.insert("users", attrs);
    }
    return null;
  },
});

export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  returns: v.null(),
  handler: async (ctx, { clerkUserId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", clerkUserId))
      .unique();
    if (user) {
      await ctx.db.delete(user._id);
    }
    return null;
  },
});
