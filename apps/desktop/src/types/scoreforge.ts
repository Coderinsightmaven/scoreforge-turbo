/**
 * Type definitions for ScoreForge API integration.
 *
 * These types mirror the ScoreForge Convex public API responses
 * and provide type-safe access to tournament and match data.
 */

// ============================================
// Participant Types
// ============================================

export interface ScoreForgeParticipant {
  id: string;
  displayName: string;
  type: 'individual' | 'doubles' | 'team';
  /** Individual player name */
  playerName?: string;
  /** Doubles - first player name */
  player1Name?: string;
  /** Doubles - second player name */
  player2Name?: string;
  /** Team name */
  teamName?: string;
  seed?: number;
  wins: number;
  losses: number;
  draws: number;
}

// ============================================
// Tennis State Types
// ============================================

export interface ScoreForgeTennisState {
  /** Completed sets: array of [p1Games, p2Games] */
  sets: number[][];
  /** Current set games: [p1Games, p2Games] */
  currentSetGames: number[];
  /** Current game points: [p1Points, p2Points] - 0=Love, 1=15, 2=30, 3=40, 4+=AD */
  currentGamePoints: number[];
  /** Which participant is serving (1 or 2) */
  servingParticipant: number;
  /** First server of the current set */
  firstServerOfSet: number;
  /** Advantage scoring mode */
  isAdScoring: boolean;
  /** Sets needed to win (2 for best of 3, 3 for best of 5) */
  setsToWin: number;
  /** Whether currently in tiebreak */
  isTiebreak: boolean;
  /** Tiebreak points: [p1Points, p2Points] */
  tiebreakPoints: number[];
  /** Whether match is complete */
  isMatchComplete: boolean;
}

// ============================================
// Match Types
// ============================================

export type ScoreForgeMatchStatus = 'pending' | 'scheduled' | 'live' | 'completed' | 'bye';

export interface ScoreForgeMatch {
  id: string;
  round: number;
  matchNumber: number;
  bracketType?: string;
  court?: string;
  status: ScoreForgeMatchStatus;
  scores: {
    participant1: number;
    participant2: number;
  };
  timestamps: {
    scheduledTime?: number;
    startedAt?: number;
    completedAt?: number;
  };
  participant1?: ScoreForgeParticipant;
  participant2?: ScoreForgeParticipant;
  winnerId?: string;
  tennisState?: ScoreForgeTennisState;
}

// ============================================
// Tournament Types
// ============================================

export type ScoreForgeSport = 'tennis';
export type ScoreForgeFormat = 'single_elimination' | 'double_elimination' | 'round_robin';
export type ScoreForgeTournamentStatus = 'draft' | 'active' | 'completed' | 'cancelled';

export interface ScoreForgeTennisConfig {
  isAdScoring: boolean;
  setsToWin: number;
}

export interface ScoreForgeTournament {
  id: string;
  name: string;
  sport: ScoreForgeSport;
  format: ScoreForgeFormat;
  tennisConfig?: ScoreForgeTennisConfig;
  courts?: string[];
}

export interface ScoreForgeTournamentListItem {
  id: string;
  name: string;
  description?: string;
  sport: ScoreForgeSport;
  format: ScoreForgeFormat;
  status: ScoreForgeTournamentStatus;
  participantCount: number;
  startDate?: number;
  endDate?: number;
}

// ============================================
// Bracket Types
// ============================================

export type ScoreForgeBracketStatus = 'draft' | 'active' | 'completed';

export interface ScoreForgeBracket {
  id: string;
  tournamentId?: string;
  name: string;
  description?: string;
  format?: ScoreForgeFormat;
  participantType?: 'individual' | 'doubles' | 'team';
  maxParticipants?: number;
  status: ScoreForgeBracketStatus;
  displayOrder: number;
  participantCount: number;
  matchCount: number;
}

// ============================================
// API Response Types
// ============================================

export interface ScoreForgeGetMatchResponse {
  match?: ScoreForgeMatch;
  tournament?: ScoreForgeTournament;
  error?: string;
}

export interface ScoreForgeListMatchesResponse {
  matches?: ScoreForgeMatch[];
  tournament?: ScoreForgeTournament;
  error?: string;
}

export interface ScoreForgeListTournamentsResponse {
  tournaments?: ScoreForgeTournamentListItem[];
  error?: string;
}

export interface ScoreForgeListBracketsResponse {
  brackets?: ScoreForgeBracket[];
  error?: string;
}

// ============================================
// Connection Configuration
// ============================================

export interface ScoreForgeConfig {
  /** API key for authentication (sf_xxx format) */
  apiKey: string;
  /** Convex deployment URL (e.g., https://your-project.convex.cloud) */
  convexUrl: string;
}

export interface ScoreForgeConnectionSettings {
  config: ScoreForgeConfig;
  tournamentId: string;
  matchId: string;
  /** Poll interval in seconds */
  pollInterval: number;
}
