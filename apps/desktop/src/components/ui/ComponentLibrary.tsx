import React, { useState } from 'react';
import { ComponentType } from '../../types/scoreboard';
import { cn } from '../../utils/cn';
import { Icons } from './IconButton';

interface ComponentLibraryProps {
  onAddComponent: (type: ComponentType, position: { x: number; y: number }) => void;
}

interface ComponentCategory {
  id: string;
  label: string;
  components: ComponentItem[];
}

interface ComponentItem {
  type: ComponentType;
  label: string;
  description: string;
  icon?: React.ReactNode;
}

const categories: ComponentCategory[] = [
  {
    id: 'static',
    label: 'Static',
    components: [
      { type: ComponentType.BACKGROUND, label: 'Background', description: 'Full-size background image' },
      { type: ComponentType.LOGO, label: 'Logo', description: 'Scalable logo image' },
      { type: ComponentType.TEXT, label: 'Text', description: 'Static text overlay' },
      { type: ComponentType.VIDEO, label: 'Video', description: 'Video player' },
    ],
  },
  {
    id: 'tennis-live',
    label: 'Tennis Live Data',
    components: [
      { type: ComponentType.TENNIS_PLAYER_NAME, label: 'Player Name', description: 'Live player name' },
      { type: ComponentType.TENNIS_DOUBLES_PLAYER_NAME, label: 'Doubles Names', description: 'Team format names' },
      { type: ComponentType.TENNIS_TEAM_NAMES, label: 'Team Names', description: 'Match team names' },
      { type: ComponentType.TENNIS_ADAPTIVE_TEAM_DISPLAY, label: 'Adaptive Display', description: 'Auto-format teams' },
      { type: ComponentType.TENNIS_GAME_SCORE, label: 'Game Score', description: 'Current game points' },
      { type: ComponentType.TENNIS_SET_SCORE, label: 'Set Score', description: 'Games in current set' },
      { type: ComponentType.TENNIS_MATCH_SCORE, label: 'Match Score', description: 'Sets won' },
      { type: ComponentType.TENNIS_DETAILED_SET_SCORE, label: 'Detailed Set', description: 'Per-set score' },
      { type: ComponentType.TENNIS_SERVING_INDICATOR, label: 'Serve Indicator', description: 'Who is serving' },
    ],
  },
  {
    id: 'set-scores',
    label: 'Individual Set Scores',
    components: [
      { type: ComponentType.PLAYER1_SET1, label: 'P1 Set 1', description: 'Player 1 - Set 1' },
      { type: ComponentType.PLAYER2_SET1, label: 'P2 Set 1', description: 'Player 2 - Set 1' },
      { type: ComponentType.PLAYER1_SET2, label: 'P1 Set 2', description: 'Player 1 - Set 2' },
      { type: ComponentType.PLAYER2_SET2, label: 'P2 Set 2', description: 'Player 2 - Set 2' },
      { type: ComponentType.PLAYER1_SET3, label: 'P1 Set 3', description: 'Player 1 - Set 3' },
      { type: ComponentType.PLAYER2_SET3, label: 'P2 Set 3', description: 'Player 2 - Set 3' },
      { type: ComponentType.PLAYER1_SET4, label: 'P1 Set 4', description: 'Player 1 - Set 4' },
      { type: ComponentType.PLAYER2_SET4, label: 'P2 Set 4', description: 'Player 2 - Set 4' },
      { type: ComponentType.PLAYER1_SET5, label: 'P1 Set 5', description: 'Player 1 - Set 5' },
      { type: ComponentType.PLAYER2_SET5, label: 'P2 Set 5', description: 'Player 2 - Set 5' },
    ],
  },
  {
    id: 'combined-sets',
    label: 'Combined Set Scores',
    components: [
      { type: ComponentType.TENNIS_SET_1, label: 'Set 1', description: 'Combined set 1 score' },
      { type: ComponentType.TENNIS_SET_2, label: 'Set 2', description: 'Combined set 2 score' },
      { type: ComponentType.TENNIS_SET_3, label: 'Set 3', description: 'Combined set 3 score' },
      { type: ComponentType.TENNIS_SET_4, label: 'Set 4', description: 'Combined set 4 score' },
      { type: ComponentType.TENNIS_SET_5, label: 'Set 5', description: 'Combined set 5 score' },
    ],
  },
];

