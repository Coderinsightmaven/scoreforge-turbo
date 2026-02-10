import { View, Text } from "react-native";

type ScoreboardProps = {
  isLive: boolean;
  isTiebreak: boolean;
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
      className={`rounded-2xl border-2 border-dark-elevated bg-dark-bg p-6 ${isLandscape ? "w-72" : "w-80"}`}>
      {/* Status Badges */}
      <View className="mb-3 flex-row items-center justify-center space-x-2">
        {isLive && (
          <View className="flex-row items-center rounded-lg border border-red-500/30 bg-red-500/20 px-3 py-1">
            <View className="mr-1.5 h-2 w-2 rounded-full bg-red-500" />
            <Text className="text-xs font-medium text-red-500">LIVE</Text>
          </View>
        )}
        {isTiebreak && (
          <View className="rounded-lg border border-brand/30 bg-brand/20 px-3 py-1">
            <Text className="text-xs font-medium text-brand-glow">TIEBREAK</Text>
          </View>
        )}
      </View>

      {/* Game Status */}
      {gameStatus && (
        <View className="mb-3 items-center">
          <Text className="text-sm font-medium text-brand-glow">{gameStatus}</Text>
        </View>
      )}

      {/* Main Score Display */}
      <View className="mb-4 flex-row items-center justify-center">
        {/* Player 1 Points */}
        <View className="flex-1 items-center">
          {servingParticipant === 1 && (
            <View className="mb-1 h-2 w-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
          )}
          <Text className={`font-bold text-brand-glow ${isLandscape ? "text-5xl" : "text-6xl"}`}>
            {p1Points}
          </Text>
        </View>

        {/* Games in Center */}
        <View className="mx-4 items-center rounded-xl bg-dark-card px-4 py-2">
          <Text className="text-xs text-slate-400">{isTiebreak ? "TB" : "GAME"}</Text>
          <Text className="text-xl font-bold text-white">
            {currentSetGames[0]} - {currentSetGames[1]}
          </Text>
        </View>

        {/* Player 2 Points */}
        <View className="flex-1 items-center">
          {servingParticipant === 2 && (
            <View className="mb-1 h-2 w-2 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
          )}
          <Text className={`font-bold text-brand-glow ${isLandscape ? "text-5xl" : "text-6xl"}`}>
            {p2Points}
          </Text>
        </View>
      </View>

      {/* Set Scores */}
      {sets.length > 0 && (
        <View className="items-center">
          <Text className="text-sm text-slate-400">
            {sets.map((s) => `${s[0]}-${s[1]}`).join("   ")}
          </Text>
        </View>
      )}
    </View>
  );
}
