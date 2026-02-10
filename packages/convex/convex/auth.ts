import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import type { MutationCtx } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        return {
          email: params.email as string,
          ...(params.name ? { name: params.name as string } : {}),
        };
      },
    }),
  ],
  callbacks: {
    async createOrUpdateUser(rawCtx, args) {
      // Cast to our typed ctx so we can use schema-aware queries
      const ctx = rawCtx as unknown as MutationCtx;

      // If user already has an account, allow sign-in (this is NOT a new registration)
      if (args.existingUserId !== null) {
        // Update existing user profile
        const { emailVerified: _ev, phoneVerified: _pv, ...profile } = args.profile;
        // eslint-disable-next-line @convex-dev/explicit-table-ids -- existingUserId is typed as Id<"users">
        await ctx.db.patch(args.existingUserId, profile);
        return args.existingUserId;
      }

      // New account creation — enforce allowPublicRegistration
      if (args.type === "credentials") {
        const settings = await ctx.db
          .query("systemSettings")
          .withIndex("by_key", (q) => q.eq("key", "global"))
          .first();

        if (settings && !settings.allowPublicRegistration) {
          throw new Error("Public registration is currently disabled");
        }
      }

      // Check for existing user with same email to link accounts
      const { email, emailVerified: _ev, phoneVerified: _pv, ...restProfile } = args.profile;
      if (typeof email === "string") {
        const existingUsers = await ctx.db
          .query("users")
          .withIndex("email", (q) => q.eq("email", email))
          .collect();
        if (existingUsers.length === 1) {
          const existingUser = existingUsers[0]!;
          // eslint-disable-next-line @convex-dev/explicit-table-ids -- existingUser._id is typed as Id<"users">
          await ctx.db.patch(existingUser._id, { email, ...restProfile });
          return existingUser._id;
        }
      }

      // Create new user
      return await ctx.db.insert("users", {
        email,
        ...restProfile,
      });
    },
  },
});
