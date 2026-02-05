/**
 * Tennis Data Web Worker - Processes tennis match data in a background thread.
 * 
 * Purpose:
 * - Prevents UI blocking during data processing
 * - Handles complex data transformations asynchronously
 * - Normalizes data from different API formats
 * 
 * Message Types:
 * - PROCESS_DATA: Process raw tennis data
 * - UPDATE_CONFIG: Update worker configuration
 * - STOP_PROCESSING: Stop and clean up
 * 
 * Note: This worker is now primarily used as a fallback.
 * The Rust backend (rustTennisProcessor) is preferred for better performance.
 */
// Web Worker for processing tennis data to prevent UI blocking

/**
 * Message sent TO the worker from main thread.
 */
export interface TennisWorkerMessage {
  /** Type of operation to perform */
  type: 'PROCESS_DATA' | 'UPDATE_CONFIG' | 'STOP_PROCESSING';
  /** Optional payload data */
  payload?: Record<string, unknown>;
}

/**
 * Message sent FROM the worker to main thread.
 */
export interface TennisWorkerResponse {
  /** Type of response */
  type: 'DATA_PROCESSED' | 'ERROR' | 'READY';
  /** Optional response payload */
  payload?: ProcessedTennisMatch | Record<string, unknown>;
  /** Error message if type is ERROR */
  error?: string;
}

/**
 * Processed tennis match data structure.
 * This is the normalized format after processing raw API data.
 */
interface ProcessedTennisMatch {
  matchId: string;
  player1: {
    name: string;
    country?: string;
    seed?: number;
  };
  player2: {
    name: string;
    country?: string;
    seed?: number;
  };
  score: {
    player1Sets: number;
    player2Sets: number;
    player1Games: number;
    player2Games: number;
    player1Points: string;
    player2Points: string;
    // Legacy properties for compatibility
    player1_sets?: number;
    player2_sets?: number;
    player1_games?: number;
    player2_games?: number;
    player1_points?: string;
    player2_points?: string;
  };
  sets: Record<string, { player1: number; player2: number }>;
  servingPlayer: number;
  currentSet: number;
  isTiebreak: boolean;
  matchStatus: 'in_progress' | 'completed';
}

/**
 * Worker configuration options.
 */
interface WorkerConfig {
  /** Debounce delay in milliseconds */
  debounceMs: number;
  /** Enable debug logging */
  enableDebugLogging: boolean;
}

/**
 * TennisDataProcessor - Processes raw tennis data into normalized format.
 * 
 * Handles:
 * - Data normalization (handles different API formats)
 * - Point value standardization
 * - Set data processing
 * - Legacy property name compatibility
 */
class TennisDataProcessor {
  private config: WorkerConfig = {
    debounceMs: 100,
    enableDebugLogging: false
  };

  constructor() {
    this.log('TennisDataProcessor initialized');
  }

  /**
   * Updates worker configuration.
   * 
   * @param newConfig - Partial configuration to merge
   */
  updateConfig(newConfig: Partial<WorkerConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.log('Configuration updated:', this.config);
  }

  /**
   * Processes raw tennis data into normalized format.
   * 
   * Handles multiple data formats:
   * - New format (player1Sets, player1Games, etc.)
   * - Legacy format (player1_sets, player1_games, etc.)
   * - Different API structures (player1 vs team1)
   * 
   * @param rawData - Raw tennis data from API/WebSocket
   * @returns Processed tennis match data, or null if processing fails
   * @throws Error if data format is invalid
   */
  processData(rawData: Record<string, unknown>): ProcessedTennisMatch | null {
    try {
      if (!rawData || typeof rawData !== 'object') {
        throw new Error('Invalid data format');
      }

      // Cast nested objects for safe property access
      const score = rawData.score as Record<string, unknown> | undefined;
      const player1Raw = rawData.player1 as Record<string, unknown> | undefined;
      const player2Raw = rawData.player2 as Record<string, unknown> | undefined;
      const team1Raw = rawData.team1 as Record<string, unknown> | undefined;
      const team2Raw = rawData.team2 as Record<string, unknown> | undefined;

      // Extract score data with fallbacks
      const player1Sets = (score?.player1Sets || score?.player1_sets || 0) as number;
      const player2Sets = (score?.player2Sets || score?.player2_sets || 0) as number;
      const player1Games = (score?.player1Games || score?.player1_games || 0) as number;
      const player2Games = (score?.player2Games || score?.player2_games || 0) as number;
      const player1Points = this.normalizePoints((score?.player1Points || score?.player1_points || '0') as string | number);
      const player2Points = this.normalizePoints((score?.player2Points || score?.player2_points || '0') as string | number);
      const servingPlayer = (rawData.servingPlayer || rawData.serving_player || 1) as 1 | 2 | 3 | 4;

      // Process raw tennis data into structured format
      const processedData: ProcessedTennisMatch = {
        matchId: (rawData.matchId || rawData.id || 'unknown') as string,
        player1: {
          name: (player1Raw?.name || team1Raw?.name || 'Player 1') as string,
          country: player1Raw?.country as string | undefined,
          seed: player1Raw?.seed as number | undefined
        },
        player2: {
          name: (player2Raw?.name || team2Raw?.name || 'Player 2') as string,
          country: player2Raw?.country as string | undefined,
          seed: player2Raw?.seed as number | undefined
        },
        score: {
          player1Sets,
          player2Sets,
          player1Games,
          player2Games,
          player1Points,
          player2Points,
          // Legacy property names for compatibility
          player1_sets: player1Sets,
          player2_sets: player2Sets,
          player1_games: player1Games,
          player2_games: player2Games,
          player1_points: player1Points,
          player2_points: player2Points
        },
        sets: this.processSetsData((rawData.sets || {}) as Record<string, unknown>),
        servingPlayer,
        currentSet: (rawData.currentSet || rawData.current_set || 1) as number,
        isTiebreak: (rawData.isTiebreak || rawData.is_tiebreak || false) as boolean,
        matchStatus: (rawData.matchStatus || rawData.match_status || 'in_progress') as 'in_progress' | 'completed'
      };

      this.log('Data processed successfully:', processedData.matchId);
      return processedData;

    } catch (error) {
      this.log('Error processing tennis data:', error);
      throw error;
    }
  }

