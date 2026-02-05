/**
 * useAppStore - Global application state management store.
 * 
 * Manages:
 * - UI state (theme, sidebar, property panel visibility)
 * - Monitor detection and selection
 * - Scoreboard instance management (multiple display windows)
 * - Application settings and preferences
 * - Error handling
 * 
 * This store coordinates high-level application behavior and multi-monitor display management.
 */
// src/stores/useAppStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { MonitorInfo } from '../types/tauri';
import { ScoreboardInstance } from '../types/scoreboard';
import { TauriAPI } from '../lib/tauri';
import { v4 as uuidv4 } from 'uuid';

type Theme = 'light' | 'dark' | 'system';

interface AppState {
  // UI State
  theme: Theme;
  sidebarOpen: boolean;
  propertyPanelOpen: boolean;
  toolbarCompact: boolean;
  
  // Monitor Management
  monitors: MonitorInfo[];
  selectedMonitor: MonitorInfo | null;
  scoreboardInstances: ScoreboardInstance[];
  
  // Loading States
  isLoadingMonitors: boolean;
  isCreatingScoreboardWindow: boolean;
  
  // Error States
  lastError: string | null;
  
  // App Settings
  settings: {
    autoSave: boolean;
    autoSaveInterval: number;
    recentFiles: string[];
    defaultCanvasSize: { width: number; height: number };
    defaultGridSize: number;
    showWelcomeScreen: boolean;
    enableHotkeys: boolean;
  };
}

interface AppActions {
  // Theme
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  
  // UI
  toggleSidebar: () => void;
  togglePropertyPanel: () => void;
  toggleToolbarCompact: () => void;
  setSidebarOpen: (open: boolean) => void;
  setPropertyPanelOpen: (open: boolean) => void;
  
  // Monitor Management
  loadMonitors: () => Promise<void>;
  selectMonitor: (monitor: MonitorInfo | null) => void;
  
  // Multiple Scoreboard Management
  createScoreboardInstance: (
    name: string,
    width: number,
    height: number,
    offsetX?: number,
    offsetY?: number,
    savedScoreboardId?: string,
    tennisApiScoreboardId?: string,
    scoreForgeConfig?: { apiKey: string; convexUrl: string; matchId: string }
  ) => Promise<string | null>;
  closeScoreboardInstance: (instanceId: string) => Promise<void>;
  closeAllScoreboardInstances: () => Promise<void>;
  updateScoreboardInstancePosition: (
    instanceId: string,
    offsetX: number,
    offsetY: number
  ) => Promise<void>;
  updateScoreboardInstanceSize: (
    instanceId: string,
    width: number,
    height: number
  ) => Promise<void>;
  getScoreboardInstance: (instanceId: string) => ScoreboardInstance | undefined;
  
  // Error Handling
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Settings
  updateSettings: (settings: Partial<AppState['settings']>) => void;
  addRecentFile: (filepath: string) => void;
  clearRecentFiles: () => void;
  
  // Initialization
  initializeApp: () => Promise<void>;
}

