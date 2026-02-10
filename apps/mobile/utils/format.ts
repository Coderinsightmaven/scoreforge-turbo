/**
 * Format a timestamp for display with date and time
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format a timestamp for display with short date and time (no weekday)
 */
export function formatTimeShort(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type MatchScoreData = {
  sport: string;
  participant1Score: number;
  participant2Score: number;
  tennisState?: {
    sets?: number[][];
    currentSetGames?: number[];
    isMatchComplete?: boolean;
  } | null;
};

/**
 * Get a formatted score display string for a match
 */
export function getScoreDisplay(match: MatchScoreData): string {
  if (match.sport === "tennis" && match.tennisState) {
    const sets = match.tennisState.sets || [];
    const current = match.tennisState.currentSetGames || [0, 0];
    const setScores = sets.map((s) => `${s[0]}-${s[1]}`);
    if (!match.tennisState.isMatchComplete) {
      setScores.push(`${current[0]}-${current[1]}*`);
    }
    return setScores.join("  ") || "0-0";
  }
  return `${match.participant1Score} - ${match.participant2Score}`;
}

/**
 * Get a compact formatted score display string for a match card
 */
export function getScoreDisplayCompact(match: MatchScoreData): string {
  if (match.sport === "tennis" && match.tennisState) {
    const sets = match.tennisState.sets || [];
    if (sets.length === 0 && !match.tennisState.isMatchComplete) {
      return `${match.tennisState.currentSetGames?.[0] || 0}-${match.tennisState.currentSetGames?.[1] || 0}`;
    }
    return sets.map((s) => `${s[0]}-${s[1]}`).join(", ");
  }
  return `${match.participant1Score}-${match.participant2Score}`;
}
