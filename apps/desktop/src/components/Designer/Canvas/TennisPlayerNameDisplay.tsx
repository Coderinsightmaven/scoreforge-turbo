import React from 'react';
import { ComponentType } from '../../../types/scoreboard';
import { TennisLiveData } from '../../../types/scoreboard';
import { TeamNames } from './TeamNames';
import { AdaptiveTeamDisplay } from './AdaptiveTeamDisplay';

interface TennisPlayerNameDisplayProps {
  tennisMatch: TennisLiveData | null;
  componentType: ComponentType;
  componentData: any;
  fallbackText?: string;
}

export const TennisPlayerNameDisplay: React.FC<TennisPlayerNameDisplayProps> = ({
  tennisMatch,
  componentType,
  componentData,
  fallbackText,
}) => {
  // Helper to format name as "F. LastName"
  const formatDoublesName = (fullName: string | undefined): string => {
    if (!fullName || typeof fullName !== 'string') return '';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0]; // Just last name
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');
    return `${firstName.charAt(0)}. ${lastName}`;
  };

  const getDisplayValue = (): React.ReactNode => {
    if (!tennisMatch) {
      return fallbackText || getDefaultText();
    }

    switch (componentType) {
      case ComponentType.TENNIS_PLAYER_NAME:
        return componentData.playerNumber === 2
          ? tennisMatch.player2?.name || 'Player 2'
          : tennisMatch.player1?.name || 'Player 1';

      case ComponentType.TENNIS_DOUBLES_PLAYER_NAME:
        // For doubles, show both player names for a team
        // 1 = Team 1 (both players), 2 = Team 2 (both players)
        const teamSelection = componentData.playerNumber || 1;
        const separator = componentData.separator || ' / ';

        if (tennisMatch.doublesPlayers) {
          if (teamSelection === 1) {
            const p1 = formatDoublesName(tennisMatch.doublesPlayers.team1?.player1?.name);
            const p2 = formatDoublesName(tennisMatch.doublesPlayers.team1?.player2?.name);
            if (p1 && p2) return `${p1}${separator}${p2}`;
            if (p1) return p1;
            if (p2) return p2;
          } else if (teamSelection === 2) {
            const p1 = formatDoublesName(tennisMatch.doublesPlayers.team2?.player1?.name);
            const p2 = formatDoublesName(tennisMatch.doublesPlayers.team2?.player2?.name);
            if (p1 && p2) return `${p1}${separator}${p2}`;
            if (p1) return p1;
            if (p2) return p2;
          }
        }
        // Fallback to team name if doublesPlayers not available
        return (
          <TeamNames
            tennisMatch={tennisMatch}
            teamSelection={teamSelection}
            fallbackText={fallbackText || getDefaultText()}
          />
        );

      case ComponentType.TENNIS_TEAM_NAMES:
        // For team names, use the TeamNames component with team selection
        return (
          <TeamNames
            tennisMatch={tennisMatch}
            teamSelection={componentData.teamSelection || 0}
            fallbackText={fallbackText || getDefaultText()}
          />
        );

      case ComponentType.TENNIS_ADAPTIVE_TEAM_DISPLAY:
        // For adaptive team display, use the AdaptiveTeamDisplay component
        return (
          <AdaptiveTeamDisplay
            tennisMatch={tennisMatch}
            teamSelection={componentData.teamSelection || 0}
            fallbackText={fallbackText || getDefaultText()}
          />
        );

      default:
        return fallbackText || getDefaultText();
    }
  };

  const getDefaultText = (): string => {
    switch (componentType) {
      case ComponentType.TENNIS_PLAYER_NAME:
        return `Player ${componentData.playerNumber || 1}`;
      case ComponentType.TENNIS_DOUBLES_PLAYER_NAME:
        const doublesTeam = componentData.playerNumber || 1;
        if (doublesTeam === 1) return 'J. Smith / M. Johnson';
        if (doublesTeam === 2) return 'A. Williams / K. Brown';
        return 'J. Smith / M. Johnson';
      case ComponentType.TENNIS_TEAM_NAMES:
        const teamSelection = componentData.teamSelection || 0;
        if (teamSelection === 1) return 'Team 1';
        if (teamSelection === 2) return 'Team 2';
        return 'Team 1 vs Team 2';
      case ComponentType.TENNIS_ADAPTIVE_TEAM_DISPLAY:
        const adaptiveTeamSelection = componentData.teamSelection || 0;
        if (adaptiveTeamSelection === 1) return 'Team 1';
        if (adaptiveTeamSelection === 2) return 'Team 2';
        return 'Team 1 vs Team 2';
      default:
        return 'Tennis Player';
    }
  };

  return <>{getDisplayValue()}</>;
};
