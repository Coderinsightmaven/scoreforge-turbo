/**
 * ScoreForge API Service
 *
 * Provides HTTP client for communicating with ScoreForge's Convex backend
 * and data transformation utilities for converting to desktop scoreboard format.
 */

import type {
  ScoreForgeConfig,
  ScoreForgeGetMatchResponse,
  ScoreForgeListMatchesResponse,
  ScoreForgeListTournamentsResponse,
  ScoreForgeListBracketsResponse,
  ScoreForgeMatch,
} from '../types/scoreforge';
import type { TennisLiveData } from '../types/scoreboard';

/**
 * Calls a Convex mutation function via HTTP POST.
 *
 * Convex exposes mutations at: POST {convexUrl}/api/mutation
 * Body: { path: "file:functionName", args: {...} }
 */
async function callConvexMutation<T>(
  convexUrl: string,
  functionPath: string,
  args: Record<string, unknown>
): Promise<T> {
  // Ensure URL ends without trailing slash
  const baseUrl = convexUrl.replace(/\/$/, '');

  const response = await fetch(`${baseUrl}/api/mutation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path: functionPath,
      args: args,
      format: 'json',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Convex API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  // Convex returns { status: "success", value: ... } or { status: "error", errorMessage: ... }
  if (result.status === 'error') {
    throw new Error(result.errorMessage || 'Unknown Convex error');
  }

  return result.value as T;
}

/**
 * Converts tennis points from numeric to display string.
 *
 * Regular game points: 0=Love, 1=15, 2=30, 3=40, 4+=AD
 * Tiebreak points: Direct numeric value
 */
function convertPoints(points: number, isTiebreak: boolean): string {
  if (isTiebreak) {
    return points.toString();
  }

  const pointMap = ['0', '15', '30', '40'];
  if (points < 4) {
    return pointMap[points];
  }
  return 'Ad';
}

/**
 * Gets the display name for a participant, handling singles, doubles, and team types.
 */
function getParticipantName(participant?: {
  displayName: string;
  type: string;
  playerName?: string;
  player1Name?: string;
  player2Name?: string;
  teamName?: string;
}): string {
  if (!participant) return 'TBD';

  if (participant.type === 'individual' && participant.playerName) {
    return participant.playerName;
  }

  if (participant.type === 'doubles') {
    const p1 = participant.player1Name || '';
    const p2 = participant.player2Name || '';
    if (p1 && p2) {
      return `${p1} / ${p2}`;
    }
  }

  if (participant.type === 'team' && participant.teamName) {
    return participant.teamName;
  }

  return participant.displayName;
}

/**
 * ScoreForge API Service class.
 *
 * Provides methods to:
 * - Fetch match data
 * - List matches and tournaments
 * - Transform data to desktop TennisLiveData format
 */
export class ScoreForgeApiService {
  /**
   * Tests the connection by fetching the user's tournaments.
   */
  async testConnection(config: ScoreForgeConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.listTournaments(config);
      if (result.error) {
        return { success: false, error: result.error };
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Fetches a single match by ID.
   */
  async getMatch(config: ScoreForgeConfig, matchId: string): Promise<ScoreForgeGetMatchResponse> {
    return callConvexMutation<ScoreForgeGetMatchResponse>(config.convexUrl, 'publicApi:getMatch', {
      apiKey: config.apiKey,
      matchId: matchId,
    });
  }

  /**
   * Lists matches for a tournament with optional filters.
   */
  async listMatches(
    config: ScoreForgeConfig,
    tournamentId: string,
    filters?: {
      status?: 'pending' | 'scheduled' | 'live' | 'completed' | 'bye';
      court?: string;
      round?: number;
      bracketId?: string;
    }
  ): Promise<ScoreForgeListMatchesResponse> {
    return callConvexMutation<ScoreForgeListMatchesResponse>(config.convexUrl, 'publicApi:listMatches', {
      apiKey: config.apiKey,
      tournamentId: tournamentId,
      ...filters,
    });
  }

  /**
   * Lists brackets for a tournament.
   */
  async listBrackets(
    config: ScoreForgeConfig,
    tournamentId: string
  ): Promise<ScoreForgeListBracketsResponse> {
    return callConvexMutation<ScoreForgeListBracketsResponse>(config.convexUrl, 'publicApi:listBrackets', {
      apiKey: config.apiKey,
      tournamentId: tournamentId,
    });
  }

  /**
   * Lists all tournaments for the authenticated user.
   */
  async listTournaments(
    config: ScoreForgeConfig,
    status?: 'draft' | 'active' | 'completed' | 'cancelled'
  ): Promise<ScoreForgeListTournamentsResponse> {
    const args: Record<string, unknown> = { apiKey: config.apiKey };
    if (status) {
      args.status = status;
    }

    return callConvexMutation<ScoreForgeListTournamentsResponse>(
      config.convexUrl,
      'publicApi:listTournaments',
      args
    );
  }

  /**
   * Transforms ScoreForge match data to TennisLiveData format.
   *
   * This mapping enables the desktop scoreboard components to display
   * ScoreForge match data using the existing tennis live data bindings.
   */
  transformToTennisLiveData(match: ScoreForgeMatch): TennisLiveData {
    const tennisState = match.tennisState;

    // Calculate sets won by each participant
    let player1SetsWon = 0;
    let player2SetsWon = 0;

    if (tennisState) {
      for (const set of tennisState.sets) {
        if (set[0] > set[1]) {
          player1SetsWon++;
        } else if (set[1] > set[0]) {
          player2SetsWon++;
        }
      }
    }

    // Build sets data object for completed sets
    const setsData: Record<
      string,
      { player1?: number; player2?: number; team1?: number; team2?: number }
    > = {};

    if (tennisState) {
      tennisState.sets.forEach((set, index) => {
        // Use numeric string keys ('1', '2', '3') to match renderer expectations
        setsData[(index + 1).toString()] = {
          player1: set[0],
          player2: set[1],
        };
      });

      // Add current set with numeric string key
      const currentSetNumber = tennisState.sets.length + 1;
      setsData[currentSetNumber.toString()] = {
        player1: tennisState.currentSetGames[0],
        player2: tennisState.currentSetGames[1],
      };
    }

    // Get current game points
    let player1Points = '0';
    let player2Points = '0';

    if (tennisState) {
      if (tennisState.isTiebreak) {
        player1Points = tennisState.tiebreakPoints[0].toString();
        player2Points = tennisState.tiebreakPoints[1].toString();
      } else {
        player1Points = convertPoints(tennisState.currentGamePoints[0], false);
        player2Points = convertPoints(tennisState.currentGamePoints[1], false);
      }
    }

    // Determine match status
    let matchStatus: 'not_started' | 'in_progress' | 'completed' | 'suspended' = 'not_started';
    if (match.status === 'live') {
      matchStatus = 'in_progress';
    } else if (match.status === 'completed') {
      matchStatus = 'completed';
    } else if (match.status === 'pending' || match.status === 'scheduled') {
      matchStatus = 'not_started';
    }

    // Check if this is a doubles match
    const isDoubles =
      match.participant1?.type === 'doubles' || match.participant2?.type === 'doubles';

    // Build the TennisLiveData object
    const liveData: TennisLiveData = {
      matchId: match.id,
      matchStatus,
      servingPlayer: (tennisState?.servingParticipant || 1) as 1 | 2 | 3 | 4,
      currentSet: tennisState ? tennisState.sets.length + 1 : 1,
      isTiebreak: tennisState?.isTiebreak || false,
      matchType: isDoubles ? 'doubles' : 'singles',
      score: {
        player1Sets: player1SetsWon,
        player2Sets: player2SetsWon,
        player1Games: tennisState?.currentSetGames[0] || 0,
        player2Games: tennisState?.currentSetGames[1] || 0,
        player1Points,
        player2Points,
      },
      sets: setsData,
    };

    // Add player information for singles
    if (!isDoubles) {
      liveData.player1 = {
        name: getParticipantName(match.participant1),
        seed: match.participant1?.seed,
      };
      liveData.player2 = {
        name: getParticipantName(match.participant2),
        seed: match.participant2?.seed,
      };
    }

    // Add team names for doubles
    if (isDoubles) {
      liveData.team1Name = match.participant1?.displayName;
      liveData.team2Name = match.participant2?.displayName;

      // Add doubles players structure
      if (match.participant1 && match.participant2) {
        liveData.doublesPlayers = {
          team1: {
            player1: {
              name: match.participant1.player1Name || '',
            },
            player2: {
              name: match.participant1.player2Name || '',
            },
          },
          team2: {
            player1: {
              name: match.participant2.player1Name || '',
            },
            player2: {
              name: match.participant2.player2Name || '',
            },
          },
        };
      }
    }

    return liveData;
  }
}

// Export singleton instance
export const scoreforgeApi = new ScoreForgeApiService();
