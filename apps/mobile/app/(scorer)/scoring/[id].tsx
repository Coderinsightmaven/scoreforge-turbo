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
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Id } from "@repo/convex/dataModel";
import { useRef, useCallback } from "react";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { getDisplayMessage } from "@/utils/errors";
import { useTempScorer } from "@/contexts/TempScorerContext";
import { detectMatchPoint } from "@/utils/matchPoint";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Scoreboard } from "@/components/scoring/Scoreboard";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Colors, Fonts } from "@/constants/colors";

const pointLabels = ["0", "15", "30", "40", "AD"];

export default function ScorerTennisScoringScreen() {
  // Keep the screen awake while actively scoring
  useKeepAwake();

  const colors = useThemeColors();
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
      <View style={[styles.centered, { backgroundColor: colors.bgPage }]}>
        <ActivityIndicator size="large" color={Colors.brand.DEFAULT} />
      </View>
    );
  }

  if (match === null) {
    return (
      <SafeAreaView style={[styles.flex1, { backgroundColor: colors.bgPage }]}>
        <View style={[styles.centered, { paddingHorizontal: 24 }]}>
          <Text
            style={{
              fontFamily: Fonts.displaySemibold,
              fontSize: 18,
              color: colors.textPrimary,
            }}>
            Match not found
          </Text>
          <TouchableOpacity style={{ marginTop: 16 }} onPress={() => router.back()}>
            <Text style={{ color: colors.isDark ? Colors.brand.dark : Colors.brand.DEFAULT }}>
              Go back
            </Text>
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
      <SafeAreaView style={[styles.flex1, { backgroundColor: colors.bgPage }]}>
        <View style={[styles.initHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.initBackButton}>
            <Text style={{ fontSize: 24, color: colors.textPrimary }}>←</Text>
          </TouchableOpacity>
          <Text
            style={{
              fontFamily: Fonts.displaySemibold,
              fontSize: 18,
              color: colors.textPrimary,
            }}>
            Start Match
          </Text>
        </View>

        <View style={[styles.centered, { paddingHorizontal: 24 }]}>
          <Text
            style={{
              marginBottom: 8,
              fontFamily: Fonts.displayBold,
              fontSize: 20,
              color: colors.textPrimary,
            }}>
            Who serves first?
          </Text>
          <Text
            style={{
              marginBottom: 32,
              textAlign: "center",
              color: colors.textMuted,
            }}>
            Select the player who will serve first
          </Text>

          <TouchableOpacity
            style={[
              styles.serverButton,
              {
                marginBottom: 16,
                backgroundColor: startDisabledDueToCourtConflict
                  ? "rgba(112,172,21,0.5)"
                  : Colors.brand.DEFAULT,
                shadowColor: startDisabledDueToCourtConflict
                  ? "transparent"
                  : "rgba(112,172,21,0.3)",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: startDisabledDueToCourtConflict ? 0 : 1,
                shadowRadius: 8,
              },
            ]}
            onPress={() => handleInitMatch(1)}
            disabled={startDisabledDueToCourtConflict}>
            <Text
              style={{
                textAlign: "center",
                fontSize: 18,
                fontWeight: "700",
                color: colors.textInverse,
              }}>
              {match.participant1?.displayName || "Player 1"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.serverButton,
              {
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: startDisabledDueToCourtConflict
                  ? "rgba(234,237,240,0.7)"
                  : colors.bgSecondary,
              },
            ]}
            onPress={() => handleInitMatch(2)}
            disabled={startDisabledDueToCourtConflict}>
            <Text
              style={{
                textAlign: "center",
                fontSize: 18,
                fontWeight: "700",
                color: colors.textPrimary,
              }}>
              {match.participant2?.displayName || "Player 2"}
            </Text>
          </TouchableOpacity>
          {startDisabledDueToCourtConflict && (
            <View style={styles.courtConflictBanner}>
              <Text style={styles.courtConflictText}>{startDisabledReason}</Text>
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
      <SafeAreaView style={[styles.flex1, { backgroundColor: colors.bgPage }]}>
        <View style={[styles.centered, { paddingHorizontal: 24 }]}>
          <View style={styles.completedBadge}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 1,
                color: colors.isDark ? Colors.brand.dark : Colors.brand.DEFAULT,
              }}>
              Completed
            </Text>
          </View>
          <Text
            style={{
              marginBottom: 8,
              fontFamily: Fonts.displayBold,
              fontSize: 36,
              color: colors.textPrimary,
            }}>
            Match Complete
          </Text>
          <Text
            style={{
              marginBottom: 32,
              fontSize: 20,
              color: colors.isDark ? Colors.brand.dark : Colors.brand.DEFAULT,
            }}>
            {match.winnerId === match.participant1?._id
              ? match.participant1?.displayName
              : match.participant2?.displayName}{" "}
            wins!
          </Text>

          <View
            style={[
              styles.finalScoreCard,
              { borderColor: colors.border, backgroundColor: colors.bgCard },
            ]}>
            <Text
              style={{
                marginBottom: 12,
                textAlign: "center",
                fontFamily: Fonts.displaySemibold,
                fontSize: 14,
                textTransform: "uppercase",
                color: colors.textMuted,
              }}>
              Final Score
            </Text>
            <View style={styles.finalScoreRow}>
              <Text
                style={{
                  flex: 1,
                  fontSize: 18,
                  fontWeight: "600",
                  color: colors.textPrimary,
                }}>
                {match.participant1?.displayName}
              </Text>
              <Text style={{ fontSize: 18, color: colors.textSecondary }}>
                {sets.map((s) => s[0]).join("  ")}
              </Text>
            </View>
            <View
              style={[styles.finalScoreDivider, { backgroundColor: colors.border, opacity: 0.6 }]}
            />
            <View style={styles.finalScoreRow}>
              <Text
                style={{
                  flex: 1,
                  fontSize: 18,
                  fontWeight: "600",
                  color: colors.textPrimary,
                }}>
                {match.participant2?.displayName}
              </Text>
              <Text style={{ fontSize: 18, color: colors.textSecondary }}>
                {sets.map((s) => s[1]).join("  ")}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.backToMatchButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.bgSecondary,
              },
            ]}
            onPress={() => router.back()}>
            <Text
              style={{
                textAlign: "center",
                fontSize: 18,
                fontWeight: "600",
                color: colors.textPrimary,
              }}>
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
      <View style={[styles.flex1, { flexDirection: "row", backgroundColor: colors.bgPage }]}>
        <TouchableOpacity
          style={[styles.flex1, { backgroundColor: colors.bgCard }]}
          onPress={() => handleScorePoint(1)}
          activeOpacity={1}
          disabled={!isLive}>
          <Animated.View
            style={[
              styles.flashOverlay,
              { backgroundColor: Colors.brand.DEFAULT, opacity: flash1 },
            ]}
            pointerEvents="none"
          />
          <SafeAreaView
            style={[
              styles.flex1,
              { alignItems: "flex-start", justifyContent: "center", paddingLeft: 32 },
            ]}>
            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  fontFamily: Fonts.displaySemibold,
                  fontSize: 30,
                  color: colors.textPrimary,
                }}
                numberOfLines={2}>
                {match.participant1?.displayName || "Player 1"}
              </Text>
              <Text style={{ marginTop: 8, fontSize: 14, color: colors.textMuted }}>
                Tap to score
              </Text>
            </View>
          </SafeAreaView>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.flex1, { backgroundColor: colors.bgSecondary }]}
          onPress={() => handleScorePoint(2)}
          activeOpacity={1}
          disabled={!isLive}>
          <Animated.View
            style={[
              styles.flashOverlay,
              { backgroundColor: Colors.brand.DEFAULT, opacity: flash2 },
            ]}
            pointerEvents="none"
          />
          <SafeAreaView
            style={[
              styles.flex1,
              { alignItems: "flex-end", justifyContent: "center", paddingRight: 32 },
            ]}>
            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  fontFamily: Fonts.displaySemibold,
                  fontSize: 30,
                  color: colors.textPrimary,
                }}
                numberOfLines={2}>
                {match.participant2?.displayName || "Player 2"}
              </Text>
              <Text style={{ marginTop: 8, fontSize: 14, color: colors.textMuted }}>
                Tap to score
              </Text>
            </View>
          </SafeAreaView>
        </TouchableOpacity>

        <View style={styles.centerOverlay} pointerEvents="box-none">
          <Scoreboard {...scoreboardProps} />
          <TouchableOpacity
            style={[
              styles.undoButton,
              state?.history?.length
                ? { borderColor: colors.border, backgroundColor: colors.bgCard }
                : {
                    borderColor: "rgba(192,199,206,0.5)",
                    backgroundColor: "rgba(255,255,255,0.5)",
                  },
            ]}
            onPress={handleUndo}
            disabled={!state?.history?.length}>
            <Text
              style={[
                styles.undoText,
                {
                  color: state?.history?.length ? colors.textPrimary : colors.textMuted,
                },
              ]}>
              ↩ Undo
            </Text>
          </TouchableOpacity>
        </View>

        <SafeAreaView style={styles.landscapeBackContainer} pointerEvents="box-none">
          <TouchableOpacity
            style={[
              styles.floatingBackButton,
              { borderColor: colors.border, backgroundColor: colors.bgCard },
            ]}
            onPress={() => router.back()}>
            <Text style={{ fontSize: 20, color: colors.textPrimary }}>←</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.flex1, { backgroundColor: colors.bgPage }]}>
      <OfflineBanner />
      <TouchableOpacity
        style={[styles.flex1, { backgroundColor: colors.bgCard }]}
        onPress={() => handleScorePoint(1)}
        activeOpacity={1}
        disabled={!isLive}>
        <Animated.View
          style={[styles.flashOverlay, { backgroundColor: Colors.brand.DEFAULT, opacity: flash1 }]}
          pointerEvents="none"
        />
        <SafeAreaView style={[styles.flex1, styles.portraitTapZone]} edges={["top"]}>
          <Text
            style={{
              paddingHorizontal: 16,
              textAlign: "center",
              fontFamily: Fonts.displaySemibold,
              fontSize: 30,
              color: colors.textPrimary,
            }}
            numberOfLines={2}>
            {match.participant1?.displayName || "Player 1"}
          </Text>
          <Text style={{ marginTop: 8, color: colors.textMuted }}>Tap to score</Text>
        </SafeAreaView>
      </TouchableOpacity>

      <View style={[styles.portraitScoreboardContainer, { backgroundColor: colors.bgPage }]}>
        <Scoreboard {...scoreboardProps} />
        <TouchableOpacity
          style={[
            styles.undoButton,
            state?.history?.length
              ? { borderColor: colors.border, backgroundColor: colors.bgCard }
              : { borderColor: "rgba(192,199,206,0.5)", backgroundColor: "rgba(255,255,255,0.5)" },
          ]}
          onPress={handleUndo}
          disabled={!state?.history?.length}>
          <Text
            style={[
              styles.undoText,
              {
                color: state?.history?.length ? colors.textPrimary : colors.textMuted,
              },
            ]}>
            ↩ Undo
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.flex1, { backgroundColor: colors.bgSecondary }]}
        onPress={() => handleScorePoint(2)}
        activeOpacity={1}
        disabled={!isLive}>
        <Animated.View
          style={[styles.flashOverlay, { backgroundColor: Colors.brand.DEFAULT, opacity: flash2 }]}
          pointerEvents="none"
        />
        <SafeAreaView style={[styles.flex1, styles.portraitTapZone]} edges={["bottom"]}>
          <Text
            style={{
              paddingHorizontal: 16,
              textAlign: "center",
              fontFamily: Fonts.displaySemibold,
              fontSize: 30,
              color: colors.textPrimary,
            }}
            numberOfLines={2}>
            {match.participant2?.displayName || "Player 2"}
          </Text>
          <Text style={{ marginTop: 8, color: colors.textMuted }}>Tap to score</Text>
        </SafeAreaView>
      </TouchableOpacity>

      <SafeAreaView style={styles.portraitBackContainer} pointerEvents="box-none" edges={["top"]}>
        <TouchableOpacity
          style={[
            styles.floatingBackButton,
            { borderColor: colors.border, backgroundColor: colors.bgCard },
          ]}
          onPress={() => router.back()}>
          <Text style={{ fontSize: 20, color: colors.textPrimary }}>←</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  initHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  initBackButton: {
    marginRight: 12,
    padding: 4,
  },
  serverButton: {
    width: "100%",
    borderRadius: 12,
    paddingVertical: 16,
  },
  courtConflictBanner: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(112,172,21,0.3)",
    backgroundColor: Colors.brand.light,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  courtConflictText: {
    textAlign: "center",
    fontSize: 14,
    color: Colors.brand.text,
  },
  completedBadge: {
    marginBottom: 24,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(112,172,21,0.4)",
    backgroundColor: "rgba(112,172,21,0.1)",
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  finalScoreCard: {
    marginBottom: 32,
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
  },
  finalScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  finalScoreDivider: {
    marginVertical: 8,
    height: 1,
  },
  backToMatchButton: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 16,
  },
  flashOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  centerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  undoButton: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  undoText: {
    fontSize: 16,
    fontWeight: "500",
  },
  landscapeBackContainer: {
    position: "absolute",
    left: 16,
    top: 16,
  },
  floatingBackButton: {
    height: 56,
    width: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  portraitTapZone: {
    alignItems: "center",
    justifyContent: "center",
  },
  portraitScoreboardContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  portraitBackContainer: {
    position: "absolute",
    left: 16,
    top: 16,
  },
});
