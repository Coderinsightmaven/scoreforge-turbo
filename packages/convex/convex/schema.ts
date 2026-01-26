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
 * Team member roles
 */
export const teamMemberRoles = v.union(
  v.literal("captain"),
  v.literal("player")
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

export default defineSchema({
  ...authTables,

  // User preferences - stores user settings like theme
  userPreferences: defineTable({
    userId: v.id("users"),
    themePreference: themePreference,
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // API keys for external access to public endpoints
  apiKeys: defineTable({
    organizationId: v.id("organizations"),
    key: v.string(), // Hashed API key
    keyPrefix: v.string(), // First 8 chars for identification (e.g., "sf_abc123")
    name: v.string(), // User-friendly name for the key
    createdBy: v.id("users"),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    isActive: v.boolean(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_key", ["key"]),

  // Site-wide administrators (separate from org roles)
  siteAdmins: defineTable({
    userId: v.id("users"),
    grantedBy: v.optional(v.id("users")), // Optional for bootstrap admin
    grantedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Global system settings (single document with key="global")
  systemSettings: defineTable({
    key: v.literal("global"),
    maxOrganizationsPerUser: v.number(),
    allowPublicRegistration: v.boolean(),
    maintenanceMode: v.boolean(),
    maintenanceMessage: v.optional(v.string()),
    updatedBy: v.id("users"),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

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

  // Teams - groups of players within an organization
  teams: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    captainUserId: v.id("users"),
    image: v.optional(v.string()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_captain", ["captainUserId"]),

  // Team members - links users to teams
  teamMembers: defineTable({
    teamId: v.id("teams"),
    userId: v.id("users"),
    role: teamMemberRoles,
    joinedAt: v.number(),
  })
    .index("by_team", ["teamId"])
    .index("by_user", ["userId"])
    .index("by_team_and_user", ["teamId", "userId"]),

  // Tournaments - competitions within an organization
  tournaments: defineTable({
    organizationId: v.id("organizations"),
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
    createdBy: v.id("users"),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_and_status", ["organizationId", "status"])
    .index("by_status", ["status"])
    .index("by_sport", ["sport"]),

  // Tournament participants - teams, doubles, or individuals registered for a tournament
  tournamentParticipants: defineTable({
    tournamentId: v.id("tournaments"),
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
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_tournament_and_seed", ["tournamentId", "seed"]),

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

  // Matches - individual games within a tournament
  matches: defineTable({
    tournamentId: v.id("tournaments"),
    round: v.number(),
    matchNumber: v.number(),
    // For elimination brackets: "winners" or "losers"
    bracket: v.optional(v.string()),
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
    .index("by_tournament_and_bracket", ["tournamentId", "bracket"]),
});
