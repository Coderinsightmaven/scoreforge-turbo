import { getAuthUserId } from "@convex-dev/auth/server";
import { query, action } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { errors } from "./lib/errors";
import { getTournamentRole } from "./lib/accessControl";

// ============================================
// Types
// ============================================

const matchScoreResult = v.object({
  matchNumber: v.number(),
  round: v.number(),
  court: v.optional(v.string()),
  participant1Name: v.string(),
  participant2Name: v.string(),
  winnerName: v.string(),
  setsWonP1: v.number(),
  setsWonP2: v.number(),
  sets: v.array(
    v.object({
      p1Games: v.number(),
      p2Games: v.number(),
    })
  ),
  startedAt: v.number(),
  completedAt: v.number(),
});

// ============================================
// Queries
// ============================================

/**
 * Get completed tennis matches with set scores for a tournament
 */
export const getTournamentMatchScores = query({
  args: {
    tournamentId: v.id("tournaments"),
    bracketId: v.optional(v.id("tournamentBrackets")),
  },
  returns: v.array(matchScoreResult),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw errors.unauthenticated();
    }

    // Verify tournament exists and is tennis
    const tournament = await ctx.db.get("tournaments", args.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    if (tournament.sport !== "tennis") {
      return [];
    }

    // Check if user has access
    const role = await getTournamentRole(ctx, tournament, userId);
    if (!role) {
      throw errors.unauthorized();
    }

    // Get all completed matches (optionally filtered by bracket)
    let matches;
    if (args.bracketId !== undefined) {
      matches = await ctx.db
        .query("matches")
        .withIndex("by_bracket_and_status", (q: any) =>
          q.eq("bracketId", args.bracketId).eq("status", "completed")
        )
        .collect();
    } else {
      matches = await ctx.db
        .query("matches")
        .withIndex("by_tournament_and_status", (q: any) =>
          q.eq("tournamentId", args.tournamentId).eq("status", "completed")
        )
        .collect();
    }

    // Get participants for name lookup
    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament", (q: any) => q.eq("tournamentId", args.tournamentId))
      .collect();

    const participantMap = new Map(
      participants.map((p: Doc<"tournamentParticipants">) => [p._id, p])
    );

    // Transform matches (only those with tennisState)
    const results = matches
      .filter((m: Doc<"matches">) => m.tennisState)
      .map((match: Doc<"matches">) => {
        const p1 = match.participant1Id ? participantMap.get(match.participant1Id) : null;
        const p2 = match.participant2Id ? participantMap.get(match.participant2Id) : null;
        const winner = match.winnerId ? participantMap.get(match.winnerId) : null;
        const tennisState = match.tennisState!;

        // Extract set scores from tennisState.sets
        const sets = tennisState.sets.map((set: number[]) => ({
          p1Games: set[0] ?? 0,
          p2Games: set[1] ?? 0,
        }));

        return {
          matchNumber: match.matchNumber,
          round: match.round,
          court: match.court,
          participant1Name: p1?.displayName || "TBD",
          participant2Name: p2?.displayName || "TBD",
          winnerName: winner?.displayName || "TBD",
          setsWonP1: match.participant1Score,
          setsWonP2: match.participant2Score,
          sets,
          startedAt: match.startedAt || 0,
          completedAt: match.completedAt || 0,
        };
      })
      .sort(
        (a: { completedAt: number }, b: { completedAt: number }) => a.completedAt - b.completedAt
      );

    return results;
  },
});

/**
 * Check if a tournament has completed tennis matches for export
 */