  /**
   * Normalizes tennis point values to standard format.
   * 
   * Converts various point representations to standard values:
   * - "love" -> "0"
   * - "A", "advantage" -> "Ad"
   * - Numbers -> string representation
   * 
   * @param points - Point value (string or number)
   * @returns Normalized point string
   */
  private normalizePoints(points: string | number): string {
    if (typeof points === 'number') {
      return points.toString();
    }

    // Standardize point values
    const pointMap: Record<string, string> = {
      '0': '0',
      '15': '15',
      '30': '30',
      '40': '40',
      'A': 'Ad',
      'AD': 'Ad',
      'advantage': 'Ad',
      'love': '0'
    };

    return pointMap[points.toLowerCase()] || points;
  }

  /**
   * Processes sets data from raw format to normalized format.
   * 
   * Handles both new and legacy property names.
   * 
   * @param rawSets - Raw sets data object
   * @returns Normalized sets data with consistent structure
   */
  private processSetsData(rawSets: Record<string, unknown>): Record<string, { player1: number; player2: number }> {
    const processedSets: Record<string, { player1: number; player2: number }> = {};

    Object.entries(rawSets).forEach(([setKey, setData]: [string, unknown]) => {
      const setRecord = setData as Record<string, unknown>;
      if (setData && typeof setData === 'object') {
        processedSets[setKey] = {
          player1: (setRecord.player1 as number) || (setRecord.player1_games as number) || 0,
          player2: (setRecord.player2 as number) || (setRecord.player2_games as number) || 0
        };
      }
    });

    return processedSets;
  }

  /**
   * Logs debug messages if debug logging is enabled.
   * 
   * @param args - Arguments to log
   */
  private log(...args: unknown[]) {
    if (this.config.enableDebugLogging) {
      console.log('[TennisDataProcessor]', ...args);
    }
  }
}

// === Worker Instance and Message Handling ===

/**
 * Singleton processor instance for this worker.
 */
const processor = new TennisDataProcessor();

/**
 * Main message handler for the worker.
 * 
 * Handles messages from the main thread:
 * - PROCESS_DATA: Processes tennis data and sends result back
 * - UPDATE_CONFIG: Updates worker configuration
 * - STOP_PROCESSING: Signals ready for cleanup
 * 
 * All responses are sent back to main thread via postMessage.
 */
self.onmessage = (event: MessageEvent<TennisWorkerMessage>) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'PROCESS_DATA':
        const processedData = processor.processData(payload ?? {});
        self.postMessage({
          type: 'DATA_PROCESSED',
          payload: processedData
        } as TennisWorkerResponse);
        break;

      case 'UPDATE_CONFIG':
        processor.updateConfig((payload ?? {}) as Partial<WorkerConfig>);
        self.postMessage({
          type: 'READY'
        } as TennisWorkerResponse);
        break;

      case 'STOP_PROCESSING':
        // Clean up and signal completion
        self.postMessage({
          type: 'READY'
        } as TennisWorkerResponse);
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
      payload: event.data as unknown as Record<string, unknown>
    } as TennisWorkerResponse);
  }
};

// === Worker Initialization ===

/**
 * Signals to main thread that worker is ready to receive messages.
 * This is the first message sent when the worker starts.
 */
self.postMessage({
  type: 'READY'
} as TennisWorkerResponse);
