import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';
import { Button } from './button';
import { IconButton, Icons } from './IconButton';
import { ScoreForgeConnectionButton } from './ScoreForgeConnectionButton';

interface AppHeaderProps {
  config: any;
  scoreboardInstancesCount: number;
  selectedComponentsCount: number;
  clipboardCount: number;
  showPropertyPanel: boolean;
  onFitToScreen: () => void;
  onSave: () => void;
  onExport: () => void;
  onImport: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onShowMultipleManager: () => void;
  onShowLoadDialog: () => void;
  onShowCreateDialog: () => void;
  onShowScoreboardManager: () => void;
  onTogglePropertyPanel: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  config,
  scoreboardInstancesCount,
  selectedComponentsCount,
  clipboardCount,
  showPropertyPanel,
  onFitToScreen,
  onSave,
  onExport,
  onImport,
  onCopy,
  onPaste,
  onShowMultipleManager,
  onShowLoadDialog,
  onShowCreateDialog,
  onShowScoreboardManager,
  onTogglePropertyPanel,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreMenu]);

  return (
    <header
      className={cn(
        'flex items-center justify-between',
        'h-14 px-4',
        'bg-white dark:bg-gray-900',
        'border-b border-gray-200 dark:border-gray-800',
        'shadow-xs'
      )}
    >
      {/* Left section: Logo + Document info */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
              />
            </svg>
          </div>
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            ScoreForge
          </span>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

        {/* Document info */}
        {config ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {config.name}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
              {config.dimensions.width} × {config.dimensions.height}
            </span>
          </div>
        ) : (
          <span className="text-sm text-gray-400 dark:text-gray-500 italic">
            No scoreboard open
          </span>
        )}
      </div>

      {/* Center section: File actions */}
      <div className="flex items-center gap-1">
        {/* File action group - pill style */}
        <div
          className={cn(
            'flex items-center',
            'bg-gray-100 dark:bg-gray-800',
            'rounded-lg p-1',
            'gap-0.5'
          )}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowCreateDialog}
            className="rounded-md"
          >
            <Icons.Plus />
            <span className="ml-1.5">New</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowLoadDialog}
            className="rounded-md"
          >
            <Icons.Folder />
            <span className="ml-1.5">Open</span>
          </Button>
          {config && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSave}
              className="rounded-md"
            >
              <Icons.Save />
              <span className="ml-1.5">Save</span>
            </Button>
          )}
        </div>
      </div>

      {/* Right section: Tools + Actions */}
      <div className="flex items-center gap-2">
        {/* View controls */}
        {config && (
          <div className="flex items-center gap-1">
            <IconButton
              label="Fit to screen"
              size="sm"
              variant="ghost"
              onClick={onFitToScreen}
            >
              <Icons.FitScreen />
            </IconButton>
            <IconButton
              label={showPropertyPanel ? 'Hide properties' : 'Show properties'}
              size="sm"
              variant="ghost"
              isActive={showPropertyPanel}
              onClick={onTogglePropertyPanel}
            >
              <Icons.Properties />
            </IconButton>
          </div>
        )}

        {/* Divider */}
        {config && <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />}

        {/* Clipboard actions */}
        {config && (
          <div className="flex items-center gap-1">
            <IconButton
              label="Copy selected"
              size="sm"
              variant="ghost"
              onClick={onCopy}
              disabled={selectedComponentsCount === 0}
              badge={selectedComponentsCount > 0 ? selectedComponentsCount : undefined}
            >
              <Icons.Copy />
            </IconButton>
            <IconButton
              label="Paste"
              size="sm"
              variant="ghost"
              onClick={onPaste}
              disabled={clipboardCount === 0}
              badge={clipboardCount > 0 ? clipboardCount : undefined}
            >
              <Icons.Paste />
            </IconButton>
          </div>
        )}

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

        {/* Connection status */}
        <ScoreForgeConnectionButton />

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

        {/* Display manager */}
        <Button
          variant="outline"
          size="sm"
          onClick={onShowMultipleManager}
          leftIcon={<Icons.Grid />}
        >
          Displays
          {scoreboardInstancesCount > 0 && (
            <span className="ml-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs px-1.5 py-0.5 rounded-full">
              {scoreboardInstancesCount}
            </span>
          )}
        </Button>

        {/* More menu */}
        <div className="relative" ref={moreMenuRef}>
          <IconButton
            label="More actions"
            size="sm"
            variant="ghost"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            isActive={showMoreMenu}
          >
            <Icons.MoreVertical />
          </IconButton>

          {showMoreMenu && (
            <div
              className={cn(
                'absolute right-0 top-full mt-2',
                'w-48',
                'bg-white dark:bg-gray-900',
                'border border-gray-200 dark:border-gray-700',
                'rounded-lg shadow-lg',
                'py-1',
                'z-50',
                'animate-scale-in origin-top-right'
              )}
            >
              <button
                onClick={() => {
                  onShowScoreboardManager();
                  setShowMoreMenu(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm',
                  'text-gray-700 dark:text-gray-300',
                  'hover:bg-gray-50 dark:hover:bg-gray-800',
                  'transition-colors'
                )}
              >
                <span className="w-4 h-4">
                  <Icons.Settings />
                </span>
                Manage Scoreboards
              </button>

              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

              {config && (
                <button
                  onClick={() => {
                    onExport();
                    setShowMoreMenu(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm',
                    'text-gray-700 dark:text-gray-300',
                    'hover:bg-gray-50 dark:hover:bg-gray-800',
                    'transition-colors'
                  )}
                >
                  <span className="w-4 h-4">
                    <Icons.Download />
                  </span>
                  Export as ZIP
                </button>
              )}

              <button
                onClick={() => {
                  onImport();
                  setShowMoreMenu(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm',
                  'text-gray-700 dark:text-gray-300',
                  'hover:bg-gray-50 dark:hover:bg-gray-800',
                  'transition-colors'
                )}
              >
                <span className="w-4 h-4">
                  <Icons.Upload />
                </span>
                Import from ZIP
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
