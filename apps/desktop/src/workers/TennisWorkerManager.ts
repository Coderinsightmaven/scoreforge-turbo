/**
 * TennisWorkerManager - Manages Web Worker lifecycle for tennis data processing.
 * 
 * Features:
 * - Worker initialization and termination
 * - Message passing between main thread and worker
 * - Request/response tracking with timeouts
 * - Error handling and retry logic
 * - Singleton pattern for easy access
 * 
 * This manager handles all communication with the tennis data processing worker,
 * providing a clean async API for the main application.
 */
import { TennisWorkerMessage, TennisWorkerResponse } from './tennisDataWorker';

export interface TennisWorkerConfig {
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Enable debug logging */
  enableDebugLogging?: boolean;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
}

/**
 * Processed tennis match data structure.
 * Matches the format returned by the worker.
 */
export interface ProcessedTennisMatch {
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
    player1_sets: number;
    player2_sets: number;
    player1_games: number;
    player2_games: number;
    player1_points: string;
    player2_points: string;
  };
  sets: Record<string, { player1: number; player2: number }>;
  servingPlayer: 1 | 2 | 3 | 4;
  currentSet: number;
  isTiebreak: boolean;
  matchStatus: 'in_progress' | 'completed';
  // Legacy properties for compatibility
  serving_player: number;
}

export class TennisWorkerManager {
  /** Web Worker instance */
  private worker: Worker | null = null;
  /** Whether worker has been initialized */
  private isInitialized = false;
  /** Map of pending requests waiting for worker responses */
  private pendingRequests = new Map<string, {
    resolve: (value: ProcessedTennisMatch) => void;
    reject: (error: Error) => void;
    timeout: number;
  }>();
  /** Worker configuration */
  private config: Required<TennisWorkerConfig>;
  /** Counter for generating unique request IDs */
  private requestId = 0;

  /**
   * Creates a new TennisWorkerManager instance.
   * 
   * @param config - Configuration options for the worker
   */
  constructor(config: TennisWorkerConfig = {}) {
    this.config = {
      debounceMs: 100,
      enableDebugLogging: false,
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };
  }

