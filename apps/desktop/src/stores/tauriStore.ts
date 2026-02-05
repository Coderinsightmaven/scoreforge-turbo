// src/stores/tauriStore.ts
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// ==================== TYPES ====================

export interface TauriStoreState {
  // Connection state
  isConnected: boolean;
  connectionError: string | null;

  // Loading states
  isLoading: Record<string, boolean>;

  // State cache (for immediate access)
  cachedState: Record<string, unknown>;

  // Event subscriptions
  subscriptions: Record<string, { stateType: string; callback: (data: unknown) => void }>;
}

// ==================== ACTIONS ====================

export interface TauriStoreActions {
  // Connection management
  initializeConnection: () => Promise<void>;
  disconnect: () => Promise<void>;

  // Generic state operations
  getState: <T>(stateType: string) => Promise<T>;
  updateState: (stateType: string, updates: Record<string, unknown>) => Promise<void>;

  // Subscription management
  subscribeToStateUpdates: (stateType: string, callback: (data: unknown) => void) => Promise<string>;
  unsubscribeFromStateUpdates: (subscriptionId: string) => Promise<void>;

  // Loading state management
  setLoading: (key: string, loading: boolean) => void;
  clearLoading: (key: string) => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;

  // Cache management
  updateCache: (stateType: string, data: unknown) => void;
  clearCache: (stateType?: string) => void;

  // Private methods
  loadInitialStates: () => Promise<void>;
  setupEventListeners: () => Promise<void>;
}

// ==================== STORE IMPLEMENTATION ====================

