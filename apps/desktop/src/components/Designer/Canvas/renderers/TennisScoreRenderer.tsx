/**
 * TennisScoreRenderer - Renders tennis score components with live data.
 *
 * Handles: TENNIS_GAME_SCORE, TENNIS_SET_SCORE, TENNIS_MATCH_SCORE,
 * TENNIS_DETAILED_SET_SCORE, and individual set/player score components.
 */
import React from 'react';
import { ComponentType, TennisLiveData } from '../../../../types/scoreboard';
import { getDefaultTennisText, getAlignmentClasses } from '../../../../utils/tennisDefaults';

interface TennisScoreRendererProps {
  componentType: ComponentType;
  componentData: {
    playerNumber?: number;
    setNumber?: number;
    text?: string;
  };
  componentStyle: {
    fontSize?: number;
    textColor?: string;
    fontWeight?: string;
    textAlign?: string;
  };
  componentId: string;
  tennisMatch: TennisLiveData | null;
}

export const TennisScoreRenderer: React.FC<TennisScoreRendererProps> = ({
  componentType,
  componentData,
  componentStyle,
  componentId,
  tennisMatch,
}) => {
  const { justify, textAlign: textAlignClass } = getAlignmentClasses(componentStyle.textAlign);

  const getDisplayValue = (): string => {
    const fallback = componentData.text || getDefaultTennisText(componentType, componentData);

    if (!tennisMatch) {
      return fallback;
    }

    switch (componentType) {
      case ComponentType.TENNIS_GAME_SCORE:
        return componentData.playerNumber === 2
          ? tennisMatch.score.player2Points ?? '0'
          : tennisMatch.score.player1Points ?? '0';

      case ComponentType.TENNIS_SET_SCORE: {
        const sets = componentData.playerNumber === 2
          ? tennisMatch.score.player2Sets
          : tennisMatch.score.player1Sets;
        return sets !== undefined ? sets.toString() : '0';
      }

      case ComponentType.TENNIS_MATCH_SCORE:
        return `${tennisMatch.score.player1Sets}-${tennisMatch.score.player2Sets}`;

      case ComponentType.TENNIS_DETAILED_SET_SCORE: {
        if (!tennisMatch.sets) return fallback;
        const playerNumber = componentData.playerNumber || 1;
        const setNumber = componentData.setNumber || 1;
        const setKey = setNumber.toString();

        // Only show score if the set exists (has been started)
        if (tennisMatch.sets[setKey]) {
          const playerScore =
            playerNumber === 1
              ? tennisMatch.sets[setKey].player1 || 0
              : tennisMatch.sets[setKey].player2 || 0;
          return playerScore.toString();
        }
        // Return empty for sets that haven't started yet
        return '';
      }

      default:
        return fallback;
    }
  };

  return (
    <div
      className={`w-full h-full flex items-center ${justify} ${textAlignClass} px-2 relative score-change-base tennis-component`}
      style={{
        fontSize: `${componentStyle.fontSize || 16}px`,
        color: componentStyle.textColor || '#ffffff',
        fontWeight: componentStyle.fontWeight || 'bold',
        wordWrap: 'break-word',
        overflow: 'hidden',
        transition: 'transform 0.2s ease',
      }}
      data-component-id={componentId}
      data-component-type={componentType}
      data-player-number={componentData.playerNumber || 1}
    >
      {getDisplayValue()}
    </div>
  );
};