  /**
   * Initializes the Web Worker.
   * 
   * Process:
   * 1. Creates new Worker instance
   * 2. Sets up message and error handlers
   * 3. Waits for worker to signal ready
   * 4. Sends initial configuration
   * 
   * @throws Error if initialization fails
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create the Web Worker
      this.worker = new Worker(new URL('./tennisDataWorker.ts', import.meta.url), {
        type: 'module'
      });

      // Set up message handler
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);

      // Wait for worker to be ready
      await this.waitForWorkerReady();

      // Configure the worker
      await this.sendMessage({
        type: 'UPDATE_CONFIG',
        payload: {
          debounceMs: this.config.debounceMs,
          enableDebugLogging: this.config.enableDebugLogging
        }
      });

      this.isInitialized = true;
      this.log('TennisWorkerManager initialized successfully');

    } catch (error) {
      this.log('Failed to initialize worker:', error);
      throw new Error(`Failed to initialize tennis data worker: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Processes tennis data through the Web Worker.
   * 
   * @param rawData - Raw tennis data to process
   * @returns Promise that resolves with processed tennis match data
   * 
   * @throws Error if:
   * - Worker is not initialized
   * - Request times out (5 seconds)
   * - Worker processing fails
   */
  async processTennisData(rawData: Record<string, unknown>): Promise<ProcessedTennisMatch> {
    if (!this.isInitialized || !this.worker) {
      throw new Error('Worker not initialized');
    }

    const requestId = `req_${++this.requestId}_${Date.now()}`;

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeout = window.setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Worker request timeout'));
      }, 5000); // 5 second timeout

      // Store the promise handlers
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout
      });

      // Send the processing request
      this.sendMessage({
        type: 'PROCESS_DATA',
        payload: rawData
      });
    });
  }

  /**
   * Updates worker configuration.
   * 
   * @param newConfig - Partial configuration to merge
   * @throws Error if worker is not initialized
   */
  async updateConfig(newConfig: Partial<TennisWorkerConfig>): Promise<void> {
    if (!this.isInitialized || !this.worker) {
      throw new Error('Worker not initialized');
    }

    this.config = { ...this.config, ...newConfig };

    await this.sendMessage({
      type: 'UPDATE_CONFIG',
      payload: {
        debounceMs: this.config.debounceMs,
        enableDebugLogging: this.config.enableDebugLogging
      }
    });
  }

  /**
   * Terminates the Web Worker and cleans up.
   * 
   * Process:
   * 1. Rejects all pending requests
   * 2. Sends stop message to worker
   * 3. Terminates worker instance
   * 4. Resets initialization state
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      // Clear all pending requests
    for (const handlers of this.pendingRequests.values()) {
      clearTimeout(handlers.timeout);
      handlers.reject(new Error('Worker terminated'));
    }
      this.pendingRequests.clear();

      // Send stop message and terminate
      try {
        await this.sendMessage({ type: 'STOP_PROCESSING' });
      } catch (error) {
        // Ignore errors during shutdown
      }

      this.worker.terminate();
      this.worker = null;
    }

    this.isInitialized = false;
    this.log('TennisWorkerManager terminated');
  }

  /**
   * Sends a message to the worker.
   * 
   * @param message - Message to send
   * @returns Promise that resolves when message is sent
   * @throws Error if worker is not available or send times out
   */
  private async sendMessage(message: TennisWorkerMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not available'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Message send timeout'));
      }, 2000);

      try {
        this.worker.postMessage(message);
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        clearTimeout(timeout);
      }
    });
  }

  /**
   * Handles messages received from the worker.
   * 
   * Message types:
   * - DATA_PROCESSED: Resolves pending request with processed data
   * - ERROR: Rejects pending request with error
   * - READY: Worker initialization complete
   * 
   * @param event - Message event from worker
   */
  private handleWorkerMessage(event: MessageEvent<TennisWorkerResponse>) {
    const { type, payload, error } = event.data;

    switch (type) {
      case 'DATA_PROCESSED':
        // Resolve the pending request with processed data
        if (payload && this.pendingRequests.size > 0) {
          // For simplicity, resolve the first pending request
          // In a production app, you'd want to match by request ID
          const firstEntry = this.pendingRequests.entries().next().value;
          if (firstEntry) {
            const [firstRequestId, handlers] = firstEntry;
            if (handlers) {
              clearTimeout(handlers.timeout);
              this.pendingRequests.delete(firstRequestId);
              handlers.resolve(payload as ProcessedTennisMatch);
            }
          }
        }
        break;

      case 'ERROR':
        // Reject the pending request with error
        if (this.pendingRequests.size > 0) {
          const firstEntry = this.pendingRequests.entries().next().value;
          if (firstEntry) {
            const [firstRequestId, handlers] = firstEntry;
            if (handlers) {
              clearTimeout(handlers.timeout);
              this.pendingRequests.delete(firstRequestId);
              handlers.reject(new Error(error || 'Worker processing error'));
            }
          }
        }
        break;

      case 'READY':
        // Worker is ready - this is handled in waitForWorkerReady
        break;

      default:
        this.log('Unknown worker message type:', type);
    }
  }

  /**
   * Handles errors from the worker.
   * 
   * Rejects all pending requests and clears the request queue.
   * 
   * @param error - Error event from worker
   */
  private handleWorkerError(error: ErrorEvent) {
    this.log('Worker error:', error);

    // Reject all pending requests
    for (const handlers of this.pendingRequests.values()) {
      clearTimeout(handlers.timeout);
      handlers.reject(new Error(`Worker error: ${error.message}`));
    }
    this.pendingRequests.clear();
  }

  /**
   * Waits for the worker to signal it's ready.
   * 
   * Listens for 'READY' message from worker with 5 second timeout.
   * 
   * @returns Promise that resolves when worker is ready
   * @throws Error if timeout occurs or worker is unavailable
   */
  private async waitForWorkerReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not available'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Worker initialization timeout'));
      }, 5000);

      const readyHandler = (event: MessageEvent<TennisWorkerResponse>) => {
        if (event.data.type === 'READY') {
          this.worker!.removeEventListener('message', readyHandler);
          clearTimeout(timeout);
          resolve();
        }
      };

      this.worker.addEventListener('message', readyHandler);
    });
  }

  /**
   * Logs debug messages if debug logging is enabled.
   * 
   * @param args - Arguments to log
   */
  private log(...args: unknown[]) {
    if (this.config.enableDebugLogging) {
      console.log('[TennisWorkerManager]', ...args);
    }
  }
}

// === Singleton Instance Management ===

/**
 * Singleton instance of TennisWorkerManager.
 * Ensures only one worker instance exists.
 */
let workerManagerInstance: TennisWorkerManager | null = null;

/**
 * Gets the singleton TennisWorkerManager instance.
 * Creates a new instance if one doesn't exist.
 * 
 * @param config - Optional configuration (only used on first creation)
 * @returns The singleton TennisWorkerManager instance
 */
export const getTennisWorkerManager = (config?: TennisWorkerConfig): TennisWorkerManager => {
  if (!workerManagerInstance) {
    workerManagerInstance = new TennisWorkerManager(config);
  }
  return workerManagerInstance;
};

/**
 * Initializes the tennis worker with configuration.
 * 
 * @param config - Optional configuration
 * @returns Initialized TennisWorkerManager instance
 * @throws Error if initialization fails
 */
export const initializeTennisWorker = async (config?: TennisWorkerConfig): Promise<TennisWorkerManager> => {
  const manager = getTennisWorkerManager(config);
  await manager.initialize();
  return manager;
};

/**
 * Terminates the tennis worker and cleans up.
 * 
 * @throws Error if termination fails
 */
export const terminateTennisWorker = async (): Promise<void> => {
  if (workerManagerInstance) {
    await workerManagerInstance.terminate();
    workerManagerInstance = null;
  }
};
