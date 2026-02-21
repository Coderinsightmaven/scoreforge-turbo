import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrThrow } from "./users";

// ============================================
// Search Query
// ============================================

/**
 * Search the player database by name or browse by ranking.
 *
 * - If `searchQuery` is provided, uses full-text search on the `search_name` index.
 * - Otherwise, returns players ordered by ranking (via `by_tour_and_ranking` index).
 */
export const searchPlayers = query({
  args: {
    tour: v.optional(v.string()),
    searchQuery: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("playerDatabase"),
      name: v.string(),
      countryCode: v.string(),
      ranking: v.optional(v.number()),
      tour: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    await getCurrentUserOrThrow(ctx);

    const limit = args.limit ?? 50;

    // Full-text search path
    if (args.searchQuery && args.searchQuery.trim().length > 0) {
      const results = await ctx.db
        .query("playerDatabase")
        .withSearchIndex("search_name", (q) => q.search("name", args.searchQuery!))
        .take(limit);

      // Client-side filter by tour if specified, always include CUSTOM players
      const filtered = args.tour
        ? results.filter((p) => p.tour === args.tour || p.tour === "CUSTOM")
        : results;

      return filtered.map((p) => ({
        _id: p._id,
        name: p.name,
        countryCode: p.countryCode,
        ranking: p.ranking,
        tour: p.tour,
      }));
    }

    // Browse by ranking path
    if (args.tour) {
      // Fetch more than needed to filter out unranked, then sort by ranking
      const results = await ctx.db
        .query("playerDatabase")
        .withIndex("by_tour_and_ranking", (q) => q.eq("tour", args.tour!))
        .take(limit + 200);

      const ranked = results
        .filter((p) => p.ranking !== undefined)
        .sort((a, b) => (a.ranking ?? Infinity) - (b.ranking ?? Infinity))
        .slice(0, limit);

      // If we don't have enough ranked, fill with unranked
      if (ranked.length < limit) {
        const unranked = results.filter((p) => p.ranking === undefined);
        ranked.push(...unranked.slice(0, limit - ranked.length));
      }

      return ranked.map((p) => ({
        _id: p._id,
        name: p.name,
        countryCode: p.countryCode,
        ranking: p.ranking,
        tour: p.tour,
      }));
    }

    // No tour filter, no search — merge top-ranked from both ATP and WTA
    const [atpResults, wtaResults, customResults] = await Promise.all([
      ctx.db
        .query("playerDatabase")
        .withIndex("by_tour_and_ranking", (q) => q.eq("tour", "ATP"))
        .take(limit + 200),
      ctx.db
        .query("playerDatabase")
        .withIndex("by_tour_and_ranking", (q) => q.eq("tour", "WTA"))
        .take(limit + 200),
      ctx.db
        .query("playerDatabase")
        .withIndex("by_tour_and_ranking", (q) => q.eq("tour", "CUSTOM"))
        .take(limit),
    ]);

    const allRanked = [...atpResults, ...wtaResults]
      .filter((p) => p.ranking !== undefined)
      .sort((a, b) => (a.ranking ?? Infinity) - (b.ranking ?? Infinity))
      .slice(0, limit);

    // Append custom players if there's room
    if (allRanked.length < limit) {
      allRanked.push(...customResults.slice(0, limit - allRanked.length));
    }

    return allRanked.map((p) => ({
      _id: p._id,
      name: p.name,
      countryCode: p.countryCode,
      ranking: p.ranking,
      tour: p.tour,
    }));
  },
});

// ============================================
// Add Custom Player
// ============================================

/**
 * Save a manually-entered player to the database for future reuse.
 * Deduplicates by name (case-insensitive) within the "CUSTOM" tour.
 */
export const addCustomPlayer = mutation({
  args: {
    name: v.string(),
    countryCode: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    await getCurrentUserOrThrow(ctx);

    const name = args.name.trim();
    if (!name) return null;

    // Check if a custom player with this name already exists
    const existing = await ctx.db
      .query("playerDatabase")
      .withSearchIndex("search_name", (q) => q.search("name", name))
      .take(20);

    const alreadyExists = existing.some(
      (p) => p.tour === "CUSTOM" && p.name.toLowerCase() === name.toLowerCase()
    );

    if (alreadyExists) return null;

    await ctx.db.insert("playerDatabase", {
      name,
      countryCode: args.countryCode || "",
      tour: "CUSTOM",
    });

    return null;
  },
});

// ============================================
// Internal Mutation — Batch Upsert
// ============================================

/**
 * Upsert a batch of players into the playerDatabase table.
 * If a player with the same `externalId` already exists, patch it; otherwise insert.
 */
export const upsertPlayerBatch = internalMutation({
  args: {
    players: v.array(
      v.object({
        externalId: v.string(),
        name: v.string(),
        countryCode: v.string(),
        tour: v.string(),
        ranking: v.optional(v.number()),
      })
    ),
  },
  returns: v.object({ upserted: v.number() }),
  handler: async (ctx, args): Promise<{ upserted: number }> => {
    let upserted = 0;

    for (const player of args.players) {
      const existing = await ctx.db
        .query("playerDatabase")
        .withIndex("by_external_id", (q) => q.eq("externalId", player.externalId))
        .first();

      if (existing) {
        await ctx.db.patch("playerDatabase", existing._id, {
          name: player.name,
          countryCode: player.countryCode,
          tour: player.tour,
          ranking: player.ranking,
        });
      } else {
        await ctx.db.insert("playerDatabase", {
          externalId: player.externalId,
          name: player.name,
          countryCode: player.countryCode,
          tour: player.tour,
          ranking: player.ranking,
        });
      }

      upserted++;
    }

    return { upserted };
  },
});

// ============================================
// Cleanup
// ============================================

/**
 * Remove players without a ranking (leftover from old seed format).
 */
export const removeUnrankedPlayers = mutation({
  args: {},
  returns: v.object({ removed: v.number() }),
  handler: async (ctx): Promise<{ removed: number }> => {
    await getCurrentUserOrThrow(ctx);

    const allPlayers = await ctx.db.query("playerDatabase").collect();
    let removed = 0;
    for (const player of allPlayers) {
      // Only remove unranked ATP/WTA players, not custom players
      if (player.ranking === undefined && player.tour !== "CUSTOM") {
        await ctx.db.delete("playerDatabase", player._id);
        removed++;
      }
    }
    return { removed };
  },
});
