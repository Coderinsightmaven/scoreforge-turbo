/**
 * storage.ts - Scoreboard storage Tauri commands.
 */
import { invoke } from '@tauri-apps/api/core';
import { TauriScoreboardConfig } from './types';

/**
 * Saves a scoreboard design to disk.
 */
export async function saveScoreboard(name: string, config: Record<string, unknown>): Promise<string> {
  try {
    return await invoke('save_scoreboard', { name, data: config });
  } catch (error) {
    console.error('Failed to save scoreboard:', error);
    throw error;
  }
}

/**
 * Loads a scoreboard design from disk.
 */
export async function loadScoreboard(filename: string): Promise<TauriScoreboardConfig> {
  try {
    return await invoke('load_scoreboard', { filename });
  } catch (error) {
    console.error('Failed to load scoreboard:', error);
    throw error;
  }
}

/**
 * Lists all saved scoreboards.
 */
export async function listScoreboards(): Promise<TauriScoreboardConfig[]> {
  try {
    return await invoke('list_scoreboards');
  } catch (error) {
    console.error('Failed to list scoreboards:', error);
    return [];
  }
}

/**
 * Deletes a saved scoreboard from disk.
 */
export async function deleteScoreboard(filename: string): Promise<void> {
  try {
    await invoke('delete_scoreboard', { filename });
  } catch (error) {
    console.error('Failed to delete scoreboard:', error);
    throw error;
  }
}

/**
 * Exports a scoreboard to a file path (legacy method).
 */
export async function exportScoreboard(filename: string, exportPath: string): Promise<void> {
  try {
    await invoke('export_scoreboard', { filename, exportPath });
  } catch (error) {
    console.error('Failed to export scoreboard:', error);
    throw error;
  }
}

/**
 * Imports a scoreboard from a file path (legacy method).
 */
export async function importScoreboard(importPath: string): Promise<TauriScoreboardConfig> {
  try {
    return await invoke('import_scoreboard', { importPath });
  } catch (error) {
    console.error('Failed to import scoreboard:', error);
    throw error;
  }
}
