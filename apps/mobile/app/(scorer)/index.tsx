import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Id } from "@repo/convex/dataModel";

import { useTempScorer } from "@/contexts/TempScorerContext";
import { StatusFilter, MatchStatus } from "@/components/matches/StatusFilter";
import { OfflineBanner } from "@/components/OfflineBanner";
import { statusStyles } from "@/utils/styles";
import { formatTournamentName } from "@/utils/format";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { Colors, Fonts } from "@/constants/colors";

export default function ScorerHomeScreen() {
  const colors = useThemeColors();
  const { session, signOut } = useTempScorer();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<MatchStatus | "all">("all");
  const [refreshing, setRefreshing] = useState(false);

  const sessionValid = useQuery(
    api.temporaryScorers.verifySession,
    session?.token ? { token: session.token } : "skip"
  );

  useEffect(() => {
    if (session && sessionValid === null) {
      Alert.alert(
        "Session Ended",
        "Your scoring session has ended. This may be because the tournament has completed or your access was revoked.",
        [{ text: "OK", onPress: signOut }]
      );
    }
  }, [session, sessionValid, signOut]);

  const tournament = useQuery(
    api.tournaments.getTournament,
    session?.tournamentId
      ? {
          tournamentId: session.tournamentId as Id<"tournaments">,
          tempScorerToken: session.token,
        }
      : "skip"
  );

  const allMatches = useQuery(
    api.matches.listMatches,
    session?.tournamentId
      ? {
          tournamentId: session.tournamentId as Id<"tournaments">,
          status: statusFilter === "all" ? undefined : statusFilter,
          tempScorerToken: session.token,
        }
      : "skip"
  );
  const liveMatches = useQuery(
    api.matches.listMatches,
    session?.tournamentId
      ? {
          tournamentId: session.tournamentId as Id<"tournaments">,
          status: "live",
          tempScorerToken: session.token,
        }
      : "skip"
  );

  // Filter to only show matches on this scorer's assigned court
  const matches = session?.assignedCourt
    ? allMatches?.filter((m) => m.court === session.assignedCourt)
    : allMatches;

  // Convex provides real-time updates; brief visual confirmation only
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 300);
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: signOut,
      },
    ]);
  };

  if (!session) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgPage }]}>
        <Text style={{ color: colors.textTertiary }}>Session not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.flex1, { backgroundColor: colors.bgPage }]}>
      <SafeAreaView style={styles.flex1} edges={["top"]}>
        <OfflineBanner />
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.bgCard }]}>
          <View style={styles.headerRow}>
            <Image
              source={require("@/assets/images/scoreforge-mobile.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.flex1}>
              <View style={styles.badgeRow}>
                <View style={styles.tempScorerBadge}>
                  <Text style={styles.tempScorerText}>TEMP SCORER</Text>
                </View>
              </View>
              <Text
                style={{
                  fontFamily: Fonts.displayBold,
                  fontSize: 18,
                  color: colors.textPrimary,
                }}>
                {session.displayName}
              </Text>
              {session.assignedCourt && (
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: Colors.brand.DEFAULT,
                  }}>
                  {session.assignedCourt}
                </Text>
              )}
              <Text style={{ fontSize: 14, color: colors.textTertiary }}>
                {formatTournamentName(session.tournamentName)}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.endSessionButton,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.bgCard,
                },
              ]}
              onPress={handleSignOut}
              activeOpacity={0.7}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: colors.textPrimary,
                }}>
                End Session
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Filter */}
        <View
          style={[
            styles.filterBar,
            {
              borderBottomColor: colors.border,
              backgroundColor: colors.bgCard,
            },
          ]}>
          <StatusFilter value={statusFilter} onChange={setStatusFilter} />
        </View>

        {/* Tournament Status Banner */}
        {tournament && tournament.status !== "active" && (
          <View style={styles.tournamentBanner}>
            <Text style={styles.tournamentBannerText}>
              Tournament is {tournament.status} - Scoring may be unavailable
            </Text>
          </View>
        )}

        {/* Matches List */}
        {matches === undefined ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.brand.DEFAULT} />
          </View>
        ) : (
          <FlatList
            data={matches.filter((m) => m.status !== "bye")}
            keyExtractor={(item) => item._id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.brand.DEFAULT]}
                tintColor={Colors.brand.DEFAULT}
              />
            }
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={{ textAlign: "center", color: colors.textTertiary }}>
                  No matches found for this filter
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isReady = item.participant1 && item.participant2 && item.status !== "completed";
              const hasOtherLiveMatchOnSameCourt =
                !!item.court &&
                (liveMatches ?? []).some(
                  (liveMatch) => liveMatch._id !== item._id && liveMatch.court === item.court
                );
              const showTapToScore =
                isReady &&
                item.status !== "live" &&
                liveMatches !== undefined &&
                !hasOtherLiveMatchOnSameCourt;
              const status = statusStyles[item.status as MatchStatus] || statusStyles.pending;
              return (
                <TouchableOpacity
                  style={[
                    styles.matchCard,
                    { backgroundColor: colors.bgCard },
                    item.status === "live"
                      ? { borderWidth: 2, borderColor: Colors.status.live.border }
                      : { borderWidth: 1, borderColor: colors.border },
                  ]}
                  onPress={() => router.push(`/(scorer)/match/${item._id}`)}
                  activeOpacity={0.7}>
                  <View style={styles.matchCardHeader}>
                    <Text style={{ fontSize: 12, fontWeight: "500", color: colors.textTertiary }}>
                      R{item.round} - Match {item.matchNumber}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: status.bg,
                          borderColor: status.border,
                        },
                      ]}>
                      <Text style={[styles.statusText, { color: status.text }]}>
                        {item.status === "live" ? "LIVE" : item.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.participantsRow}>
                    <View style={styles.flex1}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color:
                            item.winnerId === item.participant1?._id
                              ? Colors.brand.DEFAULT
                              : colors.textPrimary,
                        }}
                        numberOfLines={1}>
                        {item.participant1?.displayName || "TBD"}
                      </Text>
                    </View>
                    <Text
                      style={{
                        marginHorizontal: 16,
                        fontSize: 18,
                        fontWeight: "700",
                        color: colors.textMuted,
                      }}>
                      vs
                    </Text>
                    <View style={[styles.flex1, { alignItems: "flex-end" }]}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color:
                            item.winnerId === item.participant2?._id
                              ? Colors.brand.DEFAULT
                              : colors.textPrimary,
                        }}
                        numberOfLines={1}>
                        {item.participant2?.displayName || "TBD"}
                      </Text>
                    </View>
                  </View>

                  {item.court && (
                    <View style={styles.courtRow}>
                      <Text style={{ fontSize: 12, color: colors.textTertiary }}>
                        Court: {item.court}
                      </Text>
                    </View>
                  )}

                  {showTapToScore && (
                    <View style={styles.tapToScoreContainer}>
                      <View style={styles.tapToScoreBadge}>
                        <Text style={styles.tapToScoreText}>Tap to score</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* Session Expiry Warning */}
        {session.expiresAt && session.expiresAt - Date.now() < 2 * 60 * 60 * 1000 && (
          <View style={styles.expiryBanner}>
            <Text style={styles.expiryText}>
              Session expires in {Math.round((session.expiresAt - Date.now()) / (60 * 60 * 1000))}{" "}
              hours
            </Text>
          </View>
        )}
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    marginRight: 12,
    height: 48,
    width: 48,
  },
  badgeRow: {
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  tempScorerBadge: {
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(112,172,21,0.3)",
    backgroundColor: "rgba(112,172,21,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tempScorerText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.brand.DEFAULT,
  },
  endSessionButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterBar: {
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  tournamentBanner: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(112,172,21,0.2)",
    backgroundColor: Colors.brand.light,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tournamentBannerText: {
    textAlign: "center",
    fontSize: 14,
    color: Colors.brand.text,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  matchCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  matchCardHeader: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  participantsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  courtRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  tapToScoreContainer: {
    marginTop: 12,
    alignItems: "center",
  },
  tapToScoreBadge: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(112,172,21,0.3)",
    backgroundColor: "rgba(112,172,21,0.1)",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  tapToScoreText: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.brand.DEFAULT,
  },
  expiryBanner: {
    borderTopWidth: 1,
    borderTopColor: "rgba(112,172,21,0.2)",
    backgroundColor: Colors.brand.light,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  expiryText: {
    textAlign: "center",
    fontSize: 12,
    color: Colors.brand.text,
  },
});
