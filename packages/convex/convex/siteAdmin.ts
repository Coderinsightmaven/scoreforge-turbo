import { getAuthUserId } from "@convex-dev/auth/server";
import {
  query,
  mutation,
  internalMutation,
  QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Helper to check if a user is a site admin
 */
export async function isSiteAdmin(
  ctx: QueryCtx,
  userId: Id<"users">
): Promise<boolean> {
  const admin = await ctx.db
    .query("siteAdmins")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  return admin !== null;
}

/**
 * Check if the current user is a site admin
 */
export const checkIsSiteAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return false;
    }
    return await isSiteAdmin(ctx, userId);
  },
});

/**
 * List all users with pagination and search
 */
export const listUsers = query({
  args: {
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    users: v.array(
      v.object({
        _id: v.id("users"),
        _creationTime: v.number(),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        isSiteAdmin: v.boolean(),
        tournamentCount: v.number(),
        scoringLogsEnabled: v.boolean(),
      })
    ),
    nextCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Verify caller is site admin
    if (!(await isSiteAdmin(ctx, userId))) {
      throw new Error("Not authorized: site admin access required");
    }

    const limit = args.limit ?? 20;
    const search = args.search?.toLowerCase().trim();

    if (!search) {
      try {
        const paginated = await ctx.db
          .query("users")
          .order("desc")
          .paginate({ numItems: limit, cursor: args.cursor ?? null });

        const enrichedUsers = await Promise.all(
          paginated.page.map(async (user) => {
            const isAdmin = await isSiteAdmin(ctx, user._id);

            const ownedTournaments = await ctx.db
              .query("tournaments")
              .withIndex("by_created_by", (q) => q.eq("createdBy", user._id))
              .collect();

            const scoringLogsSettings = await ctx.db
              .query("userScoringLogs")
              .withIndex("by_user", (q) => q.eq("userId", user._id))
              .first();

            return {
              _id: user._id,
              _creationTime: user._creationTime,
              name: user.name,
              email: user.email,
              isSiteAdmin: isAdmin,
              tournamentCount: ownedTournaments.length,
              scoringLogsEnabled: scoringLogsSettings?.enabled ?? false,
            };
          })
        );

        return {
          users: enrichedUsers,
          nextCursor: paginated.continueCursor,
        };
      } catch {
        // Fall back to legacy path below if cursor format is invalid.
      }
    }

    // Fast path for exact email search
    if (search && search.includes("@")) {
      const user = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", search))
        .first();

      const users = user ? [user] : [];
      const enrichedUsers = await Promise.all(
        users.map(async (u) => {
          const isAdmin = await isSiteAdmin(ctx, u._id);

          const ownedTournaments = await ctx.db
            .query("tournaments")
            .withIndex("by_created_by", (q) => q.eq("createdBy", u._id))
            .collect();

          const scoringLogsSettings = await ctx.db
            .query("userScoringLogs")
            .withIndex("by_user", (q) => q.eq("userId", u._id))
            .first();

          return {
            _id: u._id,
            _creationTime: u._creationTime,
            name: u.name,
            email: u.email,
            isSiteAdmin: isAdmin,
            tournamentCount: ownedTournaments.length,
            scoringLogsEnabled: scoringLogsSettings?.enabled ?? false,
          };
        })
      );

      return {
        users: enrichedUsers,
        nextCursor: null,
      };
    }

    // Legacy path with in-memory search and cursor by ID
    const allUsers = await ctx.db.query("users").collect();

    // Filter by search if provided
    let filteredUsers = allUsers;
    if (search) {
      filteredUsers = allUsers.filter((user) => {
        const name = user.name?.toLowerCase() ?? "";
        const email = user.email?.toLowerCase() ?? "";
        return name.includes(search) || email.includes(search);
      });
    }

    // Sort by creation time (newest first)
    filteredUsers.sort((a, b) => b._creationTime - a._creationTime);

    // Handle cursor-based pagination
    let startIndex = 0;
    if (args.cursor) {
      const cursorIndex = filteredUsers.findIndex(
        (u) => u._id === args.cursor
      );
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + limit);
    const nextCursor =
      startIndex + limit < filteredUsers.length
        ? paginatedUsers[paginatedUsers.length - 1]?._id ?? null
        : null;

    // Enrich with admin status, tournament count, and scoring logs status
    const enrichedUsers = await Promise.all(
      paginatedUsers.map(async (user) => {
        const isAdmin = await isSiteAdmin(ctx, user._id);

        // Count tournaments user owns
        const ownedTournaments = await ctx.db
          .query("tournaments")
          .withIndex("by_created_by", (q) => q.eq("createdBy", user._id))
          .collect();

        // Check scoring logs status
        const scoringLogsSettings = await ctx.db
          .query("userScoringLogs")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .first();

        return {
          _id: user._id,
          _creationTime: user._creationTime,
          name: user.name,
          email: user.email,
          isSiteAdmin: isAdmin,
          tournamentCount: ownedTournaments.length,
          scoringLogsEnabled: scoringLogsSettings?.enabled ?? false,
        };
      })
    );

    return {
      users: enrichedUsers,
      nextCursor,
    };
  },
});

