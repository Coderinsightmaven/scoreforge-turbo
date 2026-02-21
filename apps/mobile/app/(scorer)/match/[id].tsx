import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Id } from "@repo/convex/dataModel";

import { useTempScorer } from "@/contexts/TempScorerContext";
import { statusStyles } from "@/utils/styles";
import { formatTime, getScoreDisplay } from "@/utils/format";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Colors, Fonts } from "@/constants/colors";

export default function ScorerMatchDetailScreen() {
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useTempScorer();
  const matchId = id as Id<"matches">;

  const match = useQuery(api.matches.getMatch, {
    matchId,
    tempScorerToken: session?.token,
  });
  const liveMatches = useQuery(
    api.matches.listMatches,
    match
      ? {
          tournamentId: match.tournamentId as Id<"tournaments">,
          status: "live",
          tempScorerToken: session?.token,
        }
      : "skip"
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
            <Text style={{ color: Colors.brand.DEFAULT }}>Go back</Text>
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

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: colors.bgPage }]}>
      {/* Header */}
      <View style={[styles.detailHeader, { backgroundColor: colors.bgCard }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.bgSecondary }]}>
          <Text style={{ fontSize: 20, color: colors.textPrimary }}>←</Text>
        </TouchableOpacity>
        <Image
          source={require("@/assets/images/scoreforge-mobile.png")}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={styles.flex1}>
          <Text
            style={{
              fontFamily: Fonts.displaySemibold,
              fontSize: 18,
              color: colors.textPrimary,
            }}>
            Match Details
          </Text>
          <Text style={{ fontSize: 14, color: colors.textTertiary }}>
            Round {match.round} • Match {match.matchNumber}
          </Text>
        </View>
        <View
          style={[
            styles.headerStatusBadge,
            { backgroundColor: status.bg, borderColor: status.border },
          ]}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              textTransform: "capitalize",
              color: status.text,
            }}>
            {match.status}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Score Card */}
        <View style={[styles.scoreCard, { backgroundColor: colors.bgCard }]}>
          <View style={styles.scoreCardHeader}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 1,
                color: colors.textTertiary,
              }}>
              Current Score
            </Text>
          </View>

          {/* Participant 1 */}
          <View style={styles.participantScoreRow}>
            <View style={styles.flex1}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: match.winnerId === match.participant1?._id ? "700" : "400",
                  color:
                    match.winnerId === match.participant1?._id
                      ? colors.textPrimary
                      : colors.textSecondary,
                }}>
                {match.participant1?.displayName || "TBD"}
              </Text>
              {match.participant1?.seed && (
                <Text style={{ fontSize: 14, color: colors.textTertiary }}>
                  Seed #{match.participant1.seed}
                </Text>
              )}
            </View>
            <Text
              style={{
                fontFamily: Fonts.displayBold,
                fontSize: 48,
                color:
                  match.winnerId === match.participant1?._id
                    ? Colors.brand.DEFAULT
                    : colors.textMuted,
              }}>
              {match.participant1Score}
            </Text>
          </View>

          <View style={[styles.scoreDivider, { backgroundColor: colors.border }]} />

          {/* Participant 2 */}
          <View style={[styles.participantScoreRow, { marginTop: 16 }]}>
            <View style={styles.flex1}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: match.winnerId === match.participant2?._id ? "700" : "400",
                  color:
                    match.winnerId === match.participant2?._id
                      ? colors.textPrimary
                      : colors.textSecondary,
                }}>
                {match.participant2?.displayName || "TBD"}
              </Text>
              {match.participant2?.seed && (
                <Text style={{ fontSize: 14, color: colors.textTertiary }}>
                  Seed #{match.participant2.seed}
                </Text>
              )}
            </View>
            <Text
              style={{
                fontFamily: Fonts.displayBold,
                fontSize: 48,
                color:
                  match.winnerId === match.participant2?._id
                    ? Colors.brand.DEFAULT
                    : colors.textMuted,
              }}>
              {match.participant2Score}
            </Text>
          </View>

          {/* Detailed Score */}
          {match.tennisState && (
            <View style={[styles.detailedScore, { backgroundColor: colors.bgSecondary }]}>
              <Text
                style={{
                  textAlign: "center",
                  fontSize: 14,
                  fontWeight: "500",
                  color: colors.textSecondary,
                }}>
                {getScoreDisplay(match)}
              </Text>
            </View>
          )}
        </View>

        {/* Match Info */}
        <View
          style={[
            styles.infoCard,
            {
              borderColor: colors.border,
              backgroundColor: colors.bgCard,
            },
          ]}>
          <Text
            style={{
              marginBottom: 12,
              fontFamily: Fonts.displaySemibold,
              fontSize: 14,
              textTransform: "uppercase",
              color: colors.textTertiary,
            }}>
            Match Info
          </Text>

          {match.court && (
            <View style={styles.infoRow}>
              <Text style={{ color: colors.textSecondary }}>Court</Text>
              <Text style={{ fontWeight: "500", color: colors.textPrimary }}>{match.court}</Text>
            </View>
          )}

          {match.scheduledTime && (
            <View style={styles.infoRow}>
              <Text style={{ color: colors.textSecondary }}>Scheduled</Text>
              <Text style={{ fontWeight: "500", color: colors.textPrimary }}>
                {formatTime(match.scheduledTime)}
              </Text>
            </View>
          )}

          {match.startedAt && (
            <View style={styles.infoRow}>
              <Text style={{ color: colors.textSecondary }}>Started</Text>
              <Text style={{ fontWeight: "500", color: colors.textPrimary }}>
                {formatTime(match.startedAt)}
              </Text>
            </View>
          )}

          {match.completedAt && (
            <View style={styles.infoRowLast}>
              <Text style={{ color: colors.textSecondary }}>Completed</Text>
              <Text style={{ fontWeight: "500", color: colors.textPrimary }}>
                {formatTime(match.completedAt)}
              </Text>
            </View>
          )}

          <View style={[styles.infoRowLast, { marginTop: 8 }]}>
            <Text style={{ color: colors.textSecondary }}>Your Role</Text>
            <Text
              style={{
                fontWeight: "500",
                textTransform: "capitalize",
                color: Colors.brand.DEFAULT,
              }}>
              {match.myRole}
            </Text>
          </View>
        </View>

        {/* Score Button */}
        {canScore && (
          <TouchableOpacity
            style={[
              styles.scoreButton,
              {
                backgroundColor: startDisabledDueToCourtConflict
                  ? "rgba(112,172,21,0.5)"
                  : Colors.brand.DEFAULT,
                shadowColor: startDisabledDueToCourtConflict
                  ? "rgba(112,172,21,0.1)"
                  : "rgba(112,172,21,0.3)",
              },
            ]}
            onPress={() => router.push(`/(scorer)/scoring/${matchId}`)}
            disabled={startDisabledDueToCourtConflict}
            activeOpacity={0.8}>
            <Text style={styles.scoreButtonText}>
              {match.status === "live" ? "Continue Scoring" : "Start Scoring"}
            </Text>
          </TouchableOpacity>
        )}
        {startDisabledDueToCourtConflict && (
          <View style={styles.courtConflictBanner}>
            <Text style={styles.courtConflictText}>{startDisabledReason}</Text>
          </View>
        )}

        {match.status === "completed" && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>Match Completed</Text>
          </View>
        )}

        {match.tournamentStatus !== "active" && (
          <View style={[styles.inactiveBanner, { backgroundColor: colors.bgSecondary }]}>
            <Text style={{ textAlign: "center", fontSize: 14, color: colors.textTertiary }}>
              Tournament is not active. Scoring is disabled.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  backButton: {
    marginRight: 12,
    height: 40,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  headerLogo: {
    marginRight: 12,
    height: 36,
    width: 36,
  },
  headerStatusBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scoreCard: {
    marginBottom: 16,
    borderRadius: 16,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  scoreCardHeader: {
    marginBottom: 16,
    alignItems: "center",
  },
  participantScoreRow: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scoreDivider: {
    marginVertical: 12,
    height: 2,
    opacity: 0.6,
  },
  detailedScore: {
    marginTop: 16,
    borderRadius: 12,
    padding: 12,
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
    elevation: 3,
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
  scoreButton: {
    borderRadius: 16,
    paddingVertical: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
  },
  scoreButtonText: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  courtConflictBanner: {
    marginTop: 12,
    borderRadius: 16,
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
  completedBanner: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(39,165,94,0.3)",
    backgroundColor: Colors.status.active.bg,
    paddingVertical: 20,
  },
  completedText: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    color: Colors.status.active.text,
  },
  inactiveBanner: {
    borderRadius: 16,
    paddingVertical: 20,
  },
});
