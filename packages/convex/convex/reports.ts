import { getAuthUserId } from "@convex-dev/auth/server";
import { query, action } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import { api } from "./_generated/api";

// ============================================
// Access Control Helpers
// ============================================

/**
 * Get user's role for a tournament
 */
async function getTournamentRole(
  ctx: { db: any },
  tournamentId: Id<"tournaments">,
  userId: Id<"users">
): Promise<"owner" | "scorer" | null> {
  const tournament = await ctx.db.get(tournamentId);
  if (!tournament) return null;
  if (tournament.createdBy === userId) return "owner";

  const scorer = await ctx.db
    .query("tournamentScorers")
    .withIndex("by_tournament_and_user", (q: any) =>
      q.eq("tournamentId", tournamentId).eq("userId", userId)
    )
    .first();
  return scorer ? "scorer" : null;
}

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
  },
  returns: v.array(matchScoreResult),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify tournament exists and is tennis
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw new Error("Tournament not found");
    }

    if (tournament.sport !== "tennis") {
      return [];
    }

    // Check if user has access
    const role = await getTournamentRole(ctx, args.tournamentId, userId);
    if (!role) {
      throw new Error("Not authorized");
    }

    // Get all completed matches
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournament_and_status", (q: any) =>
        q.eq("tournamentId", args.tournamentId).eq("status", "completed")
      )
      .collect();

    // Get participants for name lookup
    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament", (q: any) =>
        q.eq("tournamentId", args.tournamentId)
      )
      .collect();

    const participantMap = new Map(
      participants.map((p: Doc<"tournamentParticipants">) => [p._id, p])
    );

    // Transform matches (only those with tennisState)
    const results = matches
      .filter((m: Doc<"matches">) => m.tennisState)
      .map((match: Doc<"matches">) => {
        const p1 = match.participant1Id
          ? participantMap.get(match.participant1Id)
          : null;
        const p2 = match.participant2Id
          ? participantMap.get(match.participant2Id)
          : null;
        const winner = match.winnerId
          ? participantMap.get(match.winnerId)
          : null;
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
          completedAt: match.completedAt || 0,
        };
      })
      .sort(
        (a: { completedAt: number }, b: { completedAt: number }) =>
          a.completedAt - b.completedAt
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

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      return { hasMatches: false, matchCount: 0, isTennis: false };
    }

    if (tournament.sport !== "tennis") {
      return { hasMatches: false, matchCount: 0, isTennis: false };
    }

    // Check if user has access
    const role = await getTournamentRole(ctx, args.tournamentId, userId);
    if (!role) {
      return { hasMatches: false, matchCount: 0, isTennis: true };
    }

    // Count completed matches with tennisState
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournament_and_status", (q: any) =>
        q.eq("tournamentId", args.tournamentId).eq("status", "completed")
      )
      .collect();

    const tennisMatches = matches.filter(
      (m: Doc<"matches">) => m.tennisState
    ).length;

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
  completedAt: number;
};

/**
 * Generate CSV string from match scores
 */
export const generateMatchScoresCSV = action({
  args: {
    tournamentId: v.id("tournaments"),
  },
  returns: v.object({
    csv: v.string(),
    filename: v.string(),
    matchCount: v.number(),
  }),
  handler: async (ctx, args): Promise<{ csv: string; filename: string; matchCount: number }> => {
    // Get match scores using the query
    const matches: MatchScore[] = await ctx.runQuery(
      api.reports.getTournamentMatchScores,
      {
        tournamentId: args.tournamentId,
      }
    );

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
      "Completed",
    ];

    // Build CSV rows
    const rows: string[][] = matches.map((m: MatchScore) => {
      // Format completed timestamp
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
        completedDate,
      ];
    });

    // Combine into CSV string
    const csv: string = [
      headers.join(","),
      ...rows.map((r: string[]) => r.join(",")),
    ].join("\n");

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
