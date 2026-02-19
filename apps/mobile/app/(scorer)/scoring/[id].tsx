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
import { useRef, useCallback } from "react";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { getDisplayMessage } from "../../../utils/errors";
import { useTempScorer } from "../../../contexts/TempScorerContext";
import { detectMatchPoint } from "../../../utils/matchPoint";
import { OfflineBanner } from "../../../components/OfflineBanner";
import { Scoreboard } from "../../../components/scoring/Scoreboard";

const pointLabels = ["0", "15", "30", "40", "AD"];

export default function ScorerTennisScoringScreen() {
  // Keep the screen awake while actively scoring
  useKeepAwake();

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useTempScorer();
  const matchId = id as Id<"matches">;
  const tempScorerToken = session?.token;

  const match = useQuery(api.tennis.getTennisMatch, { matchId, tempScorerToken });
  const matchDetails = useQuery(api.matches.getMatch, { matchId, tempScorerToken });
  const liveMatches = useQuery(
    api.matches.listMatches,
    matchDetails
      ? {
          tournamentId: matchDetails.tournamentId as Id<"tournaments">,
          status: "live",
          tempScorerToken,
        }
      : "skip"
  );
  const initMatch = useMutation(api.tennis.initTennisMatch);
  const scorePoint = useMutation(api.tennis.scoreTennisPoint);
  const undoPoint = useMutation(api.tennis.undoTennisPoint);
  const startMatch = useMutation(api.matches.startMatch);

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const flash1 = useRef(new Animated.Value(0)).current;
  const flash2 = useRef(new Animated.Value(0)).current;
  const shouldCheckCourt =
    !!matchDetails &&
    (matchDetails.status === "pending" || matchDetails.status === "scheduled") &&
    !!matchDetails.court;
  const isCourtAvailabilityLoading = shouldCheckCourt && liveMatches === undefined;
  const hasCourtConflict =
    shouldCheckCourt &&
    (liveMatches ?? []).some(
      (liveMatch) => liveMatch._id !== matchDetails._id && liveMatch.court === matchDetails.court
    );
  const startDisabledReason = isCourtAvailabilityLoading
    ? "Checking court availability..."
    : hasCourtConflict
      ? `Court ${matchDetails?.court} already has a live match. Finish it before starting this one.`
      : undefined;
  const startDisabledDueToCourtConflict = !!startDisabledReason;

  const triggerFlash = (flashAnim: Animated.Value) => {
    flashAnim.setValue(1);
    Animated.timing(flashAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const executeScorePoint = useCallback(
    async (participant: number) => {
      triggerFlash(participant === 1 ? flash1 : flash2);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        await scorePoint({ matchId, winnerParticipant: participant, tempScorerToken });
      } catch (err) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", getDisplayMessage(err));
      }
    },
    [matchId, tempScorerToken, scorePoint, flash1, flash2]
  );

  const handleScorePoint = useCallback(
    async (participant: number) => {
      if (!match || match.status !== "live" || match.tennisState?.isMatchComplete) return;

      // Check for match point - the scoring participant is the one who would win
      const matchPointHolder = detectMatchPoint(match.tennisState);
      if (matchPointHolder === participant) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          "Match Point",
          `This point will complete the match. ${participant === 1 ? match.participant1?.displayName : match.participant2?.displayName} wins. Confirm?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Confirm",
              style: "default",
              onPress: () => executeScorePoint(participant),
            },
          ]
        );
        return;
      }

      await executeScorePoint(participant);
    },
    [match, executeScorePoint]
  );

  if (match === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-page dark:bg-bg-page-dark">
        <ActivityIndicator size="large" color="#70AC15" />
      </View>
    );
  }

  if (match === null) {
    return (
      <SafeAreaView className="flex-1 bg-bg-page dark:bg-bg-page-dark">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="font-display-semibold text-lg text-text-primary dark:text-text-primary-dark">
            Match not found
          </Text>
          <TouchableOpacity className="mt-4" onPress={() => router.back()}>
            <Text className="text-brand dark:text-brand-dark">Go back</Text>
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
    if (startDisabledDueToCourtConflict) {
      return;
    }

    try {
      await initMatch({ matchId, firstServer, tempScorerToken });
      if (match.status === "pending" || match.status === "scheduled") {
        await startMatch({ matchId, tempScorerToken });
      }
    } catch (err) {
      Alert.alert("Error", getDisplayMessage(err));
    }
  };

  const handleUndo = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await undoPoint({ matchId, tempScorerToken });
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", getDisplayMessage(err));
    }
  };

  const getPointDisplay = (points: number, opponentPoints: number, isAdScoring: boolean) => {
    if (points < 4) {
      return pointLabels[points];
    }
    if (points === opponentPoints) {
      return "40";
    }
    if (isAdScoring && points > opponentPoints) {
      return "AD";
    }
    return "40";
  };

  const getGameStatus = () => {
    if (!state || state.isTiebreak) return null;
    const p1 = state.currentGamePoints?.[0] || 0;
    const p2 = state.currentGamePoints?.[1] || 0;
    if (isAdScoring) {
      if (p1 >= 3 && p2 >= 3 && p1 === p2) return "Deuce";
      if (p1 > 3 && p1 > p2) {
        return `Advantage ${match.participant1?.displayName?.split(" ")[0]}`;
      }
      if (p2 > 3 && p2 > p1) {
        return `Advantage ${match.participant2?.displayName?.split(" ")[0]}`;
      }
    } else if (p1 === 3 && p2 === 3) {
      const receiver = servingParticipant === 1 ? match.participant2 : match.participant1;
      const receiverName = receiver?.displayName?.split(" ")[0] ?? "Receiver";
      return `Deciding Point (${receiverName} chooses side)`;
    }
    return null;
  };

  // Not initialized - show server selection
  if (!isInitialized && !isCompleted) {
    return (
      <SafeAreaView className="flex-1 bg-bg-page dark:bg-bg-page-dark">
        <View className="flex-row items-center border-b border-border px-4 py-3 dark:border-border-dark">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Text className="text-2xl text-text-primary dark:text-text-primary-dark">←</Text>
          </TouchableOpacity>
          <Text className="font-display-semibold text-lg text-text-primary dark:text-text-primary-dark">
            Start Match
          </Text>
        </View>

        <View className="flex-1 items-center justify-center px-6">
          <Text className="mb-2 font-display-bold text-xl text-text-primary dark:text-text-primary-dark">
            Who serves first?
          </Text>
          <Text className="mb-8 text-center text-text-muted dark:text-text-muted-dark">
            Select the player who will serve first
          </Text>

          <TouchableOpacity
            className={`mb-4 w-full rounded-xl py-4 ${
              startDisabledDueToCourtConflict
                ? "bg-brand/50 shadow-none"
                : "bg-brand shadow-lg shadow-brand/30"
            }`}
            onPress={() => handleInitMatch(1)}
            disabled={startDisabledDueToCourtConflict}>
            <Text className="text-center text-lg font-bold text-text-inverse dark:text-text-inverse-dark">
              {match.participant1?.displayName || "Player 1"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`w-full rounded-xl border border-border py-4 dark:border-border-dark ${
              startDisabledDueToCourtConflict
                ? "bg-bg-secondary/70 dark:bg-bg-secondary-dark/70"
                : "bg-bg-secondary dark:bg-bg-secondary-dark"
            }`}
            onPress={() => handleInitMatch(2)}
            disabled={startDisabledDueToCourtConflict}>
            <Text className="text-center text-lg font-bold text-text-primary dark:text-text-primary-dark">
              {match.participant2?.displayName || "Player 2"}
            </Text>
          </TouchableOpacity>
          {startDisabledDueToCourtConflict && (
            <View className="mt-4 rounded-xl border border-brand/30 bg-brand-light px-4 py-3">
              <Text className="text-center text-sm text-brand-text">{startDisabledReason}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Match Complete Screen
  if (isCompleted) {
    const sets = state?.sets || [];
    return (
      <SafeAreaView className="flex-1 bg-bg-page dark:bg-bg-page-dark">
        <View className="flex-1 items-center justify-center px-6">
          <View className="mb-6 rounded-full border border-brand/40 bg-brand/10 px-6 py-2">
            <Text className="text-sm font-semibold uppercase tracking-wide text-brand dark:text-brand-dark">
              Completed
            </Text>
          </View>
          <Text className="mb-2 font-display-bold text-4xl text-text-primary dark:text-text-primary-dark">
            Match Complete
          </Text>
          <Text className="mb-8 text-xl text-brand dark:text-brand-dark">
            {match.winnerId === match.participant1?._id
              ? match.participant1?.displayName
              : match.participant2?.displayName}{" "}
            wins!
          </Text>

          <View className="mb-8 w-full rounded-2xl border border-border bg-bg-card p-6 dark:border-border-dark dark:bg-bg-card-dark">
            <Text className="mb-3 text-center font-display-semibold text-sm uppercase text-text-muted dark:text-text-muted-dark">
              Final Score
            </Text>
            <View className="flex-row items-center justify-between px-4">
              <Text className="flex-1 text-lg font-semibold text-text-primary dark:text-text-primary-dark">
                {match.participant1?.displayName}
              </Text>
              <Text className="text-lg text-text-secondary dark:text-text-secondary-dark">
                {sets.map((s) => s[0]).join("  ")}
              </Text>
            </View>
            <View className="my-2 h-px bg-border/60 dark:bg-border-dark/60" />
            <View className="flex-row items-center justify-between px-4">
              <Text className="flex-1 text-lg font-semibold text-text-primary dark:text-text-primary-dark">
                {match.participant2?.displayName}
              </Text>
              <Text className="text-lg text-text-secondary dark:text-text-secondary-dark">
                {sets.map((s) => s[1]).join("  ")}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            className="w-full rounded-xl border border-border bg-bg-secondary py-4 dark:border-border-dark dark:bg-bg-secondary-dark"
            onPress={() => router.back()}>
            <Text className="text-center text-lg font-semibold text-text-primary dark:text-text-primary-dark">
              Back to Match
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const sets = state?.sets || [];
  const currentSetGames = state?.currentSetGames || [0, 0];
  const currentGamePoints = state?.currentGamePoints || [0, 0];
  const isTiebreak = state?.isTiebreak || false;
  const tiebreakMode = state?.tiebreakMode;
  const servingParticipant = state?.servingParticipant || 1;
  const isAdScoring = state?.isAdScoring ?? true;
  const gameStatus = getGameStatus();

  const p1Points = isTiebreak
    ? (state?.tiebreakPoints?.[0] || 0).toString()
    : getPointDisplay(currentGamePoints[0], currentGamePoints[1], isAdScoring);
  const p2Points = isTiebreak
    ? (state?.tiebreakPoints?.[1] || 0).toString()
    : getPointDisplay(currentGamePoints[1], currentGamePoints[0], isAdScoring);

  // Scoreboard props for the shared Scoreboard component
  const scoreboardProps = {
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
  };

  if (isLandscape) {
    return (
      <View className="flex-1 flex-row bg-bg-page dark:bg-bg-page-dark">
        <TouchableOpacity
          className="flex-1 bg-bg-card dark:bg-bg-card-dark"
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
              <Text
                className="font-display-semibold text-3xl text-text-primary dark:text-text-primary-dark"
                numberOfLines={2}>
                {match.participant1?.displayName || "Player 1"}
              </Text>
              <Text className="mt-2 text-sm text-text-muted dark:text-text-muted-dark">
                Tap to score
              </Text>
            </View>
          </SafeAreaView>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 bg-bg-secondary dark:bg-bg-secondary-dark"
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
              <Text
                className="font-display-semibold text-3xl text-text-primary dark:text-text-primary-dark"
                numberOfLines={2}>
                {match.participant2?.displayName || "Player 2"}
              </Text>
              <Text className="mt-2 text-sm text-text-muted dark:text-text-muted-dark">
                Tap to score
              </Text>
            </View>
          </SafeAreaView>
        </TouchableOpacity>

        <View className="absolute inset-0 items-center justify-center" pointerEvents="box-none">
          <Scoreboard {...scoreboardProps} />
          <TouchableOpacity
            className={`mt-4 flex-row items-center rounded-xl border-2 px-8 py-3.5 ${
              state?.history?.length
                ? "border-border bg-bg-card dark:border-border-dark dark:bg-bg-card-dark"
                : "border-border/50 bg-bg-card/50 dark:border-border-dark/50 dark:bg-bg-card-dark/50"
            }`}
            onPress={handleUndo}
            disabled={!state?.history?.length}>
            <Text
              className={`text-base font-medium ${
                state?.history?.length
                  ? "text-text-primary dark:text-text-primary-dark"
                  : "text-text-muted dark:text-text-muted-dark"
              }`}>
              ↩ Undo
            </Text>
          </TouchableOpacity>
        </View>

        <SafeAreaView className="absolute left-4 top-4" pointerEvents="box-none">
          <TouchableOpacity
            className="h-14 w-14 items-center justify-center rounded-full border-2 border-border bg-bg-card shadow-2xl dark:border-border-dark dark:bg-bg-card-dark"
            onPress={() => router.back()}>
            <Text className="text-xl text-text-primary dark:text-text-primary-dark">←</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-page dark:bg-bg-page-dark">
      <OfflineBanner />
      <TouchableOpacity
        className="flex-1 bg-bg-card dark:bg-bg-card-dark"
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
            className="px-4 text-center font-display-semibold text-3xl text-text-primary dark:text-text-primary-dark"
            numberOfLines={2}>
            {match.participant1?.displayName || "Player 1"}
          </Text>
          <Text className="mt-2 text-text-muted dark:text-text-muted-dark">Tap to score</Text>
        </SafeAreaView>
      </TouchableOpacity>

      <View className="items-center bg-bg-page py-4 dark:bg-bg-page-dark">
        <Scoreboard {...scoreboardProps} />
        <TouchableOpacity
          className={`mt-4 flex-row items-center rounded-xl border-2 px-8 py-3.5 ${
            state?.history?.length
              ? "border-border bg-bg-card dark:border-border-dark dark:bg-bg-card-dark"
              : "border-border/50 bg-bg-card/50 dark:border-border-dark/50 dark:bg-bg-card-dark/50"
          }`}
          onPress={handleUndo}
          disabled={!state?.history?.length}>
          <Text
            className={`text-base font-medium ${
              state?.history?.length
                ? "text-text-primary dark:text-text-primary-dark"
                : "text-text-muted dark:text-text-muted-dark"
            }`}>
            ↩ Undo
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        className="flex-1 bg-bg-secondary dark:bg-bg-secondary-dark"
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
            className="px-4 text-center font-display-semibold text-3xl text-text-primary dark:text-text-primary-dark"
            numberOfLines={2}>
            {match.participant2?.displayName || "Player 2"}
          </Text>
          <Text className="mt-2 text-text-muted dark:text-text-muted-dark">Tap to score</Text>
        </SafeAreaView>
      </TouchableOpacity>

      <SafeAreaView className="absolute left-4 top-4" pointerEvents="box-none" edges={["top"]}>
        <TouchableOpacity
          className="h-14 w-14 items-center justify-center rounded-full border-2 border-border bg-bg-card shadow-2xl dark:border-border-dark dark:bg-bg-card-dark"
          onPress={() => router.back()}>
          <Text className="text-xl text-text-primary dark:text-text-primary-dark">←</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}