/**
 * Get detailed user info including tournaments
 */
export const getUser = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      isSiteAdmin: v.boolean(),
      tournaments: v.array(
        v.object({
          _id: v.id("tournaments"),
          name: v.string(),
          status: v.string(),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (currentUserId === null) {
      throw new Error("Not authenticated");
    }

    // Verify caller is site admin
    if (!(await isSiteAdmin(ctx, currentUserId))) {
      throw new Error("Not authorized: site admin access required");
    }

    // eslint-disable-next-line @convex-dev/explicit-table-ids -- userId is typed as Id<"users">
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    const isAdmin = await isSiteAdmin(ctx, user._id);

    // Get tournaments user owns
    const tournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_created_by", (q) => q.eq("createdBy", user._id))
      .collect();

    return {
      _id: user._id,
      _creationTime: user._creationTime,
      name: user.name,
      email: user.email,
      isSiteAdmin: isAdmin,
      tournaments: tournaments.map((t) => ({
        _id: t._id,
        name: t.name,
        status: t.status,
      })),
    };
  },
});

/**
 * List all site admins
 */
export const listSiteAdmins = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("siteAdmins"),
      userId: v.id("users"),
      userName: v.optional(v.string()),
      userEmail: v.optional(v.string()),
      grantedBy: v.optional(v.id("users")),
      grantedByName: v.optional(v.string()),
      grantedAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Verify caller is site admin
    if (!(await isSiteAdmin(ctx, userId))) {
      throw new Error("Not authorized: site admin access required");
    }

    const admins = await ctx.db.query("siteAdmins").collect();

    const enrichedAdmins = await Promise.all(
      admins.map(async (admin) => {
        // eslint-disable-next-line @convex-dev/explicit-table-ids -- userId is typed as Id<"users">
        const user = await ctx.db.get(admin.userId);
        const grantedByUser = admin.grantedBy
          ? // eslint-disable-next-line @convex-dev/explicit-table-ids -- grantedBy is typed as Id<"users">
            await ctx.db.get(admin.grantedBy)
          : null;

        return {
          _id: admin._id,
          userId: admin.userId,
          userName: user?.name,
          userEmail: user?.email,
          grantedBy: admin.grantedBy,
          grantedByName: grantedByUser?.name,
          grantedAt: admin.grantedAt,
        };
      })
    );

    return enrichedAdmins;
  },
});

/**
 * Get system settings
 */