export const useTauriStore = create<TauriStoreState & TauriStoreActions>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    isConnected: false,
    connectionError: null,
    isLoading: {},
    cachedState: {},
    subscriptions: {},

    // ==================== CONNECTION MANAGEMENT ====================

    initializeConnection: async () => {
      try {
        set({ connectionError: null });

        // Test connection by calling a simple command
        await invoke('get_app_state');
        set({ isConnected: true });

        // Load initial states
        await get().loadInitialStates();

        // Setup event listeners for real-time updates
        await get().setupEventListeners();

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Tauri backend';
        set({
          isConnected: false,
          connectionError: errorMessage
        });
        throw error;
      }
    },

    disconnect: async () => {
      try {
        // Unsubscribe from all events
        const subscriptions = get().subscriptions;
        for (const subscriptionId of Object.keys(subscriptions)) {
          await get().unsubscribeFromStateUpdates(subscriptionId);
        }

        set({
          isConnected: false,
          subscriptions: {},
          cachedState: {}
        });
      } catch (error) {
        console.error('Failed to disconnect from Tauri backend:', error);
        throw error;
      }
    },

    // ==================== STATE OPERATIONS ====================

    getState: async <T>(stateType: string): Promise<T> => {
      const { setLoading, clearLoading, updateCache } = get();

      setLoading(`get_${stateType}`, true);
      try {
        let result: T;

        switch (stateType) {
          case 'app':
            result = await invoke('get_app_state');
            break;
          case 'canvas':
            result = await invoke('get_canvas_state');
            break;
          case 'image':
            result = await invoke('get_image_state');
            break;
          case 'video':
            result = await invoke('get_video_state');
            break;
          case 'liveData':
            result = await invoke('get_live_data_state');
            break;
          case 'scoreboard':
            result = await invoke('get_scoreboard_state');
            break;
          default:
            throw new Error(`Unknown state type: ${stateType}`);
        }

        // Update cache
        updateCache(stateType, result);

        return result;
      } finally {
        clearLoading(`get_${stateType}`);
      }
    },

    updateState: async (stateType: string, updates: Record<string, unknown>) => {
      const { setLoading, clearLoading } = get();

      setLoading(`update_${stateType}`, true);
      try {
        switch (stateType) {
          case 'app':
            if (updates.theme !== undefined) {
              await invoke('update_app_theme', { theme: updates.theme });
            }
            if (updates.sidebarOpen !== undefined) {
              await invoke('set_sidebar_open', { open: updates.sidebarOpen });
            }
            if (updates.propertyPanelOpen !== undefined) {
              await invoke('set_property_panel_open', { open: updates.propertyPanelOpen });
            }
            if (updates.toolbarCompact !== undefined) {
              // If toolbarCompact is provided as a boolean, set it directly
              // If it's just present, toggle it
              await invoke('toggle_toolbar_compact');
            }
            break;

          case 'canvas':
            if (updates.canvasSize) {
              const canvasSize = updates.canvasSize as { width: number; height: number };
              await invoke('set_canvas_size', {
                width: canvasSize.width,
                height: canvasSize.height
              });
            }
            if (updates.zoom !== undefined) {
              await invoke('set_canvas_zoom', { zoom: updates.zoom });
            }
            if (updates.pan) {
              const pan = updates.pan as { x: number; y: number };
              await invoke('set_canvas_pan', {
                x: pan.x,
                y: pan.y
              });
            }
            if (updates.showGrid !== undefined) {
              await invoke('toggle_canvas_grid');
            }
            if (updates.gridSize !== undefined) {
              await invoke('set_canvas_grid_size', { size: updates.gridSize });
            }
            if (updates.snapToGrid !== undefined) {
              await invoke('toggle_canvas_snap_to_grid');
            }
            if (updates.alignmentSnapping !== undefined) {
              await invoke('toggle_alignment_snapping');
            }
            break;

          case 'image':
            if (updates.loading !== undefined) {
              await invoke('set_image_loading', { loading: updates.loading });
            }
            break;

          case 'video':
            if (updates.loading !== undefined) {
              await invoke('set_video_loading', { loading: updates.loading });
            }
            break;

          case 'liveData':
            if (updates.polling !== undefined) {
              await invoke('set_live_data_polling', { polling: updates.polling });
            }
            break;

          case 'scoreboard':
            if (updates.config) {
              await invoke('set_scoreboard_config', { config: updates.config });
            }
            if (updates.gameState) {
              await invoke('set_scoreboard_game_state', { gameState: updates.gameState });
            }
            if (updates.dirty !== undefined) {
              if (updates.dirty) {
                await invoke('mark_scoreboard_dirty');
              } else {
                await invoke('mark_scoreboard_saved');
              }
            }
            break;

          default:
            throw new Error(`Update not implemented for state type: ${stateType}`);
        }
      } finally {
        clearLoading(`update_${stateType}`);
      }
    },

    // ==================== SUBSCRIPTION MANAGEMENT ====================

    subscribeToStateUpdates: async (stateType: string, callback: (data: unknown) => void): Promise<string> => {
      const subscriptionId = `${stateType}_${Date.now()}_${Math.random()}`;

      try {
        // Call Tauri command to subscribe
        await invoke('subscribe_to_state_updates', {
          subscription: {
            id: subscriptionId,
            state_types: [stateType],
            active: true
          }
        });

        // Store the subscription
        set(state => ({
          subscriptions: {
            ...state.subscriptions,
            [subscriptionId]: { stateType, callback }
          }
        }));

        return subscriptionId;
      } catch (error) {
        console.error('Failed to subscribe to state updates:', error);
        throw error;
      }
    },

    unsubscribeFromStateUpdates: async (subscriptionId: string) => {
      await invoke('unsubscribe_from_state_updates', { subscriptionId });

      // Remove from local state
      set(state => {
        const newSubscriptions = { ...state.subscriptions };
        delete newSubscriptions[subscriptionId];
        return { subscriptions: newSubscriptions };
      });
    },

    // ==================== LOADING STATE MANAGEMENT ====================

    setLoading: (key: string, loading: boolean) => {
      set(state => ({
        isLoading: {
          ...state.isLoading,
          [key]: loading
        }
      }));
    },

    clearLoading: (key: string) => {
      set(state => {
        const newLoading = { ...state.isLoading };
        delete newLoading[key];
        return { isLoading: newLoading };
      });
    },

    // ==================== ERROR HANDLING ====================

    setError: (error: string | null) => {
      set({ connectionError: error });
    },

    clearError: () => {
      set({ connectionError: null });
    },

    // ==================== CACHE MANAGEMENT ====================

    updateCache: (stateType: string, data: unknown) => {
      set(state => ({
        cachedState: {
          ...state.cachedState,
          [stateType]: data
        }
      }));
    },

    clearCache: (stateType?: string) => {
      if (stateType) {
        set(state => {
          const newCache = { ...state.cachedState };
          delete newCache[stateType];
          return { cachedState: newCache };
        });
      } else {
        set({ cachedState: {} });
      }
    },

    // ==================== PRIVATE METHODS ====================

    loadInitialStates: async () => {
      try {
        const [appState, canvasState, imageState, videoState, liveDataState, scoreboardState] = await Promise.all([
          invoke('get_app_state'),
          invoke('get_canvas_state'),
          invoke('get_image_state'),
          invoke('get_video_state'),
          invoke('get_live_data_state'),
          invoke('get_scoreboard_state'),
        ]);

        // Update cache with loaded states
        const { updateCache } = get();
        updateCache('app', appState);
        updateCache('canvas', canvasState);
        updateCache('image', imageState);
        updateCache('video', videoState);
        updateCache('liveData', liveDataState);
        updateCache('scoreboard', scoreboardState);
      } catch (error) {
        console.error('Failed to load initial states:', error);
        throw error;
      }
    },

    setupEventListeners: async () => {
      try {
        // Listen for state update events
        const eventTypes = ['app', 'canvas', 'image', 'video', 'liveData', 'scoreboard'];

        for (const stateType of eventTypes) {
          const unlisten = await listen(`${stateType}_state_update`, (event) => {
            const { subscriptions, updateCache } = get();

            // Update cache with new state data
            updateCache(stateType, event.payload);

            // Notify all subscribers for this state type
            Object.values(subscriptions).forEach((subscription) => {
              if (subscription.stateType === stateType && subscription.callback) {
                subscription.callback(event.payload);
              }
            });
          });

          // Store unlisten functions for cleanup
          set(state => ({
            subscriptions: {
              ...state.subscriptions,
              [`${stateType}_listener`]: {
                stateType,
                callback: () => unlisten()
              }
            }
          }));
        }
      } catch (error) {
        console.error('Failed to setup event listeners:', error);
        throw error;
      }
    }
  }))
);

// ==================== HOOKS ====================

export const useTauriState = <T>(stateType: string): T | undefined => {
  return useTauriStore(state => state.cachedState[stateType] as T | undefined);
};

export const useTauriLoading = (key: string): boolean => {
  return useTauriStore(state => state.isLoading[key] || false);
};

export const useTauriError = (): string | null => {
  return useTauriStore(state => state.connectionError);
};

export const useTauriConnected = (): boolean => {
  return useTauriStore(state => state.isConnected);
};

// ==================== UTILITIES ====================

export const initializeTauriBackend = async () => {
  const { initializeConnection } = useTauriStore.getState();
  await initializeConnection();
};

export const disconnectTauriBackend = async () => {
  const { disconnect } = useTauriStore.getState();
  await disconnect();
};

// Helper to create typed state hooks
export const createTauriStateHook = <T>(stateType: string) => {
  return () => useTauriState<T>(stateType);
};

// Helper to create typed update functions
export const createTauriUpdateFunction = (stateType: string) => {
  return async (updates: Record<string, unknown>) => {
    const { updateState } = useTauriStore.getState();
    await updateState(stateType, updates);
  };
};
