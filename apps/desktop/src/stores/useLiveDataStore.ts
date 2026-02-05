/**
 * useLiveDataStore - Live data connection store for ScoreForge integration.
 *
 * Manages:
 * - ScoreForge API connections for live tennis data
 * - Component bindings to live data fields
 * - Data polling intervals
 * - Rust backend tennis data processing
 *
 * This store handles all real-time data integration and component data binding.
 */
// src/stores/useLiveDataStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { LiveDataConnection, TennisLiveData, LiveDataComponentBinding } from '../types/scoreboard';
import { v4 as uuidv4 } from 'uuid';
import { TauriAPI, LiveDataState } from '../lib/tauri';
import { getRustTennisProcessor, ProcessedTennisMatch } from '../services/rustTennisProcessor';
import { RawTennisData } from '../types/tennisProcessor';
import { scoreforgeApi } from '../services/scoreforgeApi';
import type { ScoreForgeConfig } from '../types/scoreforge';

interface LiveDataStoreState {
  connections: LiveDataConnection[];
  activeData: Record<string, TennisLiveData>;
  componentBindings: LiveDataComponentBinding[];
  isPolling: boolean;
  pollingIntervals: Record<string, number>;
  isLoaded: boolean;
  lastError: string | null;

  // Rust processor integration
  lastProcessedData: ProcessedTennisMatch | null;
}

interface LiveDataActions {
  // Connection management
  addConnection: (connection: Omit<LiveDataConnection, 'id'>) => string;
  updateConnection: (id: string, updates: Partial<LiveDataConnection>) => void;
  removeConnection: (id: string) => void;
  activateConnection: (id: string) => void;
  deactivateConnection: (id: string) => void;
  getConnection: (id: string) => LiveDataConnection | undefined;
  
  // Data management
  updateLiveData: (connectionId: string, data: TennisLiveData) => void;
  getLiveData: (connectionId: string) => TennisLiveData | undefined;
  
  // Component binding
  addComponentBinding: (binding: LiveDataComponentBinding) => void;
  removeComponentBinding: (componentId: string) => void;
  updateComponentBinding: (componentId: string, updates: Partial<LiveDataComponentBinding>) => void;
  getComponentBinding: (componentId: string) => LiveDataComponentBinding | undefined;
  getComponentValue: (componentId: string) => unknown;
  
  // Polling control
  startPolling: (connectionId: string) => void;
  stopPolling: (connectionId: string) => void;
  stopAllPolling: () => void;
  
  // Error handling
  setConnectionError: (connectionId: string, error: string) => void;
  clearConnectionError: (connectionId: string) => void;
  
  // Persistence
  loadConnections: () => Promise<void>;
  saveConnections: () => Promise<void>;

  // Error handling
  clearError: () => void;

  // Rust processor integration
  processTennisDataViaRust: (rawData: RawTennisData) => Promise<ProcessedTennisMatch>;
  getLastProcessedData: () => ProcessedTennisMatch | null;

  // === ScoreForge API Integration ===

  /**
   * Connects to ScoreForge API and starts polling for match data.
   *
   * @param config - ScoreForge API configuration (apiKey, convexUrl)
   * @param tournamentId - Tournament ID to connect to
   * @param matchId - Match ID to poll for updates
   * @param connectionId - Optional existing connection ID to update
   */
  connectToScoreForge: (
    config: ScoreForgeConfig,
    tournamentId: string,
    matchId: string,
    connectionId?: string
  ) => Promise<string>;

  /**
   * Starts polling ScoreForge match data for a connection.
   */
  startScoreForgePolling: (connectionId: string) => void;

  /**
   * Stops polling ScoreForge match data for a connection.
   */
  stopScoreForgePolling: (connectionId: string) => void;

  /**
   * Fetches match data from ScoreForge and updates the live data store.
   */
  fetchScoreForgeMatch: (connectionId: string) => Promise<void>;
}

/**
 * Gets a value from an object using a dot-notation path.
 * 
 * Example: getValueFromPath(data, 'player1.name') returns data.player1.name
 * 
 * @param obj - The object to traverse
 * @param path - Dot-notation path (e.g., 'player1.name')
 * @returns The value at the path, or undefined if path doesn't exist
 */
const getValueFromPath = (obj: Record<string, unknown>, path: string): unknown => {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && current !== null) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
};

