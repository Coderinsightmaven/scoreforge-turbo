import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Id } from "@repo/convex/dataModel";
import { useRef } from "react";
import { getDisplayMessage } from "../../../utils/errors";

const pointLabels = ["0", "15", "30", "40", "AD"];

export default function TennisScoringScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const matchId = id as Id<"matches">;

  const match = useQuery(api.tennis.getTennisMatch, { matchId });
  const initMatch = useMutation(api.tennis.initTennisMatch);
  const scorePoint = useMutation(api.tennis.scoreTennisPoint);
  const undoPoint = useMutation(api.tennis.undoTennisPoint);
  const startMatch = useMutation(api.matches.startMatch);

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const flash1 = useRef(new Animated.Value(0)).current;
  const flash2 = useRef(new Animated.Value(0)).current;

  const triggerFlash = (flashAnim: Animated.Value) => {
    flashAnim.setValue(1);
    Animated.timing(flashAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  if (match === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-dark-bg">
        <ActivityIndicator size="large" color="#D4A017" />
      </View>
    );
  }

  if (match === null) {
    return (
      <SafeAreaView className="flex-1 bg-dark-bg">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="font-display-semibold text-lg text-white">Match not found</Text>
          <TouchableOpacity className="mt-4" onPress={() => router.back()}>
            <Text className="text-brand-glow">Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const state = match.tennisState;
  const isInitialized = state !== null && state !== undefined;
  const isLive = match.status === "live";
  const isCompleted = match.status === "completed" || state?.isMatchComplete;

  const handleInitMatch = async (firstServer: number) => {
    try {
      await initMatch({ matchId, firstServer });
      if (match.status === "pending" || match.status === "scheduled") {
        await startMatch({ matchId });
      }
    } catch (err) {
      Alert.alert("Error", getDisplayMessage(err));
    }
  };

  const handleScorePoint = async (participant: number) => {
    if (!isLive || isCompleted) return;
    triggerFlash(participant === 1 ? flash1 : flash2);
    try {
      await scorePoint({ matchId, winnerParticipant: participant });
    } catch (err) {
      Alert.alert("Error", getDisplayMessage(err));
    }
  };

  const handleUndo = async () => {
    try {
      await undoPoint({ matchId });
    } catch (err) {
      Alert.alert("Error", getDisplayMessage(err));
    }
  };

  const getPointDisplay = (points: number, opponentPoints: number, isAdScoring: boolean) => {
    if (!isAdScoring) {
      return points.toString();
    }
    if (points < 4) {
      return pointLabels[points];
    }
    if (points === opponentPoints) {
      return "40";
    }
    if (points > opponentPoints) {
      return "AD";
    }
    return "40";
  };

  const getGameStatus = () => {
    if (!state || state.isTiebreak) return null;
    const p1 = state.currentGamePoints?.[0] || 0;
    const p2 = state.currentGamePoints?.[1] || 0;
    if (p1 >= 3 && p2 >= 3 && p1 === p2) return "Deuce";
    if (p1 > 3 && p1 > p2) return `Advantage ${match.participant1?.displayName?.split(" ")[0]}`;
    if (p2 > 3 && p2 > p1) return `Advantage ${match.participant2?.displayName?.split(" ")[0]}`;
    return null;
  };

  // Not initialized - show server selection
  if (!isInitialized && !isCompleted) {
    return (
      <SafeAreaView className="flex-1 bg-dark-bg">
        <View className="flex-row items-center border-b border-dark-elevated px-4 py-3">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Text className="text-2xl text-slate-400">←</Text>
          </TouchableOpacity>
          <Text className="font-display-semibold text-lg text-white">Start Match</Text>
        </View>

        <View className="flex-1 items-center justify-center px-6">
          <Text className="mb-2 font-display-bold text-xl text-white">Who serves first?</Text>
          <Text className="mb-8 text-center text-slate-400">
            Select the player who will serve first
          </Text>

          <TouchableOpacity
            className="mb-4 w-full rounded-xl bg-brand py-4 shadow-lg shadow-brand/30"
            onPress={() => handleInitMatch(1)}>
            <Text className="text-center text-lg font-bold text-white">
              {match.participant1?.displayName || "Player 1"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="w-full rounded-xl bg-dark-elevated py-4"
            onPress={() => handleInitMatch(2)}>
            <Text className="text-center text-lg font-bold text-white">
              {match.participant2?.displayName || "Player 2"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Match Complete Screen
  if (isCompleted) {
    const sets = state?.sets || [];
    return (
      <SafeAreaView className="flex-1 bg-dark-bg">
        <View className="flex-1 items-center justify-center px-6">
          <View className="mb-6 rounded-full border border-brand/40 bg-brand/15 px-6 py-2">
            <Text className="text-sm font-semibold uppercase tracking-wide text-brand-glow">
              Completed
            </Text>
          </View>
          <Text className="mb-2 font-display-bold text-4xl text-white">Match Complete</Text>
          <Text className="mb-8 text-xl text-brand-glow">
            {match.winnerId === match.participant1?._id
              ? match.participant1?.displayName
              : match.participant2?.displayName}{" "}
            wins!
          </Text>

          {/* Final Score */}
          <View className="mb-8 w-full rounded-2xl border-2 border-dark-elevated bg-dark-card p-6">
            <Text className="mb-3 text-center font-display-semibold text-sm uppercase text-slate-400">
              Final Score
            </Text>
            <View className="flex-row items-center justify-between px-4">
              <Text className="flex-1 text-lg font-semibold text-white">
                {match.participant1?.displayName}
              </Text>
              <Text className="text-lg text-slate-300">{sets.map((s) => s[0]).join("  ")}</Text>
            </View>
            <View className="my-2 h-px bg-dark-elevated" />
            <View className="flex-row items-center justify-between px-4">
              <Text className="flex-1 text-lg font-semibold text-white">
                {match.participant2?.displayName}
              </Text>
              <Text className="text-lg text-slate-300">{sets.map((s) => s[1]).join("  ")}</Text>
            </View>
          </View>

          <TouchableOpacity
            className="w-full rounded-xl bg-dark-elevated py-4"
            onPress={() => router.back()}>
            <Text className="text-center text-lg font-semibold text-white">Back to Match</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const sets = state?.sets || [];
  const currentSetGames = state?.currentSetGames || [0, 0];
  const currentGamePoints = state?.currentGamePoints || [0, 0];
  const isTiebreak = state?.isTiebreak || false;
  const servingParticipant = state?.servingParticipant || 1;
  const isAdScoring = state?.isAdScoring ?? true;
  const gameStatus = getGameStatus();

  const p1Points = isTiebreak
    ? (state?.tiebreakPoints?.[0] || 0).toString()
    : getPointDisplay(currentGamePoints[0], currentGamePoints[1], isAdScoring);
  const p2Points = isTiebreak
    ? (state?.tiebreakPoints?.[1] || 0).toString()
    : getPointDisplay(currentGamePoints[1], currentGamePoints[0], isAdScoring);

  // Scoreboard component (shared between layouts)
  const Scoreboard = () => (
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

  // LANDSCAPE LAYOUT - Left/Right split
  if (isLandscape) {
    return (
      <View className="flex-1 flex-row bg-dark-bg">
        {/* Player 1 Tap Zone (Left) */}
        <TouchableOpacity
          className="flex-1 bg-dark-card"
          onPress={() => handleScorePoint(1)}
          activeOpacity={1}
          disabled={!isLive}>
          <Animated.View
            className="absolute inset-0 bg-brand"
            style={{ opacity: flash1 }}
            pointerEvents="none"
          />
          <SafeAreaView className="flex-1 items-start justify-center pl-8">
            <View className="items-center">
              <Text className="font-display-semibold text-3xl text-white" numberOfLines={2}>
                {match.participant1?.displayName || "Player 1"}
              </Text>
              <Text className="mt-2 text-sm text-slate-400">Tap to score</Text>
            </View>
          </SafeAreaView>
        </TouchableOpacity>

        {/* Player 2 Tap Zone (Right) */}
        <TouchableOpacity
          className="flex-1 bg-dark-elevated"
          onPress={() => handleScorePoint(2)}
          activeOpacity={1}
          disabled={!isLive}>
          <Animated.View
            className="absolute inset-0 bg-brand"
            style={{ opacity: flash2 }}
            pointerEvents="none"
          />
          <SafeAreaView className="flex-1 items-end justify-center pr-8">
            <View className="items-center">
              <Text className="font-display-semibold text-3xl text-white" numberOfLines={2}>
                {match.participant2?.displayName || "Player 2"}
              </Text>
              <Text className="mt-2 text-sm text-slate-400">Tap to score</Text>
            </View>
          </SafeAreaView>
        </TouchableOpacity>

        {/* Center Scoreboard Overlay */}
        <View className="absolute inset-0 items-center justify-center" pointerEvents="box-none">
          <Scoreboard />
          {/* Undo Button */}
          <TouchableOpacity
            className={`mt-4 flex-row items-center rounded-xl border-2 px-8 py-3.5 ${
              state?.history?.length
                ? "border-dark-elevated bg-dark-card"
                : "border-dark-elevated/50 bg-dark-card/50"
            }`}
            onPress={handleUndo}
            disabled={!state?.history?.length}>
            <Text
              className={`text-base font-medium ${state?.history?.length ? "text-white" : "text-slate-600"}`}>
              ↩ Undo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Back Button */}
        <SafeAreaView className="absolute left-4 top-4" pointerEvents="box-none">
          <TouchableOpacity
            className="h-14 w-14 items-center justify-center rounded-full border-2 border-dark-elevated bg-dark-card shadow-2xl"
            onPress={() => router.back()}>
            <Text className="text-xl text-white">←</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  // PORTRAIT LAYOUT - Top/Bottom split
  return (
    <View className="flex-1 bg-dark-bg">
      {/* Player 1 Tap Zone (Top) */}
      <TouchableOpacity
        className="flex-1 bg-dark-card"
        onPress={() => handleScorePoint(1)}
        activeOpacity={1}
        disabled={!isLive}>
        <Animated.View
          className="absolute inset-0 bg-brand"
          style={{ opacity: flash1 }}
          pointerEvents="none"
        />
        <SafeAreaView className="flex-1 items-center justify-center" edges={["top"]}>
          <Text
            className="px-4 text-center font-display-semibold text-3xl text-white"
            numberOfLines={2}>
            {match.participant1?.displayName || "Player 1"}
          </Text>
          <Text className="mt-2 text-slate-400">Tap to score</Text>
        </SafeAreaView>
      </TouchableOpacity>

      {/* Center Scoreboard */}
      <View className="items-center bg-dark-bg py-4">
        <Scoreboard />
        {/* Undo Button */}
        <TouchableOpacity
          className={`mt-4 flex-row items-center rounded-xl border-2 px-8 py-3.5 ${
            state?.history?.length
              ? "border-dark-elevated bg-dark-card"
              : "border-dark-elevated/50 bg-dark-card/50"
          }`}
          onPress={handleUndo}
          disabled={!state?.history?.length}>
          <Text
            className={`text-base font-medium ${state?.history?.length ? "text-white" : "text-slate-600"}`}>
            ↩ Undo
          </Text>
        </TouchableOpacity>
      </View>

      {/* Player 2 Tap Zone (Bottom) */}
      <TouchableOpacity
        className="flex-1 bg-dark-elevated"
        onPress={() => handleScorePoint(2)}
        activeOpacity={1}
        disabled={!isLive}>
        <Animated.View
          className="absolute inset-0 bg-brand"
          style={{ opacity: flash2 }}
          pointerEvents="none"
        />
        <SafeAreaView className="flex-1 items-center justify-center" edges={["bottom"]}>
          <Text
            className="px-4 text-center font-display-semibold text-3xl text-white"
            numberOfLines={2}>
            {match.participant2?.displayName || "Player 2"}
          </Text>
          <Text className="mt-2 text-slate-400">Tap to score</Text>
        </SafeAreaView>
      </TouchableOpacity>

      {/* Back Button */}
      <SafeAreaView className="absolute left-4 top-4" pointerEvents="box-none" edges={["top"]}>
        <TouchableOpacity
          className="h-14 w-14 items-center justify-center rounded-full border-2 border-dark-elevated bg-dark-card shadow-2xl"
          onPress={() => router.back()}>
          <Text className="text-xl text-white">←</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}
