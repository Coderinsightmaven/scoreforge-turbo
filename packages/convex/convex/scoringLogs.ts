import { getCurrentUser, getCurrentUserOrThrow } from "./users";
import { query, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { scoringLogAction, presetSports } from "./schema";
import { errors } from "./lib/errors";
import { getTournamentRole } from "./lib/accessControl";
import { escapeCSV } from "./lib/csv";

// ============================================
// Internal Mutation - Logging Helper
// ============================================

/**
 * Log a scoring action (called internally by scoring mutations)
 */
export const logScoringAction = internalMutation({
  args: {
    tournamentId: v.id("tournaments"),
    matchId: v.id("matches"),
    action: scoringLogAction,
    actorId: v.optional(v.id("users")),
    sport: presetSports,
    details: v.object({
      winnerParticipant: v.optional(v.number()),
      servingParticipant: v.optional(v.number()),
      team: v.optional(v.number()),
      adjustment: v.optional(v.number()),
      firstServer: v.optional(v.number()),
    }),
    stateBefore: v.optional(v.string()),
    stateAfter: v.optional(v.string()),
    participant1Name: v.optional(v.string()),
    participant2Name: v.optional(v.string()),
    round: v.number(),
    matchNumber: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("scoringInputLogs", {
      tournamentId: args.tournamentId,
      matchId: args.matchId,
      action: args.action,
      actorId: args.actorId,
      timestamp: Date.now(),
      sport: args.sport,
      details: args.details,
      stateBefore: args.stateBefore,
      stateAfter: args.stateAfter,
      participant1Name: args.participant1Name,
      participant2Name: args.participant2Name,
      round: args.round,
      matchNumber: args.matchNumber,
    });
    return null;
  },
});

// ============================================
// Queries
// ============================================

/**
 * Get scoring logs for a tournament
 */
export const getTournamentLogs = query({
  args: {
    tournamentId: v.id("tournaments"),
    matchId: v.optional(v.id("matches")),
  },
  returns: v.array(
    v.object({
      _id: v.id("scoringInputLogs"),
      _creationTime: v.number(),
      tournamentId: v.id("tournaments"),
      matchId: v.id("matches"),
      action: scoringLogAction,
      actorId: v.optional(v.id("users")),
      actorName: v.optional(v.string()),
      timestamp: v.number(),
      sport: presetSports,
      details: v.object({
        winnerParticipant: v.optional(v.number()),
        servingParticipant: v.optional(v.number()),
        team: v.optional(v.number()),
        adjustment: v.optional(v.number()),
        firstServer: v.optional(v.number()),
      }),
      stateBefore: v.optional(v.string()),
      stateAfter: v.optional(v.string()),
      participant1Name: v.optional(v.string()),
      participant2Name: v.optional(v.string()),
      round: v.number(),
      matchNumber: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrThrow(ctx);
    const userId = user._id;

    const tournament = await ctx.db.get("tournaments", args.tournamentId);
    if (!tournament) {
      throw errors.notFound("Tournament");
    }

    // Check if user has access
    const role = await getTournamentRole(ctx, tournament, userId);
    if (!role) {
      throw errors.unauthorized();
    }

    // Get logs based on filter
    let logs;
    if (args.matchId !== undefined) {
      logs = await ctx.db
        .query("scoringInputLogs")
        .withIndex("by_match", (q: any) => q.eq("matchId", args.matchId))
        .collect();
    } else {
      logs = await ctx.db
        .query("scoringInputLogs")
        .withIndex("by_tournament_and_timestamp", (q: any) =>
          q.eq("tournamentId", args.tournamentId)
        )
        .collect();
    }

    // Get actor names (filter out undefined actorIds for temp scorers)
    const actorIds = [
      ...new Set(logs.map((l) => l.actorId).filter((id): id is Id<"users"> => id !== undefined)),
    ];
    const actors = await Promise.all(actorIds.map((id) => ctx.db.get("users", id)));
    const actorMap = new Map(actors.filter(Boolean).map((a) => [a!._id, a!.name || a!.email]));

    return logs.map((log) => ({
      _id: log._id,
      _creationTime: log._creationTime,
      tournamentId: log.tournamentId,
      matchId: log.matchId,
      action: log.action,
      actorId: log.actorId,
      actorName: log.actorId ? actorMap.get(log.actorId) : "Temporary Scorer",
      timestamp: log.timestamp,
      sport: log.sport,
      details: log.details,
      stateBefore: log.stateBefore,
      stateAfter: log.stateAfter,
      participant1Name: log.participant1Name,
      participant2Name: log.participant2Name,
      round: log.round,
      matchNumber: log.matchNumber,
    }));
  },
});

/**
 * Check if scoring logs are enabled and count entries
 */
export const hasScoringLogs = query({
  args: {
    tournamentId: v.id("tournaments"),
  },
  returns: v.object({
    enabled: v.boolean(),
    logCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return { enabled: false, logCount: 0 };
    }
    const userId = user._id;

    const tournament = await ctx.db.get("tournaments", args.tournamentId);
    if (!tournament) {
      return { enabled: false, logCount: 0 };
    }

    // Check if user has access
    const role = await getTournamentRole(ctx, tournament, userId);
    if (!role) {
      return { enabled: false, logCount: 0 };
    }

    // Check if scoring logs are enabled for this user
    const userScoringLogs = await ctx.db
      .query("userScoringLogs")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();
    const enabled = userScoringLogs?.enabled === true;

    if (!enabled) {
      return { enabled: false, logCount: 0 };
    }

    // Count logs
    const logs = await ctx.db
      .query("scoringInputLogs")
      .withIndex("by_tournament", (q: any) => q.eq("tournamentId", args.tournamentId))
      .collect();

    return {
      enabled: true,
      logCount: logs.length,
    };
  },
});

// ============================================
// CSV Export Action
// ============================================

/**
 * Format action details as a readable string
 */
function formatDetails(
  action: string,
  details: {
    winnerParticipant?: number;
    servingParticipant?: number;
    team?: number;
    adjustment?: number;
    firstServer?: number;
  }
): string {
  const parts: string[] = [];

  switch (action) {
    case "init_match":
      if (details.firstServer !== undefined) {
        parts.push(`First server: P${details.firstServer}`);
      }
      break;
    case "score_point":
      if (details.winnerParticipant !== undefined) {
        parts.push(`Point to P${details.winnerParticipant}`);
      }
      if (details.team !== undefined) {
        parts.push(`Point to Team ${details.team}`);
      }
      break;
    case "set_server":
      if (details.servingParticipant !== undefined) {
        parts.push(`Server: P${details.servingParticipant}`);
      }
      break;
    case "adjust_score":
      if (details.team !== undefined && details.adjustment !== undefined) {
        const sign = details.adjustment >= 0 ? "+" : "";
        parts.push(`Team ${details.team}: ${sign}${details.adjustment}`);
      }
      break;
    case "undo":
      parts.push("Undid last action");
      break;
  }

  return parts.join(", ");
}

/**
 * Format score state for display
 */
function formatScoreState(stateJson: string | undefined, sport: string): string {
  if (!stateJson) return "";

  try {
    const state = JSON.parse(stateJson);

    if (sport === "tennis") {
      const sets = state.sets || [];
      const currentGames = state.currentSetGames || [0, 0];
      const currentPoints = state.currentGamePoints || [0, 0];
      const isTiebreak = state.isTiebreak;
      const tiebreakPoints = state.tiebreakPoints || [0, 0];

      let score = sets.map((s: number[]) => `${s[0]}-${s[1]}`).join(" ");
      if (score) score += " ";
      score += `${currentGames[0]}-${currentGames[1]}`;

      if (isTiebreak) {
        score += ` TB: ${tiebreakPoints[0]}-${tiebreakPoints[1]}`;
      } else {
        const pointNames = ["0", "15", "30", "40", "Ad"];
        const p1Pts = currentPoints[0] ?? 0;
        const p2Pts = currentPoints[1] ?? 0;
        if (p1Pts > 0 || p2Pts > 0) {
          score += ` (${pointNames[Math.min(p1Pts, 4)]}-${pointNames[Math.min(p2Pts, 4)]})`;
        }
      }

      return score;
    }

    return "";
  } catch {
    return "";
  }
}

type ScoringLog = {
  _id: string;
  _creationTime: number;
  tournamentId: string;
  matchId: string;
  action:
    | "init_match"
    | "score_point"
    | "undo"
    | "set_server"
    | "adjust_score"
    | "ace"
    | "fault"
    | "double_fault";
  actorId?: string;
  actorName?: string;
  timestamp: number;
  sport: "tennis";
  details: {
    winnerParticipant?: number;
    servingParticipant?: number;
    team?: number;
    adjustment?: number;
    firstServer?: number;
  };
  stateBefore?: string;
  stateAfter?: string;
  participant1Name?: string;
  participant2Name?: string;
  round: number;
  matchNumber: number;
};

/**
 * Generate CSV export of scoring logs
 */
export const generateScoringLogsCSV = action({
  args: {
    tournamentId: v.id("tournaments"),
    matchId: v.optional(v.id("matches")),
  },
  returns: v.object({
    csv: v.string(),
    filename: v.string(),
    logCount: v.number(),
  }),
  handler: async (ctx, args): Promise<{ csv: string; filename: string; logCount: number }> => {
    // Get logs using the query
    const logs: ScoringLog[] = await ctx.runQuery(api.scoringLogs.getTournamentLogs, {
      tournamentId: args.tournamentId,
      matchId: args.matchId,
    });

    // Get tournament info for filename
    const tournament = await ctx.runQuery(api.tournaments.getTournament, {
      tournamentId: args.tournamentId,
    });

    if (logs.length === 0) {
      return {
        csv: "",
        filename: "no-logs.csv",
        logCount: 0,
      };
    }

    // Build CSV headers
    const headers: string[] = [
      "Timestamp",
      "Match #",
      "Round",
      "Action",
      "Actor",
      "Participant 1",
      "Participant 2",
      "Details",
      "Score Before",
      "Score After",
    ];

    // Build CSV rows
    const rows: string[][] = logs.map((log: ScoringLog) => {
      const timestamp = new Date(log.timestamp).toISOString().replace("T", " ").slice(0, 19);

      return [
        timestamp,
        log.matchNumber.toString(),
        log.round.toString(),
        log.action,
        escapeCSV(log.actorName || "Unknown"),
        escapeCSV(log.participant1Name || "TBD"),
        escapeCSV(log.participant2Name || "TBD"),
        escapeCSV(formatDetails(log.action, log.details)),
        escapeCSV(formatScoreState(log.stateBefore, log.sport)),
        escapeCSV(formatScoreState(log.stateAfter, log.sport)),
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
    const filename: string = `${sanitizedName}-scoring-logs-${date}.csv`;

    return {
      csv,
      filename,
      logCount: logs.length,
    };
  },
});