export const ComponentLibrary: React.FC<ComponentLibraryProps> = ({ onAddComponent }) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['static', 'tennis-live'])
  );
  const [searchQuery, setSearchQuery] = useState('');

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const filteredCategories = searchQuery
    ? categories
        .map((cat) => ({
          ...cat,
          components: cat.components.filter(
            (comp) =>
              comp.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
              comp.description.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((cat) => cat.components.length > 0)
    : categories;

  return (
    <div
      className={cn(
        'w-56 flex flex-col',
        'bg-white dark:bg-gray-900',
        'border-r border-gray-200 dark:border-gray-800'
      )}
    >
      {/* Header */}
      <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Components
        </h3>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full h-8 px-3 pr-8 text-sm rounded-md',
              'bg-gray-50 dark:bg-gray-800',
              'border border-gray-200 dark:border-gray-700',
              'text-gray-900 dark:text-gray-100',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
              'transition-colors'
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <span className="w-4 h-4 block">
                <Icons.Close />
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
        {filteredCategories.map((category) => (
          <div key={category.id} className="mb-1">
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category.id)}
              className={cn(
                'w-full flex items-center justify-between',
                'px-3 py-2',
                'text-xs font-semibold uppercase tracking-wide',
                'text-gray-500 dark:text-gray-400',
                'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                'transition-colors'
              )}
            >
              <span>{category.label}</span>
              <span
                className={cn(
                  'w-4 h-4 transition-transform',
                  expandedCategories.has(category.id) && 'rotate-90'
                )}
              >
                <Icons.ChevronRight />
              </span>
            </button>

            {/* Category components */}
            {(expandedCategories.has(category.id) || searchQuery) && (
              <div className="px-2 pb-1">
                {category.components.map((component) => (
                  <button
                    key={component.type}
                    onClick={() => onAddComponent(component.type, { x: 100, y: 100 })}
                    className={cn(
                      'w-full flex items-start gap-2',
                      'px-2 py-2 mb-0.5 rounded-md',
                      'text-left',
                      'hover:bg-gray-100 dark:hover:bg-gray-800',
                      'active:bg-gray-200 dark:active:bg-gray-700',
                      'transition-colors',
                      'group'
                    )}
                  >
                    {/* Icon placeholder */}
                    <div
                      className={cn(
                        'w-8 h-8 rounded flex-shrink-0',
                        'flex items-center justify-center',
                        'bg-gray-100 dark:bg-gray-800',
                        'text-gray-500 dark:text-gray-400',
                        'group-hover:bg-indigo-100 group-hover:text-indigo-600',
                        'dark:group-hover:bg-indigo-900/30 dark:group-hover:text-indigo-400',
                        'transition-colors'
                      )}
                    >
                      <ComponentIcon type={component.type} />
                    </div>

                    {/* Label + Description */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {component.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {component.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <div className="px-3 py-6 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No components found
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Simple icon component for different component types
const ComponentIcon: React.FC<{ type: ComponentType }> = ({ type }) => {
  const iconClass = 'w-4 h-4';

  switch (type) {
    case ComponentType.BACKGROUND:
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case ComponentType.LOGO:
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      );
    case ComponentType.TEXT:
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      );
    case ComponentType.VIDEO:
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    case ComponentType.TENNIS_PLAYER_NAME:
    case ComponentType.TENNIS_DOUBLES_PLAYER_NAME:
    case ComponentType.TENNIS_TEAM_NAMES:
    case ComponentType.TENNIS_ADAPTIVE_TEAM_DISPLAY:
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case ComponentType.TENNIS_GAME_SCORE:
    case ComponentType.TENNIS_SET_SCORE:
    case ComponentType.TENNIS_MATCH_SCORE:
    case ComponentType.TENNIS_DETAILED_SET_SCORE:
    case ComponentType.PLAYER1_SET1:
    case ComponentType.PLAYER2_SET1:
    case ComponentType.PLAYER1_SET2:
    case ComponentType.PLAYER2_SET2:
    case ComponentType.PLAYER1_SET3:
    case ComponentType.PLAYER2_SET3:
    case ComponentType.PLAYER1_SET4:
    case ComponentType.PLAYER2_SET4:
    case ComponentType.PLAYER1_SET5:
    case ComponentType.PLAYER2_SET5:
    case ComponentType.TENNIS_SET_1:
    case ComponentType.TENNIS_SET_2:
    case ComponentType.TENNIS_SET_3:
    case ComponentType.TENNIS_SET_4:
    case ComponentType.TENNIS_SET_5:
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    case ComponentType.TENNIS_SERVING_INDICATOR:
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="8" strokeWidth={2} />
          <path strokeLinecap="round" strokeWidth={2} d="M8 12c0-2 1.5-3.5 4-3.5s4 1.5 4 3.5-1.5 3.5-4 3.5-4-1.5-4-3.5" />
        </svg>
      );
    default:
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      );
  }
};