export const useAppStore = create<AppState & AppActions>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    theme: 'system',
    sidebarOpen: true,
    propertyPanelOpen: true,
    toolbarCompact: false,
    
    monitors: [],
    selectedMonitor: null,
    scoreboardInstances: [],
    
    isLoadingMonitors: false,
    isCreatingScoreboardWindow: false,
    
    lastError: null,
    
    settings: {
      autoSave: true,
      autoSaveInterval: 300000, // 5 minutes
      recentFiles: [],
      defaultCanvasSize: { width: 800, height: 600 },
      defaultGridSize: 20,
      showWelcomeScreen: true,
      enableHotkeys: true,
    },

    // === Theme Management ===
    
    /**
     * Sets the application theme.
     * 
     * @param theme - The theme to apply ('light', 'dark', or 'system')
     * Side effects: Theme is persisted to localStorage via subscription
     */
    setTheme: (theme: Theme) =>
      set(() => ({ theme })),

    /**
     * Toggles between light and dark theme.
     * If current theme is 'system', switches to 'light'.
     * 
     * Side effects: Theme is persisted to localStorage via subscription
     */
    toggleTheme: () =>
      set((state) => ({
        theme: state.theme === 'light' ? 'dark' : 'light'
      })),

    // === UI State Management ===
    
    /**
     * Toggles the sidebar open/closed state.
     */
    toggleSidebar: () =>
      set((state) => ({ sidebarOpen: !state.sidebarOpen })),

    /**
     * Toggles the property panel open/closed state.
     */
    togglePropertyPanel: () =>
      set((state) => ({ propertyPanelOpen: !state.propertyPanelOpen })),

    /**
     * Toggles the toolbar compact mode.
     */
    toggleToolbarCompact: () =>
      set((state) => ({ toolbarCompact: !state.toolbarCompact })),

    /**
     * Sets the sidebar open state explicitly.
     * 
     * @param open - Whether the sidebar should be open
     */
    setSidebarOpen: (open: boolean) =>
      set(() => ({ sidebarOpen: open })),

    /**
     * Sets the property panel open state explicitly.
     * 
     * @param open - Whether the property panel should be open
     */
    setPropertyPanelOpen: (open: boolean) =>
      set(() => ({ propertyPanelOpen: open })),

    // === Monitor Management ===
    
    /**
     * Loads available monitors from the system via Tauri API.
     * 
     * Process:
     * 1. Sets loading state to true
     * 2. Fetches monitors from Tauri backend
     * 3. Selects first monitor by default if available
     * 4. Handles errors and updates error state
     * 
     * Side effects:
     * - Updates isLoadingMonitors state
     * - Updates monitors array
     * - Auto-selects first monitor if available
     * - Sets lastError on failure
     */
    loadMonitors: async () => {
      set(() => ({ isLoadingMonitors: true, lastError: null }));
      
      try {
        const monitors = await TauriAPI.getMonitors();
        set(() => ({
          monitors,
          isLoadingMonitors: false,
          selectedMonitor: monitors.length > 0 ? monitors[0] : null,
        }));
      } catch (error) {
        set(() => ({
          isLoadingMonitors: false,
          lastError: error instanceof Error ? error.message : 'Failed to load monitors',
        }));
      }
    },

    /**
     * Selects a monitor for scoreboard display.
     * 
     * @param monitor - The monitor to select, or null to deselect
     */
    selectMonitor: (monitor: MonitorInfo | null) =>
      set(() => ({ selectedMonitor: monitor })),

    // === Multiple Scoreboard Instance Management ===
    
    /**
     * Creates a new scoreboard display window on the selected monitor.
     * 
     * This function:
     * - Creates a new Tauri window for scoreboard display
     * - Loads scoreboard data (either from saved scoreboard or current designer state)
     * - Associates tennis API scoreboard ID if provided
     * - Tracks the instance in the store
     *
     * @param name - Display name for the scoreboard instance
     * @param width - Window width in pixels
     * @param height - Window height in pixels
     * @param offsetX - X offset from monitor origin (default: 0)
     * @param offsetY - Y offset from monitor origin (default: 0)
     * @param savedScoreboardId - Optional ID of saved scoreboard to load
     * @param tennisApiScoreboardId - Optional tennis API scoreboard ID for live data
     * @returns The instance ID if successful, null if failed
     * 
     * Side effects:
     * - Creates a new Tauri window
     * - Adds instance to scoreboardInstances array
     * - Sets isCreatingScoreboardWindow state
     * - Sets lastError on failure
     */
    createScoreboardInstance: async (
      name: string,
      width: number,
      height: number,
      offsetX: number = 0,
      offsetY: number = 0,
      savedScoreboardId?: string,
      tennisApiScoreboardId?: string,
      scoreForgeConfig?: { apiKey: string; convexUrl: string; matchId: string }
    ) => {
      const state = get();
      if (!state.selectedMonitor) {
        set(() => ({ lastError: 'No monitor selected' }));
        return null;
      }

      set(() => ({ isCreatingScoreboardWindow: true, lastError: null }));

      try {
        const instanceId = uuidv4();
        const windowId = `scoreboard_${instanceId}`;
        
        // Get current scoreboard data from the store, or load saved scoreboard data if provided
        let scoreboardData: Record<string, unknown> | undefined = undefined;
        
        // Import the scoreboard store
        const { useScoreboardStore } = await import('./useScoreboardStore');
        const scoreboardStoreState = useScoreboardStore.getState();
        
        if (savedScoreboardId) {
          try {
            const savedScoreboards = await TauriAPI.listScoreboards();
            const savedScoreboard = savedScoreboards.find(sb => sb.id === savedScoreboardId);
            if (savedScoreboard) {
              scoreboardData = savedScoreboard.data as unknown as Record<string, unknown>;
              // Include tennis API scoreboard ID and ScoreForge config if provided
              if (tennisApiScoreboardId || scoreForgeConfig) {
                scoreboardData = {
                  ...scoreboardData,
                  tennisApiScoreboardId: tennisApiScoreboardId,
                  scoreForgeConfig: scoreForgeConfig
                };
              }
              // Use the saved scoreboard's name if no custom name provided
              if (!name || name === savedScoreboard.name) {
                name = `${savedScoreboard.name} Display`;
              }
            }
          } catch (error) {
            console.warn('Failed to load saved scoreboard data:', error);
          }
        } else if (scoreboardStoreState.config) {
          // Use current scoreboard data with live data bindings
          try {
            // Use components as-is (tennis API integration handles live data)
            scoreboardData = {
              config: scoreboardStoreState.config,
              components: scoreboardStoreState.components,
              gameState: scoreboardStoreState.gameState,
              tennisApiScoreboardId: tennisApiScoreboardId,
              scoreForgeConfig: scoreForgeConfig
            };
          } catch (error) {
            console.warn('Failed to load live data bindings:', error);
            // Fallback to regular data without live bindings
            scoreboardData = {
              config: scoreboardStoreState.config,
              components: scoreboardStoreState.components,
              gameState: scoreboardStoreState.gameState,
              tennisApiScoreboardId: tennisApiScoreboardId,
              scoreForgeConfig: scoreForgeConfig
            };
          }
        }
        
        console.log('Creating scoreboard window:');
        console.log('  Selected monitor:', state.selectedMonitor);
        console.log('  Monitor ID:', state.selectedMonitor.id);
        console.log('  Monitor position:', state.selectedMonitor.x, state.selectedMonitor.y);
        console.log('  Offsets:', offsetX, offsetY);
        console.log('  Tennis API Scoreboard ID:', tennisApiScoreboardId);
        console.log('  ScoreForge config param:', scoreForgeConfig ? `matchId: ${scoreForgeConfig.matchId}` : 'none');
        console.log('  ScoreboardData has scoreForgeConfig:', !!scoreboardData?.scoreForgeConfig);
        console.log('  ScoreboardData scoreForgeConfig:', scoreboardData?.scoreForgeConfig);

        await TauriAPI.createScoreboardWindow(
          windowId,
          state.selectedMonitor.id,
          width,
          height,
          state.selectedMonitor.x, // Use full monitor coordinates for fullscreen mode
          state.selectedMonitor.y,
          offsetX,
          offsetY,
          scoreboardData
        );

        const newInstance: ScoreboardInstance = {
          id: instanceId,
          windowId,
          name,
          monitorId: state.selectedMonitor.id,
          position: {
            x: state.selectedMonitor.x, // Use full monitor coordinates for fullscreen mode
            y: state.selectedMonitor.y,
            offsetX,
            offsetY,
          },
          size: { width, height },
          isActive: true,
          createdAt: new Date(),
          scoreboardData, // Store the saved scoreboard data with the instance
          tennisApiScoreboardId, // Which tennis API scoreboard to listen to for live data
        };
        
        set((state) => ({
          scoreboardInstances: [...state.scoreboardInstances, newInstance],
          isCreatingScoreboardWindow: false,
        }));

        return instanceId;
      } catch (error) {
        set(() => ({
          isCreatingScoreboardWindow: false,
          lastError: error instanceof Error ? error.message : 'Failed to create scoreboard window',
        }));
        return null;
      }
    },

    /**
     * Closes a scoreboard display window and removes it from tracking.
     * 
     * @param instanceId - The ID of the instance to close
     * 
     * Side effects:
     * - Closes the Tauri window
     * - Removes instance from scoreboardInstances array
     * - Sets lastError if instance not found or close fails
     */
    closeScoreboardInstance: async (instanceId: string) => {
      const state = get();
      const instance = state.scoreboardInstances.find(inst => inst.id === instanceId);
      
      if (!instance) {
        set(() => ({ lastError: 'Scoreboard instance not found' }));
        return;
      }

      try {
        await TauriAPI.closeScoreboardWindow(instance.windowId);
        set((state) => ({
          scoreboardInstances: state.scoreboardInstances.filter(inst => inst.id !== instanceId),
        }));
      } catch (error) {
        set(() => ({
          lastError: error instanceof Error ? error.message : 'Failed to close scoreboard window',
        }));
      }
    },

    /**
     * Closes all scoreboard display windows.
     * 
     * Side effects:
     * - Closes all Tauri scoreboard windows
     * - Clears scoreboardInstances array
     * - Sets lastError if close fails
     */
    closeAllScoreboardInstances: async () => {
      try {
        await TauriAPI.closeAllScoreboardWindows();
        set(() => ({ scoreboardInstances: [] }));
      } catch (error) {
        set(() => ({
          lastError: error instanceof Error ? error.message : 'Failed to close all scoreboard windows',
        }));
      }
    },

    /**
     * Updates the position of a scoreboard display window.
     * 
     * @param instanceId - The ID of the instance to update
     * @param offsetX - New X offset from monitor origin
     * @param offsetY - New Y offset from monitor origin
     * 
     * Side effects:
     * - Updates Tauri window position
     * - Updates instance position in scoreboardInstances array
     * - Sets lastError if instance not found or update fails
     */
    updateScoreboardInstancePosition: async (
      instanceId: string,
      offsetX: number,
      offsetY: number
    ) => {
      const state = get();
      const instance = state.scoreboardInstances.find(inst => inst.id === instanceId);
      
      if (!instance) {
        set(() => ({ lastError: 'Scoreboard instance not found' }));
        return;
      }

      try {
        await TauriAPI.updateScoreboardWindowPosition(
          instance.windowId,
          instance.position.x,
          instance.position.y,
          offsetX,
          offsetY
        );

        set((state) => ({
          scoreboardInstances: state.scoreboardInstances.map(inst =>
            inst.id === instanceId
              ? {
                  ...inst,
                  position: { ...inst.position, offsetX, offsetY }
                }
              : inst
          ),
        }));
      } catch (error) {
        set(() => ({
          lastError: error instanceof Error ? error.message : 'Failed to update scoreboard position',
        }));
      }
    },

    /**
     * Updates the size of a scoreboard display window.
     * 
     * @param instanceId - The ID of the instance to update
     * @param width - New window width in pixels
     * @param height - New window height in pixels
     * 
     * Side effects:
     * - Updates Tauri window size
     * - Updates instance size in scoreboardInstances array
     * - Sets lastError if instance not found or update fails
     */
    updateScoreboardInstanceSize: async (
      instanceId: string,
      width: number,
      height: number
    ) => {
      const state = get();
      const instance = state.scoreboardInstances.find(inst => inst.id === instanceId);
      
      if (!instance) {
        set(() => ({ lastError: 'Scoreboard instance not found' }));
        return;
      }

      try {
        await TauriAPI.updateScoreboardWindowSize(instance.windowId, width, height);

        set((state) => ({
          scoreboardInstances: state.scoreboardInstances.map(inst =>
            inst.id === instanceId
              ? { ...inst, size: { width, height } }
              : inst
          ),
        }));
      } catch (error) {
        set(() => ({
          lastError: error instanceof Error ? error.message : 'Failed to update scoreboard size',
        }));
      }
    },

    /**
     * Gets a scoreboard instance by ID.
     * 
     * @param instanceId - The ID of the instance to retrieve
     * @returns The scoreboard instance, or undefined if not found
     */
    getScoreboardInstance: (instanceId: string) => {
      const state = get();
      return state.scoreboardInstances.find(inst => inst.id === instanceId);
    },

    // === Error Handling ===
    
    /**
     * Sets an error message in the store.
     * 
     * @param error - Error message string, or null to clear error
     */
    setError: (error: string | null) =>
      set(() => ({ lastError: error })),

    /**
     * Clears the current error message.
     */
    clearError: () =>
      set(() => ({ lastError: null })),

    // === Settings Management ===
    
    /**
     * Updates application settings with partial settings object.
     * Merges new settings with existing settings.
     * 
     * @param newSettings - Partial settings object to merge
     * Side effects: Settings are persisted to localStorage via subscription
     */
    updateSettings: (newSettings: Partial<AppState['settings']>) =>
      set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),

    /**
     * Adds a file path to the recent files list.
     * Removes duplicate entries and keeps only the 10 most recent files.
     * 
     * @param filepath - The file path to add
     * Side effects: Settings are persisted to localStorage via subscription
     */
    addRecentFile: (filepath: string) =>
      set((state) => {
        const recentFiles = [
          filepath,
          ...state.settings.recentFiles.filter(f => f !== filepath)
        ].slice(0, 10); // Keep only 10 recent files
        
        return {
          settings: { ...state.settings, recentFiles }
        };
      }),

    /**
     * Clears all recent files from the list.
     * Side effects: Settings are persisted to localStorage via subscription
     */
    clearRecentFiles: () =>
      set((state) => ({
        settings: { ...state.settings, recentFiles: [] }
      })),

    // === Initialization ===
    
    /**
     * Initializes the application by loading saved settings and monitors.
     * 
     * Process:
     * 1. Loads saved settings from localStorage
     * 2. Loads saved theme from localStorage
     * 3. Loads available monitors
     * 
     * Side effects:
     * - Restores settings from localStorage
     * - Restores theme from localStorage
     * - Loads and selects monitors
     */
    initializeApp: async () => {
      const { loadMonitors } = get();
      
      // Load saved settings from localStorage if available
      try {
        const savedSettings = localStorage.getItem('scoreboard-app-settings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          set((state) => ({
            settings: { ...state.settings, ...parsedSettings }
          }));
        }
      } catch (error) {
        console.warn('Failed to load saved settings:', error);
      }

      // Load theme from localStorage
      try {
        const savedTheme = localStorage.getItem('scoreboard-app-theme') as Theme;
        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
          set(() => ({ theme: savedTheme }));
        }
      } catch (error) {
        console.warn('Failed to load saved theme:', error);
      }

      // Load monitors
      await loadMonitors();
    },
  }))
);

// === Persistence Subscriptions ===

/**
 * Auto-saves settings to localStorage whenever they change.
 * This ensures user preferences persist across app restarts.
 */
useAppStore.subscribe(
  (state) => state.settings,
  (settings) => {
    try {
      localStorage.setItem('scoreboard-app-settings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  }
);

/**
 * Auto-saves theme to localStorage whenever it changes.
 * This ensures theme preference persists across app restarts.
 */
useAppStore.subscribe(
  (state) => state.theme,
  (theme) => {
    try {
      localStorage.setItem('scoreboard-app-theme', theme);
    } catch (error) {
      console.warn('Failed to save theme:', error);
    }
  }
); 