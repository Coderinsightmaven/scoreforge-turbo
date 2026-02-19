import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Id } from "@repo/convex/dataModel";

import { statusStyles } from "@/utils/styles";
import { formatTime, getScoreDisplay } from "@/utils/format";
import { AppHeader } from "@/components/navigation/AppHeader";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Colors, Fonts } from "@/constants/colors";

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const matchId = id as Id<"matches">;
  const colors = useThemeColors();

  const match = useQuery(api.matches.getMatch, { matchId });
  const liveMatches = useQuery(
    api.matches.listMatches,
    match
      ? {
          tournamentId: match.tournamentId as Id<"tournaments">,
          status: "live",
        }
      : "skip"
  );

  const brandColor = colors.isDark ? colors.brand.dark : colors.brand.DEFAULT;

  if (match === undefined) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.bgPage }]}>
        <ActivityIndicator size="large" color="#70AC15" />
      </View>
    );
  }

  if (match === null) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.bgPage }]}>
        <View style={styles.centeredMessage}>
          <Text
            style={[
              styles.notFoundTitle,
              { color: colors.textPrimary, fontFamily: Fonts.displaySemibold },
            ]}>
            Match not found
          </Text>
          <TouchableOpacity style={styles.goBackButton} onPress={() => router.back()}>
            <Text style={{ color: brandColor }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const canScore =
    match.tournamentStatus === "active" &&
    (match.status === "pending" || match.status === "scheduled" || match.status === "live");
  const shouldCheckCourt =
    (match.status === "pending" || match.status === "scheduled") && !!match.court;
  const isCourtAvailabilityLoading = shouldCheckCourt && liveMatches === undefined;
  const hasCourtConflict =
    shouldCheckCourt &&
    (liveMatches ?? []).some(
      (liveMatch) => liveMatch._id !== match._id && liveMatch.court === match.court
    );
  const startDisabledReason = isCourtAvailabilityLoading
    ? "Checking court availability..."
    : hasCourtConflict
      ? `Court ${match.court} already has a live match. Finish it before starting this one.`
      : undefined;
  const startDisabledDueToCourtConflict = !!startDisabledReason && match.status !== "live";

  const status = statusStyles[match.status] || statusStyles.pending;

  const isWinner1 = match.winnerId === match.participant1?._id;
  const isWinner2 = match.winnerId === match.participant2?._id;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bgPage }]}>
      <AppHeader
        title="Match Details"
        subtitle={`Round ${match.round} • Match ${match.matchNumber}`}
        showBack
      />

      <ScrollView style={styles.flex1} contentContainerStyle={styles.scrollContent}>
        {/* Status Row */}
        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: colors.textMuted }]}>Status</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: status.bg, borderColor: status.border },
            ]}>
            <Text style={[styles.statusBadgeText, { color: status.text }]}>{match.status}</Text>
          </View>
        </View>

        {/* Score Card */}
        <View
          style={[
            styles.scoreCard,
            { borderColor: colors.border, backgroundColor: colors.bgCard },
          ]}>
          <View style={[styles.scoreCardAccent, { backgroundColor: `${brandColor}4D` }]} />
          <View style={styles.scoreHeader}>
            <Text style={[styles.scoreHeaderText, { color: colors.textTertiary }]}>
              Current Score
            </Text>
          </View>

          <View style={styles.participantsContainer}>
            {/* Participant 1 */}
            <View
              style={[
                styles.participantRow,
                isWinner1
                  ? {
                      borderColor: "rgba(112,172,21,0.3)",
                      backgroundColor: "rgba(112,172,21,0.1)",
                    }
                  : {
                      borderColor: colors.border,
                      backgroundColor: colors.bgSecondary,
                    },
              ]}>
              <View style={styles.participantInfo}>
                <Text
                  style={[
                    styles.participantName,
                    isWinner1
                      ? { fontWeight: "bold", color: colors.textPrimary }
                      : { color: colors.textSecondary },
                  ]}>
                  {match.participant1?.displayName || "TBD"}
                </Text>
                {match.participant1?.seed && (
                  <Text style={[styles.seedText, { color: colors.textTertiary }]}>
                    Seed #{match.participant1.seed}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.scoreText,
                  { fontFamily: Fonts.displayBold },
                  { color: isWinner1 ? brandColor : colors.textMuted },
                ]}>
                {match.participant1Score}
              </Text>
            </View>

            {/* Participant 2 */}
            <View
              style={[
                styles.participantRow,
                isWinner2
                  ? {
                      borderColor: "rgba(112,172,21,0.3)",
                      backgroundColor: "rgba(112,172,21,0.1)",
                    }
                  : {
                      borderColor: colors.border,
                      backgroundColor: colors.bgSecondary,
                    },
              ]}>
              <View style={styles.participantInfo}>
                <Text
                  style={[
                    styles.participantName,
                    isWinner2
                      ? { fontWeight: "bold", color: colors.textPrimary }
                      : { color: colors.textSecondary },
                  ]}>
                  {match.participant2?.displayName || "TBD"}
                </Text>
                {match.participant2?.seed && (
                  <Text style={[styles.seedText, { color: colors.textTertiary }]}>
                    Seed #{match.participant2.seed}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.scoreText,
                  { fontFamily: Fonts.displayBold },
                  { color: isWinner2 ? brandColor : colors.textMuted },
                ]}>
                {match.participant2Score}
              </Text>
            </View>
          </View>

          {/* Detailed Score */}
          {match.tennisState && (
            <View style={[styles.detailedScore, { backgroundColor: colors.bgSecondary }]}>
              <Text style={[styles.detailedScoreText, { color: colors.textSecondary }]}>
                {getScoreDisplay(match)}
              </Text>
            </View>
          )}
        </View>

        {/* Match Info */}
        <View
          style={[styles.infoCard, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
          <Text
            style={[
              styles.infoTitle,
              { color: colors.textTertiary, fontFamily: Fonts.displaySemibold },
            ]}>
            Match Info
          </Text>

          {match.court && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Court</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{match.court}</Text>
            </View>
          )}

          {match.scheduledTime && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Scheduled</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {formatTime(match.scheduledTime)}
              </Text>
            </View>
          )}

          {match.startedAt && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Started</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {formatTime(match.startedAt)}
              </Text>
            </View>
          )}

          {match.completedAt && (
            <View style={styles.infoRowLast}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Completed</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {formatTime(match.completedAt)}
              </Text>
            </View>
          )}

          <View style={styles.infoRowRole}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Your Role</Text>
            <Text style={[styles.roleValue, { color: brandColor }]}>{match.myRole}</Text>
          </View>
        </View>

        {/* Score Button */}
        {canScore && (
          <TouchableOpacity
            style={[
              styles.scoreButton,
              {
                backgroundColor: startDisabledDueToCourtConflict ? `${brandColor}80` : brandColor,
              },
              !startDisabledDueToCourtConflict && {
                shadowColor: brandColor,
                shadowOpacity: 0.3,
              },
            ]}
            onPress={() => router.push(`/(app)/scoring/${matchId}`)}
            disabled={startDisabledDueToCourtConflict}
            activeOpacity={0.8}>
            <Text style={styles.scoreButtonText}>
              {match.status === "live" ? "Continue Scoring" : "Start Scoring"}
            </Text>
          </TouchableOpacity>
        )}
        {startDisabledDueToCourtConflict && (
          <View
            style={[
              styles.courtConflictBox,
              { borderColor: `${brandColor}4D`, backgroundColor: Colors.brand.light },
            ]}>
            <Text style={[styles.courtConflictText, { color: Colors.brand.text }]}>
              {startDisabledReason}
            </Text>
          </View>
        )}

        {match.status === "completed" && (
          <View
            style={[
              styles.completedBox,
              {
                borderColor: "rgba(39,165,94,0.3)",
                backgroundColor: Colors.status.active.bg,
              },
            ]}>
            <Text style={[styles.completedText, { color: Colors.status.active.text }]}>
              Match Completed
            </Text>
          </View>
        )}

        {match.tournamentStatus !== "active" && (
          <View style={[styles.inactiveBox, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.inactiveText, { color: colors.textTertiary }]}>
              Tournament is not active. Scoring is disabled.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centeredMessage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  notFoundTitle: {
    fontSize: 18,
  },
  goBackButton: {
    marginTop: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statusRow: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.16 * 12,
  },
  statusBadge: {
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.16 * 11,
  },
  scoreCard: {
    position: "relative",
    marginBottom: 16,
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 10,
  },
  scoreCardAccent: {
    position: "absolute",
    left: 24,
    right: 24,
    top: 12,
    height: 1,
  },
  scoreHeader: {
    marginBottom: 16,
    alignItems: "center",
  },
  scoreHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.2 * 12,
  },
  participantsContainer: {
    gap: 12,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 20,
  },
  seedText: {
    fontSize: 14,
  },
  scoreText: {
    fontSize: 48,
  },
  detailedScore: {
    marginTop: 16,
    borderRadius: 12,
    padding: 12,
  },
  detailedScoreText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "500",
  },
  infoCard: {
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoTitle: {
    marginBottom: 12,
    fontSize: 14,
    textTransform: "uppercase",
  },
  infoRow: {
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoRowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoRowRole: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  roleValue: {
    fontSize: 14,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  scoreButton: {
    borderRadius: 16,
    paddingVertical: 20,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 25,
    elevation: 10,
  },
  scoreButtonText: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  courtConflictBox: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  courtConflictText: {
    textAlign: "center",
    fontSize: 14,
  },
  completedBox: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 20,
  },
  completedText: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },
  inactiveBox: {
    borderRadius: 16,
    paddingVertical: 20,
  },
  inactiveText: {
    textAlign: "center",
    fontSize: 14,
  },
});
