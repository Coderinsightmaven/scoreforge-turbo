import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

/**
 * One-time migration: deactivate all legacy temp scorers that don't have an assignedCourt.
 * Run via: npx convex run migrations/migrateTemporaryScorers:deactivateLegacyScorers
 */
export const deactivateLegacyScorers = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const allScorers = await ctx.db.query("temporaryScorers").collect();
    let count = 0;
    for (const scorer of allScorers) {
      if (scorer.assignedCourt === undefined) {
        await ctx.db.patch("temporaryScorers", scorer._id, { isActive: false });
        // Delete sessions
        const sessions = await ctx.db
          .query("temporaryScorerSessions")
          .withIndex("by_scorer", (q) => q.eq("scorerId", scorer._id))
          .collect();
        for (const session of sessions) {
          await ctx.db.delete("temporaryScorerSessions", session._id);
        }
        count++;
      }
    }
    return count;
  },
});
