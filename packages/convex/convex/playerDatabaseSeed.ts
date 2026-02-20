"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { iocToIso } from "./lib/countryCodes";

// ============================================
// Seed Action
// ============================================

const PLAYERS_URLS: Record<string, string> = {
  ATP: "https://raw.githubusercontent.com/JeffSackmann/tennis_atp/master/atp_players.csv",
  WTA: "https://raw.githubusercontent.com/JeffSackmann/tennis_wta/master/wta_players.csv",
};

const RANKINGS_URLS: Record<string, string> = {
  ATP: "https://raw.githubusercontent.com/JeffSackmann/tennis_atp/master/atp_rankings_current.csv",
  WTA: "https://raw.githubusercontent.com/JeffSackmann/tennis_wta/master/wta_rankings_current.csv",
};

/**
 * Seed the player database from JeffSackmann's CSV data on GitHub.
 *
 * Fetches the current rankings CSV first to build a ranking map, then fetches
 * the players CSV and only imports players who have a current ranking.
 * This gives us ~500-2000 active players with rankings instead of 3000+ historical entries.
 */
export const seedPlayerDatabase = action({
  args: {
    tour: v.string(),
  },
  returns: v.object({ imported: v.number(), skipped: v.number() }),
  handler: async (ctx, args): Promise<{ imported: number; skipped: number }> => {
    const playersUrl = PLAYERS_URLS[args.tour];
    const rankingsUrl = RANKINGS_URLS[args.tour];
    if (!playersUrl || !rankingsUrl) {
      throw new Error(`Invalid tour: ${args.tour}. Must be "ATP" or "WTA".`);
    }

    // Step 1: Fetch current rankings to get latest ranking per player
    const rankingsResponse = await fetch(rankingsUrl);
    if (!rankingsResponse.ok) {
      throw new Error(
        `Failed to fetch rankings: ${rankingsResponse.status} ${rankingsResponse.statusText}`
      );
    }

    const rankingsText = await rankingsResponse.text();
    const rankingsLines = rankingsText.split("\n");

    // Rankings CSV: ranking_date,rank,player,points
    // Find the latest date and build a player_id -> rank map
    let latestDate = "";
    const rankingMap = new Map<string, number>();

    for (let i = 1; i < rankingsLines.length; i++) {
      const line = rankingsLines[i]?.trim();
      if (!line) continue;
      const fields = line.split(",");
      const date = fields[0] ?? "";
      const rank = parseInt(fields[1] ?? "", 10);
      const playerId = fields[2]?.trim() ?? "";

      if (!playerId || isNaN(rank)) continue;

      // Track the latest date
      if (date > latestDate) {
        latestDate = date;
        rankingMap.clear();
      }

      // Only keep entries from the latest date
      if (date === latestDate) {
        rankingMap.set(playerId, rank);
      }
    }

    // Step 2: Fetch players CSV and cross-reference with rankings
    const playersResponse = await fetch(playersUrl);
    if (!playersResponse.ok) {
      throw new Error(
        `Failed to fetch players: ${playersResponse.status} ${playersResponse.statusText}`
      );
    }

    const csvText = await playersResponse.text();
    const lines = csvText.split("\n");

    // Players CSV: player_id,name_first,name_last,hand,dob,ioc,height,wikidata_id
    let imported = 0;
    let skipped = 0;
    const batch: Array<{
      externalId: string;
      name: string;
      countryCode: string;
      tour: string;
      ranking: number | undefined;
    }> = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;

      const fields = line.split(",");
      const playerId = fields[0]?.trim() ?? "";
      const nameFirst = fields[1]?.trim() ?? "";
      const nameLast = fields[2]?.trim() ?? "";
      const iocCode = fields[5]?.trim() ?? "";

      // Only import players with a current ranking
      const ranking = rankingMap.get(playerId);
      if (ranking === undefined) {
        continue; // Skip unranked players
      }

      const fullName = `${nameFirst} ${nameLast}`.trim();
      if (!fullName) {
        skipped++;
        continue;
      }

      const isoCode = iocToIso(iocCode);
      if (!isoCode) {
        skipped++;
        continue;
      }

      batch.push({
        externalId: playerId,
        name: fullName,
        countryCode: isoCode,
        tour: args.tour,
        ranking,
      });

      if (batch.length >= 100) {
        const result = await ctx.runMutation(internal.playerDatabase.upsertPlayerBatch, {
          players: batch.splice(0, 100),
        });
        imported += result.upserted;
      }
    }

    if (batch.length > 0) {
      const result = await ctx.runMutation(internal.playerDatabase.upsertPlayerBatch, {
        players: batch,
      });
      imported += result.upserted;
    }

    return { imported, skipped };
  },
});
