import { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Colors, Fonts } from "@/constants/colors";

function formatElapsedTime(elapsedMs: number): string {
  const totalMinutes = Math.floor(elapsedMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

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
  matchStartedTimestamp?: number;
  isMatchComplete?: boolean;
};

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
  matchStartedTimestamp,
  isMatchComplete,
}: ScoreboardProps) {
  const colors = useThemeColors();

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!matchStartedTimestamp || isMatchComplete) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [matchStartedTimestamp, isMatchComplete]);

  const elapsedTime = matchStartedTimestamp ? formatElapsedTime(now - matchStartedTimestamp) : null;

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: colors.border,
          backgroundColor: colors.bgCard,
          width: isLandscape ? 288 : 320,
        },
      ]}>
      <View
        style={[
          styles.topAccent,
          {
            backgroundColor: colors.isDark ? colors.brand.dark : colors.brand.DEFAULT,
            opacity: 0.4,
          },
        ]}
      />

      {/* Status Badges */}
      <View style={styles.badgeRow}>
        {isLive && (
          <View
            style={[
              styles.liveBadge,
              { borderColor: "rgba(238,56,43,0.3)", backgroundColor: Colors.status.live.bg },
            ]}>
            <View style={[styles.liveDot, { backgroundColor: Colors.status.live.border }]} />
            <Text style={[styles.liveText, { color: Colors.status.live.text }]}>Live</Text>
          </View>
        )}
        {isTiebreak && (
          <View
            style={[
              styles.tiebreakBadge,
              { borderColor: "rgba(112,172,21,0.3)", backgroundColor: "rgba(112,172,21,0.1)" },
            ]}>
            <Text
              style={[
                styles.tiebreakText,
                { color: colors.isDark ? colors.brand.dark : colors.brand.DEFAULT },
              ]}>
              {tiebreakMode === "match" ? "Match Tiebreak" : "Tiebreak"}
            </Text>
          </View>
        )}
      </View>

      {/* Elapsed Time */}
      {elapsedTime && (
        <View style={styles.timerRow}>
          <Text style={[styles.timerText, { color: colors.textMuted }]}>{elapsedTime}</Text>
        </View>
      )}

      {/* Game Status */}
      {gameStatus && (
        <View style={styles.gameStatusRow}>
          <Text style={[styles.gameStatusText, { color: colors.textSecondary }]}>{gameStatus}</Text>
        </View>
      )}

      {/* Main Score Display */}
      <View style={styles.scoreRow}>
        <View style={styles.pointsContainer}>
          {servingParticipant === 1 && (
            <View style={[styles.servingDot, { backgroundColor: colors.brand.DEFAULT }]} />
          )}
          <Text
            style={[
              styles.points,
              {
                color: colors.isDark ? colors.brand.dark : colors.brand.DEFAULT,
                fontSize: isLandscape ? 48 : 60,
              },
            ]}>
            {p1Points}
          </Text>
        </View>

        <View
          style={[
            styles.gamesBox,
            { borderColor: colors.border, backgroundColor: colors.bgSecondary },
          ]}>
          <Text style={[styles.gamesLabel, { color: colors.textMuted }]}>
            {isTiebreak ? (tiebreakMode === "match" ? "MTB" : "TB") : "GAME"}
          </Text>
          <Text style={[styles.gamesScore, { color: colors.textPrimary }]}>
            {currentSetGames[0]} - {currentSetGames[1]}
          </Text>
        </View>

        <View style={styles.pointsContainer}>
          {servingParticipant === 2 && (
            <View style={[styles.servingDot, { backgroundColor: colors.brand.DEFAULT }]} />
          )}
          <Text
            style={[
              styles.points,
              {
                color: colors.isDark ? colors.brand.dark : colors.brand.DEFAULT,
                fontSize: isLandscape ? 48 : 60,
              },
            ]}>
            {p2Points}
          </Text>
        </View>
      </View>

      {/* Set Scores */}
      {sets.length > 0 && (
        <View style={styles.setsRow}>
          <Text style={[styles.setsText, { color: colors.textMuted }]}>
            {sets.map((s) => `${s[0]}-${s[1]}`).join("   ")}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
  },
  topAccent: {
    position: "absolute",
    left: 24,
    right: 24,
    top: 12,
    height: 1,
  },
  badgeRow: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  liveDot: {
    marginRight: 6,
    height: 8,
    width: 8,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  tiebreakBadge: {
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tiebreakText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  timerRow: {
    marginBottom: 8,
    alignItems: "center",
  },
  timerText: {
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  gameStatusRow: {
    marginBottom: 12,
    alignItems: "center",
  },
  gameStatusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  scoreRow: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  pointsContainer: {
    flex: 1,
    alignItems: "center",
  },
  servingDot: {
    marginBottom: 4,
    height: 8,
    width: 8,
    borderRadius: 4,
  },
  points: {
    fontWeight: "bold",
  },
  gamesBox: {
    marginHorizontal: 16,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  gamesLabel: {
    fontSize: 12,
  },
  gamesScore: {
    fontSize: 20,
    fontWeight: "bold",
  },
  setsRow: {
    alignItems: "center",
  },
  setsText: {
    fontSize: 14,
  },
});
