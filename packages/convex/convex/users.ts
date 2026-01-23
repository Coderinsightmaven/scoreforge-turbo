import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

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
 */
export const getOnboardingState = query({
  args: {},
  returns: v.union(
    v.object({
      hasName: v.boolean(),
      organizationCount: v.number(),
      pendingInvitationCount: v.number(),
      organizations: v.array(
        v.object({
          _id: v.id("organizations"),
          name: v.string(),
          slug: v.string(),
        })
      ),
      pendingInvitations: v.array(
        v.object({
          _id: v.id("organizationInvitations"),
          organizationId: v.id("organizations"),
          organizationName: v.string(),
          organizationSlug: v.string(),
          role: v.string(),
          token: v.string(),
        })
      ),
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

    // Get user's organizations
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        if (!org) return null;
        return {
          _id: org._id,
          name: org.name,
          slug: org.slug,
        };
      })
    );

    const validOrganizations = organizations.filter((org) => org !== null);

    // Get pending invitations for this user's email
    let pendingInvitations: {
      _id: Id<"organizationInvitations">;
      organizationId: Id<"organizations">;
      organizationName: string;
      organizationSlug: string;
      role: string;
      token: string;
    }[] = [];

    if (user.email) {
      const invitations = await ctx.db
        .query("organizationInvitations")
        .withIndex("by_email", (q) => q.eq("email", user.email as string))
        .collect();

      const now = Date.now();
      const validInvitations = await Promise.all(
        invitations
          .filter((inv) => inv.expiresAt > now)
          .map(async (inv) => {
            const org = await ctx.db.get(inv.organizationId);
            if (!org) return null;
            return {
              _id: inv._id,
              organizationId: inv.organizationId,
              organizationName: org.name,
              organizationSlug: org.slug,
              role: inv.role,
              token: inv.token,
            };
          })
      );

      pendingInvitations = validInvitations.filter((inv) => inv !== null) as typeof pendingInvitations;
    }

    return {
      hasName,
      organizationCount: validOrganizations.length,
      pendingInvitationCount: pendingInvitations.length,
      organizations: validOrganizations,
      pendingInvitations,
    };
  },
});
