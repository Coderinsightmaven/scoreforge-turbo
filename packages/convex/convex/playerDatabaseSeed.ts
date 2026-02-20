"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { iocToIso } from "./lib/countryCodes";

// ============================================
// Seed Action
// ============================================

const CSV_URLS: Record<string, string> = {
  ATP: "https://raw.githubusercontent.com/JeffSackmann/tennis_atp/master/atp_players.csv",
  WTA: "https://raw.githubusercontent.com/JeffSackmann/tennis_wta/master/wta_players.csv",
};

/**
 * Seed the player database from JeffSackmann's CSV data on GitHub.
 *
 * Fetches the CSV, parses each row, maps IOC country codes to ISO alpha-2,
 * and upserts players in batches of 100.
 */
export const seedPlayerDatabase = action({
  args: {
    tour: v.string(),
  },
  returns: v.object({ imported: v.number(), skipped: v.number() }),
  handler: async (ctx, args): Promise<{ imported: number; skipped: number }> => {
    const url = CSV_URLS[args.tour];
    if (!url) {
      throw new Error(`Invalid tour: ${args.tour}. Must be "ATP" or "WTA".`);
    }

    // Fetch CSV from GitHub
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();
    const lines = csvText.split("\n");

    // Skip header row: player_id,name_first,name_last,hand,dob,ioc,height,wikidata_id
    let imported = 0;
    let skipped = 0;
    const batch: Array<{
      externalId: string;
      name: string;
      countryCode: string;
      tour: string;
    }> = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (!line) continue;

      // Parse CSV fields (simple split — these CSVs don't have quoted commas)
      const fields = line.split(",");
      const playerId = fields[0]?.trim() ?? "";
      const nameFirst = fields[1]?.trim() ?? "";
      const nameLast = fields[2]?.trim() ?? "";
      // fields[3] = hand, fields[4] = dob
      const iocCode = fields[5]?.trim() ?? "";

      // Combine first + last name
      const fullName = `${nameFirst} ${nameLast}`.trim();
      if (!fullName) {
        skipped++;
        continue;
      }

      // Convert IOC to ISO country code
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
      });

      // Process in batches of 100
      if (batch.length >= 100) {
        const result = await ctx.runMutation(internal.playerDatabase.upsertPlayerBatch, {
          players: batch.splice(0, 100),
        });
        imported += result.upserted;
      }
    }

    // Process remaining batch
    if (batch.length > 0) {
      const result = await ctx.runMutation(internal.playerDatabase.upsertPlayerBatch, {
        players: batch,
      });
      imported += result.upserted;
    }

    return { imported, skipped };
  },
});
