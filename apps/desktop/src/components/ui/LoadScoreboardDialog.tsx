import React, { useState, useEffect } from 'react';
import { TauriAPI, TauriScoreboardConfig } from '../../lib/tauri';
import { useScoreboardStore } from '../../stores/useScoreboardStore';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { Dialog, DialogHeader, DialogContent, DialogFooter } from './Dialog';
import { Button } from './button';
import { cn } from '../../utils/cn';

interface LoadScoreboardDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoadScoreboardDialog: React.FC<LoadScoreboardDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const [savedScoreboards, setSavedScoreboards] = useState<TauriScoreboardConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedScoreboardId, setSelectedScoreboardId] = useState<string>('');

  const { loadScoreboard } = useScoreboardStore();
  const { setCanvasSize } = useCanvasStore();

  useEffect(() => {
    if (isOpen) {
      loadSavedScoreboards();
    }
  }, [isOpen]);

  const loadSavedScoreboards = async () => {
    setIsLoading(true);
    try {
      const scoreboards = await TauriAPI.listScoreboards();
      setSavedScoreboards(scoreboards);
    } catch (error) {
      console.error('Failed to load saved scoreboards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadScoreboard = async () => {
    if (!selectedScoreboardId) return;

    const selectedScoreboard = savedScoreboards.find(
      (sb) => sb.id === selectedScoreboardId
    );
    if (!selectedScoreboard) return;

    try {
      setIsLoading(true);
      const scoreboardData = await TauriAPI.loadScoreboard(selectedScoreboard.filename);
      loadScoreboard(scoreboardData.data);

      if (scoreboardData.data.dimensions) {
        setCanvasSize(
          scoreboardData.data.dimensions.width,
          scoreboardData.data.dimensions.height
        );
      }

      onClose();
    } catch (error) {
      console.error('Failed to load scoreboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg">
      <DialogHeader onClose={onClose}>Load Scoreboard</DialogHeader>

      <DialogContent>
        {isLoading && savedScoreboards.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span>Loading scoreboards...</span>
            </div>
          </div>
        ) : savedScoreboards.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-1">
              No saved scoreboards
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Create and save a scoreboard to see it here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedScoreboards.map((scoreboard) => (
              <button
                key={scoreboard.id}
                onClick={() => setSelectedScoreboardId(scoreboard.id)}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all',
                  selectedScoreboardId === scoreboard.id
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-500'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                )}
              >
                {/* Preview thumbnail */}
                <div
                  className={cn(
                    'w-16 h-12 rounded flex-shrink-0 flex items-center justify-center',
                    'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                  )}
                >
                  <svg
                    className="w-6 h-6 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"
                    />
                  </svg>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {scoreboard.data?.name || scoreboard.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <span>
                      {scoreboard.data?.dimensions
                        ? `${scoreboard.data.dimensions.width} x ${scoreboard.data.dimensions.height}`
                        : 'Unknown size'}
                    </span>
                    <span className="text-gray-300 dark:text-gray-600">|</span>
                    <span>{scoreboard.data?.components?.length || 0} components</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Created {formatDate(scoreboard.created_at)}
                  </p>
                </div>

                {/* Radio indicator */}
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                    selectedScoreboardId === scoreboard.id
                      ? 'border-indigo-500 bg-indigo-500'
                      : 'border-gray-300 dark:border-gray-600'
                  )}
                >
                  {selectedScoreboardId === scoreboard.id && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>

      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleLoadScoreboard}
          disabled={!selectedScoreboardId || isLoading}
          isLoading={isLoading}
        >
          Load Scoreboard
        </Button>
      </DialogFooter>
    </Dialog>
  );
};
