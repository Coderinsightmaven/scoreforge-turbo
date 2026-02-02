import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

/**
 * Tournament formats
 */
export const tournamentFormats = v.union(
  v.literal("single_elimination"),
  v.literal("double_elimination"),
  v.literal("round_robin")
);

/**
 * Tournament status
 */
export const tournamentStatus = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("completed"),
  v.literal("cancelled")
);

/**
 * Match status
 */
export const matchStatus = v.union(
  v.literal("pending"),
  v.literal("scheduled"),
  v.literal("live"),
  v.literal("completed"),
  v.literal("bye")
);

/**
 * Preset sports
 */
export const presetSports = v.union(
  v.literal("tennis"),
  v.literal("volleyball")
);

/**
 * Participant types
 */
export const participantTypes = v.union(
  v.literal("team"),
  v.literal("individual"),
  v.literal("doubles")
);


/**
 * Tennis tournament configuration (set at tournament level)
 */
export const tennisConfig = v.object({
  // Scoring mode: true = advantage scoring, false = no-ad (sudden death at deuce)
  isAdScoring: v.boolean(),
  // Best of 3 (setsToWin=2) or Best of 5 (setsToWin=3)
  setsToWin: v.number(),
});

/**
 * Volleyball tournament configuration (set at tournament level)
 */
export const volleyballConfig = v.object({
  // Best of 3 (setsToWin=2) or Best of 5 (setsToWin=3)
  setsToWin: v.number(),
  // Points needed to win a regular set (default 25)
  pointsPerSet: v.number(),
  // Points needed to win the deciding set (default 15)
  pointsPerDecidingSet: v.number(),
  // Minimum lead required to win (default 2)
  minLeadToWin: v.number(),
});

/**
 * Tennis match state snapshot (for history)
 */
export const tennisStateSnapshot = v.object({
  sets: v.array(v.array(v.number())),
  currentSetGames: v.array(v.number()),
  currentGamePoints: v.array(v.number()),
  servingParticipant: v.number(),
  firstServerOfSet: v.number(),
  isTiebreak: v.boolean(),
  tiebreakPoints: v.array(v.number()),
  isMatchComplete: v.boolean(),
});

/**
 * Tennis match state for tracking sets, games, and points
 */
export const tennisState = v.object({
  // Completed sets: array of [p1Games, p2Games]
  sets: v.array(v.array(v.number())),
  // Current set games: [p1Games, p2Games]
  currentSetGames: v.array(v.number()),
  // Current game points: [p1Points, p2Points]
  // In regular game: 0=Love, 1=15, 2=30, 3=40
  // Values can go to 4 for advantage tracking
  currentGamePoints: v.array(v.number()),
  // Which participant is serving (1 or 2)
  servingParticipant: v.number(),
  // First server of the current set (for tracking alternation)
  firstServerOfSet: v.number(),
  // Scoring mode
  isAdScoring: v.boolean(),
  // Best of 3 (setsToWin=2) or Best of 5 (setsToWin=3)
  setsToWin: v.number(),
  // Tiebreak state
  isTiebreak: v.boolean(),
  tiebreakPoints: v.array(v.number()),
  // Match completed
  isMatchComplete: v.boolean(),
  // State history for undo (last 10 states)
  history: v.optional(v.array(tennisStateSnapshot)),
});

/**
 * Volleyball match state snapshot (for history)
 */
export const volleyballStateSnapshot = v.object({
  sets: v.array(v.array(v.number())),
  currentSetPoints: v.array(v.number()),
  servingTeam: v.number(),
  currentSetNumber: v.number(),
  isMatchComplete: v.boolean(),
});

/**
 * Volleyball match state for tracking sets and points
 */
export const volleyballState = v.object({
  // Completed sets: array of [p1Points, p2Points]
  sets: v.array(v.array(v.number())),
  // Current set points: [p1Points, p2Points]
  currentSetPoints: v.array(v.number()),
  // Which participant is serving (1 or 2)
  servingTeam: v.number(),
  // Configuration
  setsToWin: v.number(),
  pointsPerSet: v.number(),
  pointsPerDecidingSet: v.number(),
  minLeadToWin: v.number(),
  // Current set number (1-indexed)
  currentSetNumber: v.number(),
  // Match completed
  isMatchComplete: v.boolean(),
  // State history for undo (last 10 states)
  history: v.optional(v.array(volleyballStateSnapshot)),
});

/**
 * Theme preference values
 */
export const themePreference = v.union(
  v.literal("light"),
  v.literal("dark"),
  v.literal("system")
);

/**
 * Scoring log action types
 */