export const getSystemSettings = query({
  args: {},
  returns: v.union(
    v.object({
      maxTournamentsPerUser: v.number(),
      allowPublicRegistration: v.boolean(),
      maintenanceMode: v.boolean(),
      maintenanceMessage: v.optional(v.string()),
      updatedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Verify caller is site admin
    if (!(await isSiteAdmin(ctx, userId))) {
      throw new Error("Not authorized: site admin access required");
    }

    const settings = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    if (!settings) {
      return null;
    }

    // Handle both old and new field names
    const maxTournamentsPerUser = settings.maxTournamentsPerUser ?? settings.maxOrganizationsPerUser ?? 50;

    return {
      maxTournamentsPerUser,
      allowPublicRegistration: settings.allowPublicRegistration,
      maintenanceMode: settings.maintenanceMode,
      maintenanceMessage: settings.maintenanceMessage,
      updatedAt: settings.updatedAt,
    };
  },
});

/**
 * Get registration status (public - no auth required)
 * Used by sign-up page to check if registration is allowed
 */
export const getRegistrationStatus = query({
  args: {},
  returns: v.object({
    allowPublicRegistration: v.boolean(),
  }),
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    // Default to allowing registration if no settings exist
    return {
      allowPublicRegistration: settings?.allowPublicRegistration ?? true,
    };
  },
});

/**
 * Grant site admin status to a user
 */
export const grantSiteAdmin = mutation({
  args: {
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (currentUserId === null) {
      throw new Error("Not authenticated");
    }

    // Verify caller is site admin
    if (!(await isSiteAdmin(ctx, currentUserId))) {
      throw new Error("Not authorized: site admin access required");
    }

    // Check if user exists
    // eslint-disable-next-line @convex-dev/explicit-table-ids -- userId is typed as Id<"users">
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if already an admin
    const existing = await ctx.db
      .query("siteAdmins")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      throw new Error("User is already a site admin");
    }

    await ctx.db.insert("siteAdmins", {
      userId: args.userId,
      grantedBy: currentUserId,
      grantedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Revoke site admin status from a user
 */
export const revokeSiteAdmin = mutation({
  args: {
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (currentUserId === null) {
      throw new Error("Not authenticated");
    }

    // Verify caller is site admin
    if (!(await isSiteAdmin(ctx, currentUserId))) {
      throw new Error("Not authorized: site admin access required");
    }

    // Cannot revoke own admin status
    if (args.userId === currentUserId) {
      throw new Error("Cannot revoke your own admin status");
    }

    // Find the admin record
    const adminRecord = await ctx.db
      .query("siteAdmins")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!adminRecord) {
      throw new Error("User is not a site admin");
    }

    // Check that we're not removing the last admin
    const allAdmins = await ctx.db.query("siteAdmins").collect();
    if (allAdmins.length <= 1) {
      throw new Error("Cannot remove the last site admin");
    }

    // eslint-disable-next-line @convex-dev/explicit-table-ids -- _id is typed as Id<"siteAdmins">
    await ctx.db.delete(adminRecord._id);

    return null;
  },
});

/**
 * Update a user's name as admin
 */
export const updateUserAsAdmin = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (currentUserId === null) {
      throw new Error("Not authenticated");
    }

    // Verify caller is site admin
    if (!(await isSiteAdmin(ctx, currentUserId))) {
      throw new Error("Not authorized: site admin access required");
    }

    // Check if user exists
    // eslint-disable-next-line @convex-dev/explicit-table-ids -- userId is typed as Id<"users">
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // eslint-disable-next-line @convex-dev/explicit-table-ids -- userId is typed as Id<"users">
    await ctx.db.patch(args.userId, { name: args.name });

    return null;
  },
});

/**
 * Update system settings
 */
export const updateSystemSettings = mutation({
  args: {
    maxTournamentsPerUser: v.optional(v.number()),
    allowPublicRegistration: v.optional(v.boolean()),
    maintenanceMode: v.optional(v.boolean()),
    maintenanceMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    // Verify caller is site admin
    if (!(await isSiteAdmin(ctx, userId))) {
      throw new Error("Not authorized: site admin access required");
    }

    const existing = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    if (existing) {
      const updates: {
        maxTournamentsPerUser?: number;
        allowPublicRegistration?: boolean;
        maintenanceMode?: boolean;
        maintenanceMessage?: string;
        updatedBy: Id<"users">;
        updatedAt: number;
      } = {
        updatedBy: userId,
        updatedAt: Date.now(),
      };

      if (args.maxTournamentsPerUser !== undefined) {
        updates.maxTournamentsPerUser = args.maxTournamentsPerUser;
      }
      if (args.allowPublicRegistration !== undefined) {
        updates.allowPublicRegistration = args.allowPublicRegistration;
      }
      if (args.maintenanceMode !== undefined) {
        updates.maintenanceMode = args.maintenanceMode;
      }
      if (args.maintenanceMessage !== undefined) {
        updates.maintenanceMessage = args.maintenanceMessage;
      }

      // eslint-disable-next-line @convex-dev/explicit-table-ids -- _id is typed as Id<"systemSettings">
      await ctx.db.patch(existing._id, updates);
    } else {
      // Create default settings if none exist
      await ctx.db.insert("systemSettings", {
        key: "global",
        maxTournamentsPerUser: args.maxTournamentsPerUser ?? 50,
        allowPublicRegistration: args.allowPublicRegistration ?? true,
        maintenanceMode: args.maintenanceMode ?? false,
        maintenanceMessage: args.maintenanceMessage,
        updatedBy: userId,
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});

/**
 * Migrate systemSettings from maxOrganizationsPerUser to maxTournamentsPerUser
 * Run via: npx convex run siteAdmin:migrateSystemSettings
 */
export const migrateSystemSettings = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("systemSettings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .first();

    if (!settings) {
      return null;
    }

    // Cast to any to handle legacy field
    const legacySettings = settings as any;

    // Check if already migrated (has new field with a value)
    if (legacySettings.maxTournamentsPerUser !== undefined && legacySettings.maxTournamentsPerUser !== null) {
      return null;
    }

    // Get the old value
    const oldValue = legacySettings.maxOrganizationsPerUser ?? 50;

    // Delete the old document and create a new one with the correct field
    // eslint-disable-next-line @convex-dev/explicit-table-ids -- settings._id is typed
    await ctx.db.delete(legacySettings._id);
    await ctx.db.insert("systemSettings", {
      key: "global",
      maxTournamentsPerUser: oldValue,
      allowPublicRegistration: legacySettings.allowPublicRegistration,
      maintenanceMode: legacySettings.maintenanceMode,
      maintenanceMessage: legacySettings.maintenanceMessage,
      updatedBy: legacySettings.updatedBy,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Initialize the first site admin (internal use only)
 * Run via: npx convex run siteAdmin:initializeFirstAdmin '{"userId": "YOUR_USER_ID"}'
 */
export const initializeFirstAdmin = internalMutation({
  args: {
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if there are already any admins
    const existingAdmins = await ctx.db.query("siteAdmins").collect();
    if (existingAdmins.length > 0) {
      throw new Error(
        "Site admins already exist. Use grantSiteAdmin mutation instead."
      );
    }

    // Check if user exists
    // eslint-disable-next-line @convex-dev/explicit-table-ids -- userId is typed as Id<"users">
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Create the first admin (no grantedBy since this is bootstrap)
    await ctx.db.insert("siteAdmins", {
      userId: args.userId,
      grantedAt: Date.now(),
    });

    // Also create default system settings
    await ctx.db.insert("systemSettings", {
      key: "global",
      maxTournamentsPerUser: 50,
      allowPublicRegistration: true,
      maintenanceMode: false,
      updatedBy: args.userId,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// ============================================
// User Scoring Logs Management
// ============================================

/**
 * Get scoring logs setting for a specific user
 */
export const getUserScoringLogs = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (currentUserId === null) {
      throw new Error("Not authenticated");
    }

    // Verify caller is site admin
    if (!(await isSiteAdmin(ctx, currentUserId))) {
      throw new Error("Not authorized: site admin access required");
    }

    const setting = await ctx.db
      .query("userScoringLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    return setting?.enabled ?? false;
  },
});

/**
 * Toggle scoring logs for a user (admin only)
 */
export const toggleUserScoringLogs = mutation({
  args: {
    userId: v.id("users"),
    enabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (currentUserId === null) {
      throw new Error("Not authenticated");
    }

    // Verify caller is site admin
    if (!(await isSiteAdmin(ctx, currentUserId))) {
      throw new Error("Not authorized: site admin access required");
    }

    // Check if user exists
    // eslint-disable-next-line @convex-dev/explicit-table-ids -- userId is typed as Id<"users">
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const existing = await ctx.db
      .query("userScoringLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      // eslint-disable-next-line @convex-dev/explicit-table-ids -- _id is typed
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        updatedBy: currentUserId,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("userScoringLogs", {
        userId: args.userId,
        enabled: args.enabled,
        updatedBy: currentUserId,
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});

/**
 * Check if scoring logs are enabled for the current user
 * (Used by scoring functions to determine if logging should occur)
 */
export const isUserScoringLogsEnabled = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("userScoringLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    return setting?.enabled ?? false;
  },
});
