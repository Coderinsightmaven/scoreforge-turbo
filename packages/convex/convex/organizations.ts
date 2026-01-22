import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { organizationRoles } from "./schema";

// Helper to generate a URL-friendly slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ============================================
// Queries
// ============================================

/**
 * Get all organizations the current user is a member of
 */
export const listMyOrganizations = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("organizations"),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      description: v.optional(v.string()),
      image: v.optional(v.string()),
      role: organizationRoles,
      memberCount: v.number(),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Get all memberships for the user
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Fetch organization details for each membership
    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        if (!org) return null;

        // Count members
        const members = await ctx.db
          .query("organizationMembers")
          .withIndex("by_organization", (q) =>
            q.eq("organizationId", membership.organizationId)
          )
          .collect();

        return {
          _id: org._id,
          _creationTime: org._creationTime,
          name: org.name,
          slug: org.slug,
          description: org.description,
          image: org.image,
          role: membership.role,
          memberCount: members.length,
        };
      })
    );

    return organizations.filter((org) => org !== null);
  },
});

/**
 * Get a single organization by ID (must be a member)
 */
export const getOrganization = query({
  args: { organizationId: v.id("organizations") },
  returns: v.union(
    v.object({
      _id: v.id("organizations"),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      description: v.optional(v.string()),
      image: v.optional(v.string()),
      createdBy: v.id("users"),
      myRole: organizationRoles,
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Check if user is a member
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership) {
      return null;
    }

    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return null;
    }

    return {
      _id: org._id,
      _creationTime: org._creationTime,
      name: org.name,
      slug: org.slug,
      description: org.description,
      image: org.image,
      createdBy: org.createdBy,
      myRole: membership.role,
    };
  },
});

/**
 * Get organization by slug (must be a member)
 */
export const getOrganizationBySlug = query({
  args: { slug: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("organizations"),
      _creationTime: v.number(),
      name: v.string(),
      slug: v.string(),
      description: v.optional(v.string()),
      image: v.optional(v.string()),
      createdBy: v.id("users"),
      myRole: organizationRoles,
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!org) {
      return null;
    }

    // Check if user is a member
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", org._id).eq("userId", userId)
      )
      .first();

    if (!membership) {
      return null;
    }

    return {
      _id: org._id,
      _creationTime: org._creationTime,
      name: org.name,
      slug: org.slug,
      description: org.description,
      image: org.image,
      createdBy: org.createdBy,
      myRole: membership.role,
    };
  },
});

// ============================================
// Mutations
// ============================================

/**
 * Create a new organization (creator becomes owner)
 */
export const createOrganization = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.id("organizations"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Generate unique slug
    let baseSlug = generateSlug(args.name);
    let slug = baseSlug;
    let counter = 1;

    // Check for slug collisions
    while (true) {
      const existing = await ctx.db
        .query("organizations")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create the organization
    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      slug,
      description: args.description,
      createdBy: userId,
    });

    // Add creator as owner
    await ctx.db.insert("organizationMembers", {
      organizationId: orgId,
      userId,
      role: "owner",
      joinedAt: Date.now(),
    });

    return orgId;
  },
});

/**
 * Update organization details (admin or owner only)
 */
export const updateOrganization = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check user's role
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("Not authorized");
    }

    const updates: { name?: string; description?: string; slug?: string } = {};

    if (args.name !== undefined) {
      updates.name = args.name;
      // Update slug if name changes
      let baseSlug = generateSlug(args.name);
      let slug = baseSlug;
      let counter = 1;

      while (true) {
        const existing = await ctx.db
          .query("organizations")
          .withIndex("by_slug", (q) => q.eq("slug", slug))
          .first();
        if (!existing || existing._id === args.organizationId) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      updates.slug = slug;
    }

    if (args.description !== undefined) {
      updates.description = args.description;
    }

    await ctx.db.patch(args.organizationId, updates);
    return null;
  },
});

/**
 * Delete organization (owner only)
 */
export const deleteOrganization = mutation({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check user is owner
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization_and_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", userId)
      )
      .first();

    if (!membership || membership.role !== "owner") {
      throw new Error("Only the owner can delete an organization");
    }

    // Delete all memberships
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    // Delete all invitations
    const invitations = await ctx.db
      .query("organizationInvitations")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    for (const invitation of invitations) {
      await ctx.db.delete(invitation._id);
    }

    // Delete the organization
    await ctx.db.delete(args.organizationId);
    return null;
  },
});
