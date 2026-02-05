/**
 * gameState.ts - Game state management Tauri commands.
 */
import { invoke } from '@tauri-apps/api/core';
import { GameState, Team } from '../../types/scoreboard';

/**
 * Updates the game state in the Rust backend.
 */
export async function updateGameState(gameState: GameState): Promise<void> {
  try {
    await invoke('update_game_state', { gameState });
  } catch (error) {
    console.error('Failed to update game state:', error);
    throw error;
  }
}

/**
 * Gets the current game state from the Rust backend.
 */
export async function getGameState(): Promise<GameState | null> {
  try {
    return await invoke('get_game_state');
  } catch (error) {
    console.error('Failed to get game state:', error);
    return null;
  }
}

/**
 * Updates the score for a team.
 */
export async function updateScore(team: 'home' | 'away', score: number): Promise<void> {
  try {
    await invoke('update_score', { team, score });
  } catch (error) {
    console.error('Failed to update score:', error);
    throw error;
  }
}

/**
 * Updates the time remaining in the game.
 */
export async function updateTime(timeRemaining: string): Promise<void> {
  try {
    await invoke('update_time', { timeRemaining });
  } catch (error) {
    console.error('Failed to update time:', error);
    throw error;
  }
}

/**
 * Updates the current period/quarter.
 */
export async function updatePeriod(period: number): Promise<void> {
  try {
    await invoke('update_period', { period });
  } catch (error) {
    console.error('Failed to update period:', error);
    throw error;
  }
}

/**
 * Toggles whether the game is active (playing/paused).
 */
export async function toggleGameActive(): Promise<boolean> {
  try {
    return await invoke('toggle_game_active');
  } catch (error) {
    console.error('Failed to toggle game active:', error);
    throw error;
  }
}

/**
 * Resets the game state to initial values.
 */
export async function resetGame(): Promise<void> {
  try {
    await invoke('reset_game');
  } catch (error) {
    console.error('Failed to reset game:', error);
    throw error;
  }
}

/**
 * Updates team information (name, logo, colors, etc.).
 */
export async function updateTeamInfo(teamSide: 'home' | 'away', team: Team): Promise<void> {
  try {
    await invoke('update_team_info', { teamSide, team });
  } catch (error) {
    console.error('Failed to update team info:', error);
    throw error;
  }
}
