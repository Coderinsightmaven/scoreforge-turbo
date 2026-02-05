/**
 * Hooks for processing and accessing tennis match data.
 * 
 * Provides React hooks for:
 * - Processing tennis data via Rust backend
 * - Accessing processed match data
 * - Batch processing multiple matches
 * - Error handling and loading states
 */
import { useEffect, useState, useCallback } from 'react';
import { useLiveDataStore } from '../stores/useLiveDataStore';
import { ProcessedTennisMatch, getRustTennisProcessor } from '../services/rustTennisProcessor';
import { RawTennisData } from '../types/tennisProcessor';

export interface UseTennisWorkerDataOptions {
  /** Optional component ID for tracking */
  componentId?: string;
  /** Debounce delay in milliseconds (reserved for future use) */
  debounceMs?: number;
  /** Whether to enable fallback processing */
  enableFallback?: boolean;
}

export interface UseTennisWorkerDataResult {
  /** Processed tennis match data */
  processedData: ProcessedTennisMatch | null;
  /** Whether data is currently being processed */
  isProcessing: boolean;
  /** Error message if processing failed */
  error: string | null;
  /** Function to process raw tennis data */
  processData: (rawData: RawTennisData) => Promise<void>;
  /** Timestamp of last successful update */
  lastUpdate: Date | null;
}

/**
 * Hook for processing tennis data via Rust backend.
 * 
 * Features:
 * - Processes raw tennis data through Rust backend
 * - Tracks processing state and errors
 * - Updates when live data store changes
 * - Provides manual processing function
 * 
 * @param options - Configuration options
 * @returns Object with processed data, state, and processing function
 */
export const useTennisWorkerData = (
  options: UseTennisWorkerDataOptions = {}
): UseTennisWorkerDataResult => {
  const {
    componentId,
    debounceMs = 100,
    enableFallback = true
  } = options;

  // Reserved for future debouncing implementation
  console.log('Debounce configured:', debounceMs);

  const {
    lastProcessedData,
    lastError
  } = useLiveDataStore();

  const [processedData, setProcessedData] = useState<ProcessedTennisMatch | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Update local state when store data changes
  useEffect(() => {
    if (lastProcessedData) {
      setProcessedData(lastProcessedData);
      setLastUpdate(new Date());
      setError(null);
    }
  }, [lastProcessedData]);

  // Update error state when store error changes
  useEffect(() => {
    if (lastError) {
      setError(lastError);
    }
  }, [lastError]);

  /**
   * Processes raw tennis data through Rust backend.
   * 
   * @param rawData - Raw tennis data to process
   * 
   * Side effects:
   * - Sets isProcessing state during operation
   * - Updates processedData on success
   * - Sets error state on failure
   * - Updates lastUpdate timestamp
   */
  const processData = useCallback(async (rawData: RawTennisData) => {
    setIsProcessing(true);
    setError(null);

    try {
      const processor = getRustTennisProcessor({
        enableDebugLogging: import.meta.env.DEV
      });

      const result = await processor.processData(rawData);
      setProcessedData(result);
      setLastUpdate(new Date());
      console.log(`✅ Data processed via Rust for ${componentId || 'component'}:`, result.match_id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown processing error';
      setError(errorMessage);
      console.error(`❌ Rust processing failed for ${componentId || 'component'}:`, err);

      if (!enableFallback) {
        throw err;
      }
    } finally {
      setIsProcessing(false);
    }
  }, [componentId, enableFallback]);

  return {
    processedData,
    isProcessing,
    error,
    processData,
    lastUpdate
  };
};

/**
 * Hook for getting tennis match data by component ID.
 *
 * Automatically fetches and processes match data for a specific component
 * from the first active ScoreForge connection.
 *
 * @param componentId - Component ID to get match data for
 * @returns Tennis worker data result with processed match data
 */
export const useTennisMatchData = (componentId: string) => {
  const { connections, getLiveData } = useLiveDataStore();
  const workerData = useTennisWorkerData({ componentId });

  useEffect(() => {
    const fetchMatchData = async () => {
      try {
        // Find the first active ScoreForge connection
        const activeConnection = connections.find(
          (conn) => conn.provider === 'scoreforge' && conn.isActive
        );

        if (activeConnection) {
          const rawData = getLiveData(activeConnection.id);
          if (rawData) {
            await workerData.processData(rawData as RawTennisData);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to fetch match data for ${componentId}:`, error);
      }
    };

    if (componentId) {
      fetchMatchData();
    }
  }, [componentId, connections, getLiveData, workerData]);

  return workerData;
};

/**
 * Hook for batch processing multiple tennis data items.
 * 
 * Useful for processing multiple matches or large datasets efficiently.
 * 
 * Features:
 * - Processes items sequentially
 * - Tracks progress (completed/total)
 * - Returns all processed results
 * - Handles errors gracefully
 * 
 * @returns Object with batch processing function and state
 */
export const useBatchTennisProcessing = () => {
  const { processTennisDataViaRust } = useLiveDataStore();
  const [batchResults, setBatchResults] = useState<ProcessedTennisMatch[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ completed: 0, total: 0 });

  const processBatch = useCallback(async (rawDataArray: RawTennisData[]): Promise<ProcessedTennisMatch[]> => {
    setIsBatchProcessing(true);
    setBatchProgress({ completed: 0, total: rawDataArray.length });
    setBatchResults([]);

    const results: ProcessedTennisMatch[] = [];

    try {
      for (let i = 0; i < rawDataArray.length; i++) {
        const processedData = await processTennisDataViaRust(rawDataArray[i]);
        results.push(processedData);

        setBatchProgress({ completed: i + 1, total: rawDataArray.length });
        setBatchResults([...results]);
      }

      console.log(`✅ Batch processing completed: ${results.length} items processed`);
      return results;
    } catch (error) {
      console.error('❌ Batch processing failed:', error);
      throw error;
    } finally {
      setIsBatchProcessing(false);
    }
  }, [processTennisDataViaRust]);

  return {
    processBatch,
    batchResults,
    isBatchProcessing,
    batchProgress,
    clearBatchResults: () => setBatchResults([])
  };
};
