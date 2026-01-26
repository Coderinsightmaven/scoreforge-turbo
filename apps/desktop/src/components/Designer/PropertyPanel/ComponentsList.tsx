import React from 'react';
import { ComponentType, ScoreboardComponent } from '../../../types/scoreboard';
import { cn } from '../../../utils/cn';
import { Button } from '../../ui/button';
import { IconButton, Icons } from '../../ui/IconButton';

interface ComponentsListProps {
  components: ScoreboardComponent[];
  onSelectComponent: (componentId: string) => void;
  onDeleteComponent: (componentId: string) => void;
  onToggleVisibility: (componentId: string) => void;
  onClearSelection: () => void;
  onDeleteAll: () => void;
}

export const ComponentsList: React.FC<ComponentsListProps> = ({
  components,
  onSelectComponent,
  onDeleteComponent,
  onToggleVisibility,
  onClearSelection,
  onDeleteAll,
}) => {
  const sortedComponents = [...components].sort((a, b) => {
    const zIndexDiff = (a.zIndex || 0) - (b.zIndex || 0);
    if (zIndexDiff !== 0) return zIndexDiff;
    return a.id.localeCompare(b.id);
  });

  const getComponentTypeName = (type: ComponentType): string => {
    const names: Record<ComponentType, string> = {
      [ComponentType.BACKGROUND]: 'Background',
      [ComponentType.LOGO]: 'Logo',
      [ComponentType.TEXT]: 'Text',
      [ComponentType.VIDEO]: 'Video',
      [ComponentType.TENNIS_PLAYER_NAME]: 'Player Name',
      [ComponentType.TENNIS_DOUBLES_PLAYER_NAME]: 'Doubles Names',
      [ComponentType.TENNIS_TEAM_NAMES]: 'Team Names',
      [ComponentType.TENNIS_ADAPTIVE_TEAM_DISPLAY]: 'Adaptive Display',
      [ComponentType.TENNIS_GAME_SCORE]: 'Game Score',
      [ComponentType.TENNIS_SET_SCORE]: 'Set Score',
      [ComponentType.TENNIS_MATCH_SCORE]: 'Match Score',
      [ComponentType.TENNIS_DETAILED_SET_SCORE]: 'Detailed Set',
      [ComponentType.TENNIS_SERVING_INDICATOR]: 'Serving',
      [ComponentType.PLAYER1_SET1]: 'P1 Set 1',
      [ComponentType.PLAYER2_SET1]: 'P2 Set 1',
      [ComponentType.PLAYER1_SET2]: 'P1 Set 2',
      [ComponentType.PLAYER2_SET2]: 'P2 Set 2',
      [ComponentType.PLAYER1_SET3]: 'P1 Set 3',
      [ComponentType.PLAYER2_SET3]: 'P2 Set 3',
      [ComponentType.PLAYER1_SET4]: 'P1 Set 4',
      [ComponentType.PLAYER2_SET4]: 'P2 Set 4',
      [ComponentType.PLAYER1_SET5]: 'P1 Set 5',
      [ComponentType.PLAYER2_SET5]: 'P2 Set 5',
      [ComponentType.TENNIS_SET_1]: 'Set 1',
      [ComponentType.TENNIS_SET_2]: 'Set 2',
      [ComponentType.TENNIS_SET_3]: 'Set 3',
      [ComponentType.TENNIS_SET_4]: 'Set 4',
      [ComponentType.TENNIS_SET_5]: 'Set 5',
    };
    return names[type] || 'Unknown';
  };

  const getComponentDisplayText = (component: ScoreboardComponent): string => {
    if (component.data.text) {
      return component.data.text.length > 20
        ? component.data.text.substring(0, 20) + '...'
        : component.data.text;
    }

    switch (component.type) {
      case ComponentType.TENNIS_PLAYER_NAME:
        return `Player ${component.data.playerNumber || 1}`;
      case ComponentType.TENNIS_GAME_SCORE:
      case ComponentType.TENNIS_SET_SCORE:
      case ComponentType.TENNIS_MATCH_SCORE:
        return `Player ${component.data.playerNumber || 1}`;
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="pb-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Components
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {components.length} component{components.length !== 1 ? 's' : ''} in design
        </p>
      </div>

      {/* Empty State */}
      {components.length === 0 ? (
        <div className="py-8 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
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
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">No components</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Add from the sidebar
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {sortedComponents.map((component, index) => (
            <button
              key={component.id}
              onClick={() => onSelectComponent(component.id)}
              className={cn(
                'w-full flex items-center gap-3 p-2.5 rounded-lg text-left',
                'bg-gray-50 dark:bg-gray-800/50',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'border border-transparent',
                'hover:border-gray-200 dark:hover:border-gray-700',
                'transition-all duration-fast',
                'group',
                !component.visible && 'opacity-50'
              )}
            >
              {/* Index badge */}
              <div
                className={cn(
                  'w-6 h-6 rounded flex-shrink-0',
                  'flex items-center justify-center',
                  'text-xs font-medium',
                  'bg-gray-200 dark:bg-gray-700',
                  'text-gray-600 dark:text-gray-400'
                )}
              >
                {index + 1}
              </div>

              {/* Component info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {getComponentTypeName(component.type)}
                </div>
                {getComponentDisplayText(component) && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {getComponentDisplayText(component)}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <IconButton
                  label={component.visible ? 'Hide' : 'Show'}
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(component.id);
                  }}
                >
                  {component.visible ? <Icons.Eye /> : <Icons.EyeOff />}
                </IconButton>
                <IconButton
                  label="Delete"
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this component?')) {
                      onDeleteComponent(component.id);
                    }
                  }}
                  className="text-error hover:text-error-dark"
                >
                  <Icons.Trash />
                </IconButton>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Bulk Actions */}
      {components.length > 0 && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClearSelection}
              className="flex-1"
            >
              Deselect
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm(`Delete all ${components.length} components?`)) {
                  onDeleteAll();
                }
              }}
              className="flex-1"
            >
              Delete All
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