export const scoringLogAction = v.union(
  v.literal("init_match"),
  v.literal("score_point"),
  v.literal("undo"),
  v.literal("set_server"),
  v.literal("adjust_score")
);

/**
 * Bracket status (for tournament brackets/categories)
 */
export const bracketStatus = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("completed")
);

export default defineSchema({
  ...authTables,

  // User preferences - stores user settings like theme
  userPreferences: defineTable({
    userId: v.id("users"),
    themePreference: themePreference,
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // User scoring logs settings - admin-controlled per-user logging
  userScoringLogs: defineTable({
    userId: v.id("users"),
    enabled: v.boolean(),
    updatedBy: v.id("users"), // admin who made the change
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // API keys for external access to public endpoints
  apiKeys: defineTable({
    userId: v.id("users"), // Owner of the API key
    key: v.string(), // Hashed API key
    keyPrefix: v.string(), // First 8 chars for identification (e.g., "sf_abc123")
    name: v.string(), // User-friendly name for the key
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    isActive: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_key", ["key"]),

  // Rate limiting for public API
  apiRateLimits: defineTable({
    apiKeyId: v.id("apiKeys"),
    windowStart: v.number(), // Start of the current rate limit window (timestamp)
    requestCount: v.number(), // Number of requests in this window
  }).index("by_api_key", ["apiKeyId"]),

  // Site-wide administrators (separate from org roles)
  siteAdmins: defineTable({
    userId: v.id("users"),
    grantedBy: v.optional(v.id("users")), // Optional for bootstrap admin
    grantedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Global system settings (single document with key="global")
  systemSettings: defineTable({
    key: v.literal("global"),
    // Support both old and new field names during migration
    maxTournamentsPerUser: v.optional(v.number()),
    maxOrganizationsPerUser: v.optional(v.number()), // Legacy field name
    allowPublicRegistration: v.boolean(),
    maintenanceMode: v.boolean(),
    maintenanceMessage: v.optional(v.string()),
    updatedBy: v.id("users"),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  // Tournaments - competitions owned by users
  tournaments: defineTable({
    createdBy: v.id("users"), // Owner of the tournament
    name: v.string(),
    description: v.optional(v.string()),
    sport: presetSports,
    format: tournamentFormats,
    participantType: participantTypes,
    maxParticipants: v.number(),
    status: tournamentStatus,
    // Dates
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    // Scoring configuration (for round robin points)
    scoringConfig: v.optional(
      v.object({
        pointsPerWin: v.optional(v.number()),
        pointsPerDraw: v.optional(v.number()),
        pointsPerLoss: v.optional(v.number()),
      })
    ),
    // Tennis-specific configuration (only for tennis tournaments)
    tennisConfig: v.optional(tennisConfig),
    // Volleyball-specific configuration (only for volleyball tournaments)
    volleyballConfig: v.optional(volleyballConfig),
    // Available courts for this tournament
    courts: v.optional(v.array(v.string())),
    // 6-char alphanumeric code for temporary scorer login
    scorerCode: v.optional(v.string()),
  })
    .index("by_created_by", ["createdBy"])
    .index("by_created_by_and_status", ["createdBy", "status"])
    .index("by_status", ["status"])
    .index("by_sport", ["sport"])
    .index("by_scorer_code", ["scorerCode"]),

  // Tournament participants - teams, doubles, or individuals registered for a tournament
  tournamentParticipants: defineTable({
    tournamentId: v.id("tournaments"),
    // Optional bracket assignment (for multi-bracket tournaments)
    bracketId: v.optional(v.id("tournamentBrackets")),
    type: participantTypes, // "individual" | "doubles" | "team"
    displayName: v.string(),
    // Type-specific fields
    playerName: v.optional(v.string()), // Individual
    player1Name: v.optional(v.string()), // Doubles
    player2Name: v.optional(v.string()), // Doubles
    teamName: v.optional(v.string()), // Team
    // Seeding & stats
    seed: v.optional(v.number()),
    wins: v.number(),
    losses: v.number(),
    draws: v.number(),
    pointsFor: v.number(),
    pointsAgainst: v.number(),
    createdAt: v.number(),
    // For blank bracket feature - placeholder slots that can be filled in later
    isPlaceholder: v.optional(v.boolean()),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_tournament_and_seed", ["tournamentId", "seed"])
    .index("by_bracket", ["bracketId"])
    .index("by_tournament_and_bracket", ["tournamentId", "bracketId"]),

  // Tournament scorers - users assigned to score matches in a tournament
  tournamentScorers: defineTable({
    tournamentId: v.id("tournaments"),
    userId: v.id("users"),
    assignedBy: v.id("users"),
    assignedAt: v.number(),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_user", ["userId"])
    .index("by_tournament_and_user", ["tournamentId", "userId"]),

  // Tournament brackets - categories/draws within a tournament (e.g., "Men's Singles", "Women's Doubles")
  tournamentBrackets: defineTable({
    tournamentId: v.id("tournaments"),
    name: v.string(), // e.g., "Men's Singles"
    description: v.optional(v.string()),
    // Optional overrides (inherit from tournament if not set)
    format: v.optional(tournamentFormats), // Can override tournament format
    participantType: v.optional(participantTypes), // Can override participant type
    maxParticipants: v.optional(v.number()),
    // Sport-specific config overrides
    tennisConfig: v.optional(tennisConfig),
    volleyballConfig: v.optional(volleyballConfig),
    // Status tracking
    status: bracketStatus,
    displayOrder: v.number(),
    createdAt: v.number(),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_tournament_and_status", ["tournamentId", "status"]),

  // Matches - individual games within a tournament
  matches: defineTable({
    tournamentId: v.id("tournaments"),
    // Optional bracket assignment (for multi-bracket tournaments)
    bracketId: v.optional(v.id("tournamentBrackets")),
    round: v.number(),
    matchNumber: v.number(),
    // For elimination brackets: "winners" | "losers" | "grand_final" | "grand_final_reset"
    bracketType: v.optional(v.string()),
    // Position in bracket for visualization
    bracketPosition: v.optional(v.number()),
    // Participants (null for TBD)
    participant1Id: v.optional(v.id("tournamentParticipants")),
    participant2Id: v.optional(v.id("tournamentParticipants")),
    // Scores (sets won for tennis, points for other sports)
    participant1Score: v.number(),
    participant2Score: v.number(),
    // Winner
    winnerId: v.optional(v.id("tournamentParticipants")),
    // Status
    status: matchStatus,
    // Scheduling
    scheduledTime: v.optional(v.number()),
    court: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    // For bracket progression
    nextMatchId: v.optional(v.id("matches")),
    // For double elimination - which slot in next match (1 or 2)
    nextMatchSlot: v.optional(v.number()),
    // For losers bracket progression
    loserNextMatchId: v.optional(v.id("matches")),
    loserNextMatchSlot: v.optional(v.number()),
    // Tennis-specific state (only for tennis matches)
    tennisState: v.optional(tennisState),
    // Volleyball-specific state (only for volleyball matches)
    volleyballState: v.optional(volleyballState),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_tournament_and_round", ["tournamentId", "round"])
    .index("by_tournament_and_status", ["tournamentId", "status"])
    .index("by_tournament_and_bracket_type", ["tournamentId", "bracketType"])
    .index("by_bracket", ["bracketId"])
    .index("by_bracket_and_round", ["bracketId", "round"])
    .index("by_bracket_and_status", ["bracketId", "status"]),

  // Scoring input logs - audit log for all scoring actions
  scoringInputLogs: defineTable({
    tournamentId: v.id("tournaments"),
    matchId: v.id("matches"),
    action: scoringLogAction,
    actorId: v.optional(v.id("users")), // Optional to support temp scorers
    timestamp: v.number(),
    sport: presetSports,
    details: v.object({
      winnerParticipant: v.optional(v.number()),
      servingParticipant: v.optional(v.number()),
      team: v.optional(v.number()),
      adjustment: v.optional(v.number()),
      firstServer: v.optional(v.number()),
    }),
    stateBefore: v.optional(v.string()), // JSON-stringified state
    stateAfter: v.optional(v.string()), // JSON-stringified state
    participant1Name: v.optional(v.string()),
    participant2Name: v.optional(v.string()),
    round: v.number(),
    matchNumber: v.number(),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_match", ["matchId"])
    .index("by_tournament_and_timestamp", ["tournamentId", "timestamp"]),

  // Temporary scorers - lightweight accounts for tournament-specific scoring
  temporaryScorers: defineTable({
    tournamentId: v.id("tournaments"),
    username: v.string(), // Simple identifier (e.g., "Court1")
    pinHash: v.string(), // Hashed 4-6 digit PIN
    displayName: v.string(), // Shown in UI
    createdBy: v.id("users"), // Tournament owner
    createdAt: v.number(),
    isActive: v.boolean(),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_tournament_and_username", ["tournamentId", "username"]),

  // Temporary scorer sessions - tracks active sessions for temp scorers
  temporaryScorerSessions: defineTable({
    scorerId: v.id("temporaryScorers"),
    token: v.string(), // Session token
    createdAt: v.number(),
    expiresAt: v.number(), // 24 hours from creation
  })
    .index("by_token", ["token"])
    .index("by_scorer", ["scorerId"])
    .index("by_expires_at", ["expiresAt"]),
});
