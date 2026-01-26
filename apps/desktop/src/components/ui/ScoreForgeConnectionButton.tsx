import React, { useState } from 'react';
import { useLiveDataStore } from '../../stores/useLiveDataStore';
import { ScoreForgeConnectionDialog } from './ScoreForgeConnectionDialog';
import { cn } from '../../utils/cn';

export const ScoreForgeConnectionButton: React.FC = () => {
  const [showDialog, setShowDialog] = useState(false);
  const { connections } = useLiveDataStore();

  const activeConnection = connections.find(
    (c) => c.provider === 'scoreforge' && c.isActive
  );

  const isConnected = !!activeConnection;

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className={cn(
          'inline-flex items-center gap-2',
          'px-3 py-2 rounded-lg',
          'text-sm font-medium',
          'transition-all duration-fast',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          isConnected
            ? [
                'bg-success text-white',
                'hover:bg-success-dark',
                'focus-visible:ring-success',
              ]
            : [
                'bg-indigo-600 text-white',
                'hover:bg-indigo-700',
                'focus-visible:ring-indigo-500',
              ]
        )}
        title={isConnected ? 'ScoreForge Connected' : 'Connect to ScoreForge'}
      >
        {/* Lightning bolt icon */}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>

        <span className="hidden sm:inline">
          {isConnected ? 'Connected' : 'Connect'}
        </span>

        {/* Status indicator dot */}
        {isConnected && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
        )}
      </button>

      <ScoreForgeConnectionDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
      />
    </>
  );
};