export const hasCompletedTennisMatches = query({
  args: {
    tournamentId: v.id("tournaments"),
    bracketId: v.optional(v.id("tournamentBrackets")),
  },
  returns: v.object({
    hasMatches: v.boolean(),
    matchCount: v.number(),
    isTennis: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { hasMatches: false, matchCount: 0, isTennis: false };
    }

    const tournament = await ctx.db.get("tournaments", args.tournamentId);
    if (!tournament) {
      return { hasMatches: false, matchCount: 0, isTennis: false };
    }

    if (tournament.sport !== "tennis") {
      return { hasMatches: false, matchCount: 0, isTennis: false };
    }

    // Check if user has access
    const role = await getTournamentRole(ctx, tournament, userId);
    if (!role) {
      return { hasMatches: false, matchCount: 0, isTennis: true };
    }

    // Count completed matches with tennisState (optionally filtered by bracket)
    let matches;
    if (args.bracketId !== undefined) {
      matches = await ctx.db
        .query("matches")
        .withIndex("by_bracket_and_status", (q: any) =>
          q.eq("bracketId", args.bracketId).eq("status", "completed")
        )
        .collect();
    } else {
      matches = await ctx.db
        .query("matches")
        .withIndex("by_tournament_and_status", (q: any) =>
          q.eq("tournamentId", args.tournamentId).eq("status", "completed")
        )
        .collect();
    }

    const tennisMatches = matches.filter((m: Doc<"matches">) => m.tennisState).length;

    return {
      hasMatches: tennisMatches > 0,
      matchCount: tennisMatches,
      isTennis: true,
    };
  },
});

// ============================================
// Actions
// ============================================

/**
 * Escape a value for CSV
 */
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Match score type for the CSV generation
 */
type MatchScore = {
  matchNumber: number;
  round: number;
  court?: string;
  participant1Name: string;
  participant2Name: string;
  winnerName: string;
  setsWonP1: number;
  setsWonP2: number;
  sets: Array<{ p1Games: number; p2Games: number }>;
  startedAt: number;
  completedAt: number;
};

/**
 * Generate CSV string from match scores
 */
export const generateMatchScoresCSV = action({
  args: {
    tournamentId: v.id("tournaments"),
    bracketId: v.optional(v.id("tournamentBrackets")),
  },
  returns: v.object({
    csv: v.string(),
    filename: v.string(),
    matchCount: v.number(),
  }),
  handler: async (ctx, args): Promise<{ csv: string; filename: string; matchCount: number }> => {
    // Get match scores using the query
    const matches: MatchScore[] = await ctx.runQuery(api.reports.getTournamentMatchScores, {
      tournamentId: args.tournamentId,
      bracketId: args.bracketId,
    });

    // Get tournament info for filename
    const tournament = await ctx.runQuery(api.tournaments.getTournament, {
      tournamentId: args.tournamentId,
    });

    if (matches.length === 0) {
      return {
        csv: "",
        filename: "no-matches.csv",
        matchCount: 0,
      };
    }

    // Build CSV headers
    const headers: string[] = [
      "Match #",
      "Round",
      "Court",
      "Player 1",
      "Player 2",
      "Winner",
      "Final Score",
      "Set 1",
      "Set 2",
      "Set 3",
      "Set 4",
      "Set 5",
      "Started",
      "Completed",
    ];

    // Build CSV rows
    const rows: string[][] = matches.map((m: MatchScore) => {
      // Format timestamps
      const startedDate: string = m.startedAt
        ? new Date(m.startedAt).toISOString().replace("T", " ").slice(0, 19)
        : "";
      const completedDate: string = m.completedAt
        ? new Date(m.completedAt).toISOString().replace("T", " ").slice(0, 19)
        : "";

      return [
        m.matchNumber.toString(),
        m.round.toString(),
        m.court || "",
        escapeCSV(m.participant1Name),
        escapeCSV(m.participant2Name),
        escapeCSV(m.winnerName),
        `${m.setsWonP1}-${m.setsWonP2}`,
        m.sets[0] ? `${m.sets[0].p1Games}-${m.sets[0].p2Games}` : "",
        m.sets[1] ? `${m.sets[1].p1Games}-${m.sets[1].p2Games}` : "",
        m.sets[2] ? `${m.sets[2].p1Games}-${m.sets[2].p2Games}` : "",
        m.sets[3] ? `${m.sets[3].p1Games}-${m.sets[3].p2Games}` : "",
        m.sets[4] ? `${m.sets[4].p1Games}-${m.sets[4].p2Games}` : "",
        startedDate,
        completedDate,
      ];
    });

    // Combine into CSV string
    const csv: string = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");

    // Generate filename
    const tournamentName: string = tournament?.name || "tournament";
    const sanitizedName: string = tournamentName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const date: string = new Date().toISOString().split("T")[0] || "unknown";
    const filename: string = `${sanitizedName}-scores-${date}.csv`;

    return {
      csv,
      filename,
      matchCount: matches.length,
    };
  },
});