export const useLiveDataStore = create<LiveDataStoreState & LiveDataActions>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    connections: [],
    activeData: {},
    componentBindings: [],
    isPolling: false,
    pollingIntervals: {},
    isLoaded: false,
    lastError: null,

    // Rust processor integration
    lastProcessedData: null,

    // === Connection Management ===
    
    /**
     * Adds a new live data connection (WebSocket or REST API).
     * 
     * @param connectionData - Connection configuration (without ID, which is auto-generated)
     * @returns The generated connection ID
     * 
     * Side effects:
     * - Creates new connection with unique ID
     * - Adds to connections array
     * - Auto-saves connections to localStorage after 100ms
     */
    addConnection: (connectionData) => {
      const id = uuidv4();
      const now = new Date();
      const connection: LiveDataConnection = {
        id,
        ...connectionData,
        isActive: false,
        createdAt: now,
        lastUpdated: now,
      };
      
      set((state) => ({
        connections: [...state.connections, connection],
      }));
      
      // Auto-save after adding connection
      setTimeout(() => {
        get().saveConnections();
      }, 100);
      
      return id;
    },

    /**
     * Updates a connection with partial updates.
     * 
     * @param id - Connection ID to update
     * @param updates - Partial connection object with properties to update
     * Side effects: Updates lastUpdated timestamp
     */
    updateConnection: (id, updates) =>
      set((state) => ({
        connections: state.connections.map(conn =>
          conn.id === id 
            ? { ...conn, ...updates, lastUpdated: new Date() }
            : conn
        ),
      })),

    /**
     * Removes a connection and stops any associated polling.
     * 
     * @param id - Connection ID to remove
     * 
     * Side effects:
     * - Stops polling for this connection
     * - Removes connection from connections array
     * - Removes associated active data
     * - Removes component bindings for this connection
     * - Auto-saves connections to localStorage
     */
    removeConnection: (id) => {
      const { stopPolling } = get();
      stopPolling(id);
      
      set((state) => ({
        connections: state.connections.filter(conn => conn.id !== id),
        activeData: Object.fromEntries(
          Object.entries(state.activeData).filter(([key]) => key !== id)
        ),
        componentBindings: state.componentBindings.filter(
          binding => binding.connectionId !== id
        ),
      }));
      
      // Auto-save after removing connection
      setTimeout(() => get().saveConnections(), 100);
    },

    activateConnection: (id) => {
      const { startPolling } = get();
      
      set((state) => ({
        connections: state.connections.map(conn =>
          conn.id === id ? { ...conn, isActive: true, lastError: undefined } : conn
        ),
      }));
      
      startPolling(id);
    },

    deactivateConnection: (id) => {
      const { stopPolling } = get();
      
      set((state) => ({
        connections: state.connections.map(conn =>
          conn.id === id ? { ...conn, isActive: false } : conn
        ),
      }));
      
      stopPolling(id);
    },

    getConnection: (id) => {
      const state = get();
      return state.connections.find(conn => conn.id === id);
    },

    // Data management
    updateLiveData: (connectionId, data) =>
      set((state) => ({
        activeData: {
          ...state.activeData,
          [connectionId]: data,
        },
        connections: state.connections.map(conn =>
          conn.id === connectionId 
            ? { ...conn, lastUpdated: new Date(), lastError: undefined }
            : conn
        ),
      })),

    getLiveData: (connectionId) => {
      const state = get();
      return state.activeData[connectionId];
    },

    // Component binding
    addComponentBinding: (binding) => {
      set((state) => ({
        componentBindings: [
          ...state.componentBindings.filter(b => b.componentId !== binding.componentId),
          binding,
        ],
      }));
      // Auto-save after adding binding
      setTimeout(() => get().saveConnections(), 100);
    },

    removeComponentBinding: (componentId) => {
      set((state) => ({
        componentBindings: state.componentBindings.filter(
          binding => binding.componentId !== componentId
        ),
      }));
      // Auto-save after removing binding
      setTimeout(() => get().saveConnections(), 100);
    },

    updateComponentBinding: (componentId, updates) => {
      set((state) => ({
        componentBindings: state.componentBindings.map(binding =>
          binding.componentId === componentId 
            ? { ...binding, ...updates }
            : binding
        ),
      }));
      // Auto-save after updating binding
      setTimeout(() => get().saveConnections(), 100);
    },

    getComponentBinding: (componentId) => {
      const state = get();
      return state.componentBindings.find(binding => binding.componentId === componentId);
    },

    getComponentValue: (componentId) => {
      const state = get();
      const binding = state.componentBindings.find(b => b.componentId === componentId);
      
      if (!binding) return undefined;
      
      const liveData = state.activeData[binding.connectionId];
      if (!liveData) return undefined;
      
      return getValueFromPath(liveData as unknown as Record<string, unknown>, binding.dataPath);
    },

    // Polling control
    // Note: For ScoreForge connections, use startScoreForgePolling instead
    startPolling: (connectionId) => {
      const state = get();
      const connection = state.connections.find(conn => conn.id === connectionId);

      if (!connection || state.pollingIntervals[connectionId]) return;

      // For ScoreForge connections, redirect to the dedicated polling method
      if (connection.provider === 'scoreforge') {
        get().startScoreForgePolling(connectionId);
        return;
      }

      // Other providers are not supported
      console.warn(`Unsupported provider: ${connection.provider}. Only 'scoreforge' is supported.`);
    },

    stopPolling: (connectionId) => {
      const state = get();
      const interval = state.pollingIntervals[connectionId];
      
      if (interval) {
        clearInterval(interval);
        
        const newIntervals = { ...state.pollingIntervals };
        delete newIntervals[connectionId];
        
        set({
          pollingIntervals: newIntervals,
          isPolling: Object.keys(newIntervals).length > 0,
        });
      }
    },

    stopAllPolling: () => {
      const state = get();
      
      Object.values(state.pollingIntervals).forEach(interval => {
        clearInterval(interval);
      });
      
      set({
        pollingIntervals: {},
        isPolling: false,
      });
    },

    // Error handling
    setConnectionError: (connectionId, error) =>
      set((state) => ({
        connections: state.connections.map(conn =>
          conn.id === connectionId 
            ? { ...conn, lastError: error, lastUpdated: new Date() }
            : conn
        ),
      })),

    clearConnectionError: (connectionId) =>
      set((state) => ({
        connections: state.connections.map(conn =>
          conn.id === connectionId 
            ? { ...conn, lastError: undefined }
            : conn
        ),
      })),

    // Persistence methods
    loadConnections: async () => {
      try {
        const data = await TauriAPI.loadLiveDataConnections();

        // Convert the loaded data to the store format
        const connections: LiveDataConnection[] = data.connections.map(conn => ({
          id: conn.id,
          name: conn.name,
          provider: conn.provider as LiveDataConnection['provider'],
          apiUrl: conn.apiUrl,
          pollInterval: conn.pollInterval,
          isActive: false, // Don't auto-start polling on load
          createdAt: conn.createdAt ? new Date(conn.createdAt) : undefined,
          updatedAt: conn.updatedAt ? new Date(conn.updatedAt) : undefined,
          lastUpdated: conn.lastUpdated ? new Date(conn.lastUpdated) : undefined,
          lastError: conn.lastError,
        }));

        const componentBindings: LiveDataComponentBinding[] = data.componentBindings.map(binding => ({
          componentId: binding.componentId,
          connectionId: binding.connectionId,
          dataPath: binding.dataPath,
          updateInterval: binding.updateInterval,
        }));

        set({
          connections,
          componentBindings,
          isLoaded: true,
          lastError: null,
        });
      } catch (error) {
        set({
          lastError: error instanceof Error ? error.message : 'Failed to load connections',
          isLoaded: true,
        });
      }
    },

    saveConnections: async () => {
      try {
        const state = get();

        // Convert store data to saveable format
        const saveData: LiveDataState = {
          connections: state.connections.map(conn => ({
            id: conn.id,
            name: conn.name,
            provider: conn.provider,
            apiUrl: conn.apiUrl || '',
            pollInterval: conn.pollInterval,
            isActive: conn.isActive,
            createdAt: conn.createdAt ? conn.createdAt.toISOString() : new Date().toISOString(),
            updatedAt: conn.updatedAt?.toISOString(),
            lastUpdated: conn.lastUpdated?.toISOString(),
            lastError: conn.lastError,
          })),
          componentBindings: state.componentBindings.map(binding => ({
            componentId: binding.componentId,
            connectionId: binding.connectionId,
            dataPath: binding.dataPath,
            updateInterval: binding.updateInterval,
          })),
        };

        await TauriAPI.saveLiveDataConnections(saveData);
      } catch (error) {
        set({
          lastError: error instanceof Error ? error.message : 'Failed to save connections',
        });
      }
    },


    clearError: () => {
      set({ lastError: null });
    },

    // Rust processor integration methods
    processTennisDataViaRust: async (rawData) => {
      try {
        const processor = getRustTennisProcessor({
          enableDebugLogging: import.meta.env.DEV
        });
        const processedData = await processor.processData(rawData);

        // Update the last processed data
        set({ lastProcessedData: processedData });

        console.log('✅ Tennis data processed via Rust:', processedData.match_id);
        return processedData;

      } catch (error) {
        console.error('❌ Rust processing failed:', error);
        set({
          lastError: error instanceof Error ? error.message : 'Rust processing failed'
        });
        throw error;
      }
    },

    getLastProcessedData: () => {
      const state = get();
      return state.lastProcessedData;
    },

    // === ScoreForge API Integration Methods ===

    connectToScoreForge: async (config, tournamentId, matchId, existingConnectionId) => {
      try {
        set({ lastError: null });

        // Test the connection first
        const testResult = await scoreforgeApi.testConnection(config);
        if (!testResult.success) {
          throw new Error(testResult.error || 'Failed to connect to ScoreForge');
        }

        // Use existing connection ID or create new one
        const connectionId = existingConnectionId || `scoreforge-${uuidv4().slice(0, 8)}`;

        // Check if connection already exists
        const existingConnection = get().connections.find((c) => c.id === connectionId);

        if (existingConnection) {
          // Update existing connection
          get().updateConnection(connectionId, {
            provider: 'scoreforge',
            scoreforgeConfig: {
              apiKey: config.apiKey,
              convexUrl: config.convexUrl,
              tournamentId,
              matchId,
            },
            isActive: true,
            lastError: undefined,
          });
        } else {
          // Create new connection
          const newConnection: LiveDataConnection = {
            id: connectionId,
            name: `ScoreForge - Match ${matchId.slice(0, 8)}`,
            provider: 'scoreforge',
            pollInterval: 2, // 2 seconds default
            isActive: true,
            scoreforgeConfig: {
              apiKey: config.apiKey,
              convexUrl: config.convexUrl,
              tournamentId,
              matchId,
            },
            createdAt: new Date(),
            lastUpdated: new Date(),
          };

          set((state) => ({
            connections: [...state.connections, newConnection],
          }));
        }

        // Start polling
        get().startScoreForgePolling(connectionId);

        // Save connections
        setTimeout(() => get().saveConnections(), 100);

        return connectionId;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        set({ lastError: errorMessage });
        throw error;
      }
    },

    startScoreForgePolling: (connectionId) => {
      const state = get();
      const connection = state.connections.find((c) => c.id === connectionId);

      if (!connection || connection.provider !== 'scoreforge' || !connection.scoreforgeConfig) {
        console.warn('Cannot start ScoreForge polling: invalid connection', connectionId);
        return;
      }

      // Stop existing polling if any
      if (state.pollingIntervals[connectionId]) {
        clearInterval(state.pollingIntervals[connectionId]);
      }

      // Fetch immediately
      get().fetchScoreForgeMatch(connectionId);

      // Set up polling interval
      const interval = window.setInterval(() => {
        get().fetchScoreForgeMatch(connectionId);
      }, connection.pollInterval * 1000);

      set((state) => ({
        pollingIntervals: {
          ...state.pollingIntervals,
          [connectionId]: interval,
        },
        isPolling: true,
      }));

      console.log(`🟢 Started ScoreForge polling for connection ${connectionId}`);
    },

    stopScoreForgePolling: (connectionId) => {
      const state = get();
      const interval = state.pollingIntervals[connectionId];

      if (interval) {
        clearInterval(interval);
      }

      const newIntervals = { ...state.pollingIntervals };
      delete newIntervals[connectionId];

      // Mark the connection as inactive
      const updatedConnections = state.connections.map((conn) =>
        conn.id === connectionId ? { ...conn, isActive: false } : conn
      );

      set({
        connections: updatedConnections,
        pollingIntervals: newIntervals,
        isPolling: Object.keys(newIntervals).length > 0,
      });

      console.log(`🔴 Stopped ScoreForge polling for connection ${connectionId}`);
    },

    fetchScoreForgeMatch: async (connectionId) => {
      const connection = get().connections.find((c) => c.id === connectionId);

      if (!connection?.scoreforgeConfig) {
        return;
      }

      try {
        const { apiKey, convexUrl, matchId } = connection.scoreforgeConfig;

        const response = await scoreforgeApi.getMatch({ apiKey, convexUrl }, matchId);

        if (response.error) {
          get().setConnectionError(connectionId, response.error);
          return;
        }

        if (response.match) {
          // Transform to TennisLiveData format
          const tennisData = scoreforgeApi.transformToTennisLiveData(response.match);

          // Update live data store
          get().updateLiveData(connectionId, tennisData);

          // Clear any previous errors
          get().clearConnectionError(connectionId);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch match';
        get().setConnectionError(connectionId, errorMessage);
      }
    },
  }))
);