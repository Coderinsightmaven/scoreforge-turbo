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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Id } from "@repo/convex/dataModel";

import { useTempScorer } from "../../contexts/TempScorerContext";
import { StatusFilter, MatchStatus } from "../../components/matches/StatusFilter";
import { OfflineBanner } from "../../components/OfflineBanner";
import { statusStyles } from "../../utils/styles";
import { formatTournamentName } from "../../utils/format";

export default function ScorerHomeScreen() {
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
      <View className="flex-1 items-center justify-center bg-bg-page dark:bg-bg-page-dark">
        <Text className="text-text-tertiary dark:text-text-tertiary-dark">Session not found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg-page dark:bg-bg-page-dark">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <OfflineBanner />
        {/* Header */}
        <View className="bg-bg-card px-5 py-4 shadow-sm shadow-black/5 dark:bg-bg-card-dark">
          <View className="flex-row items-center justify-between">
            <Image
              source={require("../../assets/logo.png")}
              className="mr-3 h-12 w-12"
              resizeMode="contain"
            />
            <View className="flex-1">
              <View className="mb-1 flex-row items-center">
                <View className="mr-2 rounded-lg border border-brand/30 bg-brand/10 px-2.5 py-1">
                  <Text className="text-xs font-bold text-brand">TEMP SCORER</Text>
                </View>
              </View>
              <Text className="font-display-bold text-lg text-text-primary dark:text-text-primary-dark">
                {session.displayName}
              </Text>
              {session.assignedCourt && (
                <Text className="text-xs font-semibold text-brand">{session.assignedCourt}</Text>
              )}
              <Text className="text-sm text-text-tertiary dark:text-text-tertiary-dark">
                {formatTournamentName(session.tournamentName)}
              </Text>
            </View>
            <TouchableOpacity
              className="rounded-xl border border-border bg-bg-card px-3 py-2 dark:border-border-dark dark:bg-bg-card-dark"
              onPress={handleSignOut}
              activeOpacity={0.7}>
              <Text className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                End Session
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Filter */}
        <View className="border-b border-border bg-bg-card px-5 py-2 dark:border-border-dark dark:bg-bg-card-dark">
          <StatusFilter value={statusFilter} onChange={setStatusFilter} />
        </View>

        {/* Tournament Status Banner */}
        {tournament && tournament.status !== "active" && (
          <View className="border-b border-brand/20 bg-brand-light px-4 py-2">
            <Text className="text-center text-sm text-brand-text">
              Tournament is {tournament.status} - Scoring may be unavailable
            </Text>
          </View>
        )}

        {/* Matches List */}
        {matches === undefined ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#70AC15" />
          </View>
        ) : (
          <FlatList
            data={matches.filter((m) => m.status !== "bye")}
            keyExtractor={(item) => item._id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#70AC15"]}
                tintColor="#70AC15"
              />
            }
            contentContainerClassName="px-4 py-4"
            ItemSeparatorComponent={() => <View className="h-3" />}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-16">
                <Text className="text-center text-text-tertiary dark:text-text-tertiary-dark">
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
                  className={`rounded-2xl bg-bg-card p-5 shadow-lg shadow-black/5 dark:bg-bg-card-dark ${
                    item.status === "live"
                      ? "border-2 border-status-live-border"
                      : "border border-border dark:border-border-dark"
                  }`}
                  onPress={() => router.push(`/(scorer)/match/${item._id}`)}
                  activeOpacity={0.7}>
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-xs font-medium text-text-tertiary dark:text-text-tertiary-dark">
                      R{item.round} - Match {item.matchNumber}
                    </Text>
                    <View
                      className={`rounded-lg border px-2.5 py-0.5 ${status.bg} ${status.border}`}>
                      <Text className={`text-xs font-semibold uppercase ${status.text}`}>
                        {item.status === "live" ? "LIVE" : item.status}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text
                        className={`text-base font-semibold ${
                          item.winnerId === item.participant1?._id
                            ? "text-brand"
                            : "text-text-primary dark:text-text-primary-dark"
                        }`}
                        numberOfLines={1}>
                        {item.participant1?.displayName || "TBD"}
                      </Text>
                    </View>
                    <Text className="mx-4 text-lg font-bold text-text-muted dark:text-text-muted-dark">
                      vs
                    </Text>
                    <View className="flex-1 items-end">
                      <Text
                        className={`text-base font-semibold ${
                          item.winnerId === item.participant2?._id
                            ? "text-brand"
                            : "text-text-primary dark:text-text-primary-dark"
                        }`}
                        numberOfLines={1}>
                        {item.participant2?.displayName || "TBD"}
                      </Text>
                    </View>
                  </View>

                  {item.court && (
                    <View className="mt-2 flex-row items-center">
                      <Text className="text-xs text-text-tertiary dark:text-text-tertiary-dark">
                        Court: {item.court}
                      </Text>
                    </View>
                  )}

                  {showTapToScore && (
                    <View className="mt-3 items-center">
                      <View className="rounded-lg border border-brand/30 bg-brand/10 px-4 py-1.5">
                        <Text className="text-xs font-medium text-brand">Tap to score</Text>
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
          <View className="border-t border-brand/20 bg-brand-light px-4 py-2">
            <Text className="text-center text-xs text-brand-text">
              Session expires in {Math.round((session.expiresAt - Date.now()) / (60 * 60 * 1000))}{" "}
              hours
            </Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
