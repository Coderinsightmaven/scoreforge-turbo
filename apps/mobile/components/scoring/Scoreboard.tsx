import { View, Text } from "react-native";

type ScoreboardProps = {
  isLive: boolean;
  isTiebreak: boolean;
  tiebreakMode?: "set" | "match";
  gameStatus: string | null;
  p1Points: string;
  p2Points: string;
  currentSetGames: number[];
  sets: number[][];
  servingParticipant: number;
  isLandscape: boolean;
};

/**
 * Shared tennis scoreboard display for scoring screens.
 * Extracted from the inline definitions in both (app) and (scorer) scoring screens.
 */
export function Scoreboard({
  isLive,
  isTiebreak,
  tiebreakMode,
  gameStatus,
  p1Points,
  p2Points,
  currentSetGames,
  sets,
  servingParticipant,
  isLandscape,
}: ScoreboardProps) {
  return (
    <View
      className={`relative overflow-hidden rounded-2xl border border-border bg-bg-card p-6 shadow-lg shadow-black/10 dark:border-border-dark dark:bg-bg-card-dark ${
        isLandscape ? "w-72" : "w-80"
      }`}>
      <View className="absolute left-6 right-6 top-3 h-px bg-brand/40" />
      {/* Status Badges */}
      <View className="mb-3 flex-row items-center justify-center space-x-2">
        {isLive && (
          <View className="flex-row items-center rounded-full border border-status-live-border/30 bg-status-live-bg px-3 py-1">
            <View className="mr-1.5 h-2 w-2 rounded-full bg-status-live-border" />
            <Text className="text-[10px] font-semibold uppercase text-status-live-text">Live</Text>
          </View>
        )}
        {isTiebreak && (
          <View className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1">
            <Text className="text-[10px] font-semibold uppercase text-brand dark:text-brand-dark">
              {tiebreakMode === "match" ? "Match Tiebreak" : "Tiebreak"}
            </Text>
          </View>
        )}
      </View>

      {/* Game Status */}
      {gameStatus && (
        <View className="mb-3 items-center">
          <Text className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark">
            {gameStatus}
          </Text>
        </View>
      )}

      {/* Main Score Display */}
      <View className="mb-4 flex-row items-center justify-center">
        {/* Player 1 Points */}
        <View className="flex-1 items-center">
          {servingParticipant === 1 && (
            <View className="mb-1 h-2 w-2 rounded-full bg-brand shadow-lg shadow-brand/40" />
          )}
          <Text
            className={`font-bold text-brand dark:text-brand-dark ${
              isLandscape ? "text-5xl" : "text-6xl"
            }`}>
            {p1Points}
          </Text>
        </View>

        {/* Games in Center */}
        <View className="mx-4 items-center rounded-xl border border-border bg-bg-secondary px-4 py-2 dark:border-border-dark dark:bg-bg-secondary-dark">
          <Text className="text-xs text-text-muted dark:text-text-muted-dark">
            {isTiebreak ? (tiebreakMode === "match" ? "MTB" : "TB") : "GAME"}
          </Text>
          <Text className="text-xl font-bold text-text-primary dark:text-text-primary-dark">
            {currentSetGames[0]} - {currentSetGames[1]}
          </Text>
        </View>

        {/* Player 2 Points */}
        <View className="flex-1 items-center">
          {servingParticipant === 2 && (
            <View className="mb-1 h-2 w-2 rounded-full bg-brand shadow-lg shadow-brand/40" />
          )}
          <Text
            className={`font-bold text-brand dark:text-brand-dark ${
              isLandscape ? "text-5xl" : "text-6xl"
            }`}>
            {p2Points}
          </Text>
        </View>
      </View>

      {/* Set Scores */}
      {sets.length > 0 && (
        <View className="items-center">
          <Text className="text-sm text-text-muted dark:text-text-muted-dark">
            {sets.map((s) => `${s[0]}-${s[1]}`).join("   ")}
          </Text>
        </View>
      )}
    </View>
  );
}
