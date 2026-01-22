import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

/**
 * Organization roles:
 * - owner: Full control, can delete organization, manage all members
 * - admin: Can manage members (except owner), manage tournaments
 * - scorer: Can update scores and manage matches
 */
export const organizationRoles = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("scorer")
);

export default defineSchema({
  ...authTables,

  // Organizations table
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    createdBy: v.id("users"),
  })
    .index("by_slug", ["slug"])
    .index("by_created_by", ["createdBy"]),

  // Organization memberships - links users to organizations with roles
  organizationMembers: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    role: organizationRoles,
    invitedBy: v.optional(v.id("users")),
    joinedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_organization_and_user", ["organizationId", "userId"])
    .index("by_organization_and_role", ["organizationId", "role"]),

  // Organization invitations (for email-based invites)
  organizationInvitations: defineTable({
    organizationId: v.id("organizations"),
    email: v.string(),
    role: organizationRoles,
    invitedBy: v.id("users"),
    expiresAt: v.number(),
    token: v.string(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_email", ["email"])
    .index("by_token", ["token"]),
});
