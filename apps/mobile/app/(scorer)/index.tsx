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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Id } from "@repo/convex/dataModel";

import { useTempScorer } from "../../contexts/TempScorerContext";
import { StatusFilter, MatchStatus } from "../../components/matches/StatusFilter";
import { OfflineBanner } from "../../components/OfflineBanner";
import { statusStyles } from "../../utils/styles";

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

  const tournament = useQuery(api.tournaments.getTournament, {
    tournamentId: session?.tournamentId as Id<"tournaments">,
    tempScorerToken: session?.token,
  });

  const matches = useQuery(api.matches.listMatches, {
    tournamentId: session?.tournamentId as Id<"tournaments">,
    status: statusFilter === "all" ? undefined : statusFilter,
    tempScorerToken: session?.token,
  });

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
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Text className="text-text-tertiary dark:text-slate-400">Session not found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-slate-900">
      <SafeAreaView className="flex-1" edges={["top"]}>
        <OfflineBanner />
        {/* Header */}
        <View className="bg-white px-5 py-4 shadow-sm shadow-slate-900/5 dark:bg-slate-900">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="mb-1 flex-row items-center">
                <View className="mr-2 rounded-lg border border-brand/30 bg-brand/10 px-2.5 py-1">
                  <Text className="text-xs font-bold text-brand">TEMP SCORER</Text>
                </View>
              </View>
              <Text className="font-display-bold text-lg text-slate-900 dark:text-slate-100">
                {session.displayName}
              </Text>
              <Text className="text-sm text-text-tertiary dark:text-slate-400">
                {session.tournamentName}
              </Text>
            </View>
            <TouchableOpacity
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              onPress={handleSignOut}
              activeOpacity={0.7}>
              <Text className="text-sm font-medium text-slate-900 dark:text-slate-100">
                End Session
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Filter */}
        <View className="border-b border-slate-100 bg-white px-5 py-2 dark:border-slate-800 dark:bg-slate-900">
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
            <ActivityIndicator size="large" color="#D4A017" />
          </View>
        ) : (
          <FlatList
            data={matches.filter((m) => m.status !== "bye")}
            keyExtractor={(item) => item._id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#D4A017"]}
                tintColor="#D4A017"
              />
            }
            contentContainerClassName="px-4 py-4"
            ItemSeparatorComponent={() => <View className="h-3" />}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-16">
                <Text className="text-center text-text-tertiary dark:text-slate-400">
                  No matches found for this filter
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isReady = item.participant1 && item.participant2 && item.status !== "completed";
              const status = statusStyles[item.status as MatchStatus] || statusStyles.pending;
              return (
                <TouchableOpacity
                  className={`rounded-2xl bg-white p-5 shadow-lg shadow-slate-900/5 dark:bg-slate-900 ${
                    item.status === "live"
                      ? "border-2 border-status-live-border"
                      : "border border-slate-100 dark:border-slate-800"
                  }`}
                  onPress={() => router.push(`/(scorer)/match/${item._id}`)}
                  activeOpacity={0.7}>
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-xs font-medium text-text-tertiary dark:text-slate-400">
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
                            : "text-slate-900 dark:text-slate-100"
                        }`}
                        numberOfLines={1}>
                        {item.participant1?.displayName || "TBD"}
                      </Text>
                    </View>
                    <Text className="mx-4 text-lg font-bold text-slate-300">vs</Text>
                    <View className="flex-1 items-end">
                      <Text
                        className={`text-base font-semibold ${
                          item.winnerId === item.participant2?._id
                            ? "text-brand"
                            : "text-slate-900 dark:text-slate-100"
                        }`}
                        numberOfLines={1}>
                        {item.participant2?.displayName || "TBD"}
                      </Text>
                    </View>
                  </View>

                  {item.court && (
                    <View className="mt-2 flex-row items-center">
                      <Text className="text-xs text-text-tertiary dark:text-slate-400">
                        Court: {item.court}
                      </Text>
                    </View>
                  )}

                  {isReady && item.status !== "live" && (
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
