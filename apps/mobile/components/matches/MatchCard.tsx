import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

import { statusStyles } from "@/utils/styles";
import { formatTimeShort, getScoreDisplayCompact } from "@/utils/format";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Colors } from "@/constants/colors";

type MatchStatus = "pending" | "scheduled" | "live" | "completed" | "bye";

type MatchItem = {
  _id: string;
  round: number;
  matchNumber: number;
  court?: string;
  status: string;
  participant1?: { _id: string; displayName: string } | null;
  participant2?: { _id: string; displayName: string } | null;
  participant1Score: number;
  participant2Score: number;
  winnerId?: string | null;
  scheduledTime?: number;
  sport: string;
  tennisState?: {
    sets?: number[][];
    currentSetGames?: number[];
    isMatchComplete?: boolean;
  } | null;
};

type Props = {
  match: MatchItem;
  onPress: () => void;
};

export function MatchCard({ match, onPress }: Props) {
  const colors = useThemeColors();
  const status = statusStyles[match.status as MatchStatus] || statusStyles.pending;

  const isWinner1 = match.winnerId === match.participant1?._id;
  const isWinner2 = match.winnerId === match.participant2?._id;
  const showScore = match.status !== "pending" && match.status !== "bye";

  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: colors.border, backgroundColor: colors.bgCard }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={match.status === "bye"}>
      <View
        style={[
          styles.topAccent,
          {
            backgroundColor: colors.isDark ? colors.brand.dark : colors.brand.DEFAULT,
            opacity: 0.3,
          },
        ]}
      />

      {/* Match Header */}
      <View style={styles.header}>
        <Text style={[styles.headerText, { color: colors.textTertiary }]}>
          Round {match.round} • Match {match.matchNumber}
          {match.court ? ` • ${match.court}` : ""}
        </Text>
        <View
          style={[styles.statusBadge, { backgroundColor: status.bg, borderColor: status.border }]}>
          <Text style={[styles.statusText, { color: status.text }]}>{match.status}</Text>
        </View>
      </View>

      {/* Participants */}
      <View>
        <View style={styles.participantRow}>
          <Text
            style={[
              styles.participantName,
              isWinner1
                ? { fontWeight: "bold", color: colors.textPrimary }
                : { color: colors.textSecondary },
            ]}
            numberOfLines={1}>
            {match.participant1?.displayName || "TBD"}
          </Text>
          {showScore && (
            <Text
              style={[
                styles.score,
                isWinner1
                  ? { fontWeight: "bold", color: colors.textPrimary }
                  : { color: colors.textSecondary },
              ]}>
              {match.participant1Score}
            </Text>
          )}
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border, opacity: 0.6 }]} />
        <View style={styles.participantRow}>
          <Text
            style={[
              styles.participantName,
              isWinner2
                ? { fontWeight: "bold", color: colors.textPrimary }
                : { color: colors.textSecondary },
            ]}
            numberOfLines={1}>
            {match.participant2?.displayName || "TBD"}
          </Text>
          {showScore && (
            <Text
              style={[
                styles.score,
                isWinner2
                  ? { fontWeight: "bold", color: colors.textPrimary }
                  : { color: colors.textSecondary },
              ]}>
              {match.participant2Score}
            </Text>
          )}
        </View>
      </View>

      {/* Scheduled Time */}
      {match.scheduledTime && (
        <Text style={[styles.scheduledTime, { color: colors.textTertiary }]}>
          {formatTimeShort(match.scheduledTime)}
        </Text>
      )}

      {/* Live indicator */}
      {match.status === "live" && (
        <View style={[styles.liveIndicator, { backgroundColor: Colors.status.live.bg }]}>
          <View style={[styles.liveDot, { backgroundColor: Colors.status.live.border }]} />
          <Text style={[styles.liveText, { color: Colors.status.live.text }]}>
            {getScoreDisplayCompact(match)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    marginBottom: 12,
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  topAccent: {
    position: "absolute",
    left: 20,
    right: 20,
    top: 12,
    height: 1,
  },
  header: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerText: {
    fontSize: 12,
    fontWeight: "500",
  },
  statusBadge: {
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  participantName: {
    flex: 1,
    fontSize: 16,
  },
  score: {
    marginLeft: 8,
    fontSize: 18,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  scheduledTime: {
    marginTop: 8,
    fontSize: 12,
  },
  liveIndicator: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    padding: 8,
  },
  liveDot: {
    marginRight: 8,
    height: 8,
    width: 8,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
